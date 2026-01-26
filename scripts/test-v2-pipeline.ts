#!/usr/bin/env tsx
/**
 * V2 Pipeline Testing Script
 * Tests the enhanced multi-agent pipeline with various scenarios
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestScenario {
  id: string;
  name: string;
  input: string;
  expectations: {
    category?: string;
    entityCount?: number;
    layoutType?: string;
    hasEnums?: boolean;
    referenceApp?: string;
  };
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    id: 'simple-crud',
    name: 'Simple CRUD App (Baseline)',
    input: 'Build a simple note-taking app with title and content',
    expectations: {
      category: 'tracker',
      entityCount: 1,
      layoutType: 'simple',
    },
  },
  {
    id: 'enum-heavy',
    name: 'Enum-Heavy App',
    input: 'Build a task manager with status (Todo, In Progress, Done) and priority (High, Medium, Low)',
    expectations: {
      category: 'tracker',
      entityCount: 1,
      hasEnums: true,
    },
  },
  {
    id: 'reference-app',
    name: 'Reference App Detection',
    input: 'Build something like Trello for project management',
    expectations: {
      referenceApp: 'Trello',
      layoutType: 'kanban',
    },
  },
  {
    id: 'multi-view',
    name: 'Multi-View App',
    input: 'Build an expense tracker with a table view and a chart showing spending by category',
    expectations: {
      entityCount: 1,
      layoutType: 'dashboard',
    },
  },
];

interface TestResult {
  scenarioId: string;
  scenarioName: string;
  passed: boolean;
  issues: string[];
  timings: {
    total: number;
    intentEngine?: number;
    schemaDesigner?: number;
    uiDesigner?: number;
    workflowAgent?: number;
    codeGenerator?: number;
  };
  outputs: {
    intent?: any;
    schema?: any;
    layout?: any;
    workflows?: any;
    componentNames?: string[];
  };
}

async function runTest(scenario: TestScenario): Promise<TestResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running Test: ${scenario.name}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Input: "${scenario.input}"`);
  
  const result: TestResult = {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    passed: true,
    issues: [],
    timings: { total: 0 },
    outputs: {},
  };
  
  const startTime = Date.now();
  
  try {
    // Create a test user if needed
    const testUser = await prisma.user.upsert({
      where: { email: 'test@v2pipeline.local' },
      update: {},
      create: {
        email: 'test@v2pipeline.local',
        name: 'V2 Pipeline Test User',
      },
    });
    
    // Call the freeform API
    const response = await fetch('http://localhost:1000/api/scaffolder/freeform', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add auth header or session cookie if needed
      },
      body: JSON.stringify({
        action: 'stream',
        message: scenario.input,
      }),
    });
    
    if (!response.ok) {
      result.passed = false;
      result.issues.push(`API request failed: ${response.status} ${response.statusText}`);
      return result;
    }
    
    // Parse SSE stream
    const reader = response.body?.getReader();
    if (!reader) {
      result.passed = false;
      result.issues.push('No response body');
      return result;
    }
    
    const decoder = new TextDecoder();
    let buffer = '';
    let conversationId: string | null = null;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        
        try {
          const data = JSON.parse(line.slice(6));
          
          // Track events and timings
          if (data.type === 'intent_result') {
            result.outputs.intent = data.intent;
          } else if (data.type === 'agent_complete') {
            if (data.agent === 'schema-designer') {
              result.outputs.schema = data.result;
              result.timings.schemaDesigner = data.durationMs;
            } else if (data.agent === 'ui-designer') {
              result.outputs.layout = data.result;
              result.timings.uiDesigner = data.durationMs;
            } else if (data.agent === 'workflow-agent') {
              result.outputs.workflows = data.result;
              result.timings.workflowAgent = data.durationMs;
            }
          } else if (data.type === 'done') {
            conversationId = data.conversationId;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    
    result.timings.total = Date.now() - startTime;
    
    // Now build the app
    if (conversationId) {
      console.log(`\n📦 Building app for conversation ${conversationId}...`);
      
      const buildResponse = await fetch('http://localhost:1000/api/scaffolder/freeform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'build',
          conversationId,
        }),
      });
      
      if (!buildResponse.ok) {
        result.passed = false;
        result.issues.push(`Build failed: ${buildResponse.status}`);
        return result;
      }
      
      const buildData = await buildResponse.json();
      
      if (buildData.app && buildData.generatedCode) {
        // Check component naming
        const componentCode = buildData.generatedCode.pageComponent || '';
        result.outputs.componentNames = extractComponentNames(componentCode);
        
        // Validate PascalCase
        for (const name of result.outputs.componentNames) {
          if (!isPascalCase(name)) {
            result.passed = false;
            result.issues.push(`Component name "${name}" is not PascalCase`);
          }
        }
        
        // Check for React warnings
        if (componentCode.includes('function ' + result.outputs.componentNames[0]?.toLowerCase())) {
          result.passed = false;
          result.issues.push('Generated code contains lowercase component definition');
        }
        
        console.log(`\n✅ App built successfully: ${buildData.app.id}`);
        console.log(`   Components: ${result.outputs.componentNames.join(', ')}`);
      }
    } else {
      result.passed = false;
      result.issues.push('No conversation ID returned');
    }
    
  } catch (error) {
    result.passed = false;
    result.issues.push(`Test error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return result;
}

function extractComponentNames(code: string): string[] {
  const names: string[] = [];
  
  // Extract function components: export function ComponentName
  const functionMatches = code.matchAll(/export function (\w+)/g);
  for (const match of functionMatches) {
    names.push(match[1]);
  }
  
  // Extract const components: export const ComponentName
  const constMatches = code.matchAll(/export const (\w+)/g);
  for (const match of constMatches) {
    names.push(match[1]);
  }
  
  return names;
}

function isPascalCase(name: string): boolean {
  if (!name || name.length === 0) return false;
  if (name[0] !== name[0].toUpperCase()) return false;
  if (name.includes('_')) return false;
  if (name.includes('-')) return false;
  return true;
}

async function main() {
  console.log('🧪 V2 Pipeline Testing Suite');
  console.log('============================\n');
  
  const results: TestResult[] = [];
  
  for (const scenario of TEST_SCENARIOS) {
    const result = await runTest(scenario);
    results.push(result);
    
    // Print result
    console.log(`\n${result.passed ? '✅ PASSED' : '❌ FAILED'}: ${result.scenarioName}`);
    console.log(`   Time: ${result.timings.total}ms`);
    if (result.issues.length > 0) {
      console.log(`   Issues:`);
      result.issues.forEach(issue => console.log(`     - ${issue}`));
    }
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('Test Summary');
  console.log(`${'='.repeat(60)}`);
  
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Success Rate: ${((passedCount / results.length) * 100).toFixed(1)}%`);
  
  // Detailed results
  console.log(`\n${'='.repeat(60)}`);
  console.log('Detailed Results');
  console.log(`${'='.repeat(60)}`);
  
  for (const result of results) {
    console.log(`\n${result.scenarioName}:`);
    console.log(`  Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Total Time: ${result.timings.total}ms`);
    
    if (result.outputs.intent) {
      console.log(`  Intent:`);
      console.log(`    - Category: ${result.outputs.intent.appCategory}`);
      console.log(`    - Entities: ${result.outputs.intent.entities?.length || 0}`);
      console.log(`    - Complexity: ${result.outputs.intent.complexityScore}/10`);
    }
    
    if (result.outputs.schema) {
      console.log(`  Schema:`);
      console.log(`    - Name: ${result.outputs.schema.schemaName || 'N/A'}`);
      console.log(`    - Fields: ${result.outputs.schema.fieldCount || 0}`);
    }
    
    if (result.outputs.componentNames) {
      console.log(`  Components: ${result.outputs.componentNames.join(', ')}`);
    }
    
    if (result.issues.length > 0) {
      console.log(`  Issues:`);
      result.issues.forEach(issue => console.log(`    - ${issue}`));
    }
  }
  
  // Exit with error if any tests failed
  process.exit(failedCount > 0 ? 1 : 0);
}

main()
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
