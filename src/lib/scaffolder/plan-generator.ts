/**
 * Plan Generator Module
 * Generates implementation plans for apps using the LLM
 */

import { complete } from '@/lib/qwen';
import { emitStatus } from '@/app/api/scaffolder/status/[conversationId]/route';
import type { ProjectSpec, ImplementationPlan, ComponentPlan } from './types';

// Re-export types for convenience
export type { ImplementationPlan, ComponentPlan };

/**
 * Build a prompt for the LLM to generate an implementation plan
 */
function buildPlanPrompt(spec: ProjectSpec): string {
  const fieldsDescription = spec.dataStore.fields
    .map(f => `- ${f.label} (${f.type}${f.required ? ', required' : ''})`)
    .join('\n');

  const viewsDescription = spec.views
    .map(v => `- ${v.title} (${v.type})`)
    .join('\n');

  return `You are building a web application called "${spec.name}".

Description: ${spec.description}
Category: ${spec.category}

DATA FIELDS:
${fieldsDescription}

VIEWS:
${viewsDescription}

Based on this specification, generate an implementation plan as a JSON object with the following structure:
{
  "overview": "A 2-3 sentence overview of what this app does and its main value proposition",
  "architecture": {
    "primitives": ["List of primitive components used: FormPrimitive, TablePrimitive, ChartPrimitive"],
    "dataFlow": "Description of how data flows: user input → form → storage → views"
  },
  "components": {
    "form": {
      "name": "EntryForm",
      "type": "FormPrimitive",
      "description": "What the form does",
      "props": { "key": "value" }
    },
    "views": [
      {
        "name": "ViewName",
        "type": "TablePrimitive or ChartPrimitive",
        "description": "What this view shows",
        "props": { "key": "value" }
      }
    ]
  },
  "steps": [
    "Step 1: ...",
    "Step 2: ...",
    "Step 3: ..."
  ],
  "estimatedComplexity": "simple" | "moderate" | "complex"
}

Respond with valid JSON only. No markdown, no explanations.`;
}

/**
 * Parse the LLM response into an ImplementationPlan
 * Includes robust fallback handling
 */
function parsePlanResponse(content: string, spec: ProjectSpec): ImplementationPlan {
  try {
    // Try to extract JSON from potential markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    const jsonStr = jsonMatch[1]?.trim() || content.trim();
    
    const parsed = JSON.parse(jsonStr);
    
    // Validate required fields
    if (!parsed.overview || !parsed.architecture || !parsed.components || !parsed.steps) {
      throw new Error('Missing required fields in plan');
    }
    
    return parsed as ImplementationPlan;
  } catch (error) {
    console.error('❌ Failed to parse plan response, using fallback:', error);
    
    // Return a sensible fallback plan based on the spec
    return createFallbackPlan(spec);
  }
}

/**
 * Create a fallback plan when LLM parsing fails
 */
function createFallbackPlan(spec: ProjectSpec): ImplementationPlan {
  const hasChart = spec.views.some(v => v.type === 'chart');
  const hasCards = spec.views.some(v => v.type === 'cards');
  
  const primitives = ['FormPrimitive', 'TablePrimitive'];
  if (hasChart) primitives.push('ChartPrimitive');
  
  const viewComponents: ComponentPlan[] = [];
  
  // Add table view
  viewComponents.push({
    name: 'DataTable',
    type: 'TablePrimitive',
    description: `Displays all ${spec.dataStore.label || 'entries'} in a sortable, filterable table`,
    props: {
      columns: spec.dataStore.fields.map(f => f.name).join(', '),
      sortable: 'true',
    },
  });
  
  // Add chart view if present
  if (hasChart) {
    const chartView = spec.views.find(v => v.type === 'chart');
    viewComponents.push({
      name: 'DataChart',
      type: 'ChartPrimitive',
      description: chartView?.title || 'Visualizes data trends and patterns',
      props: {
        chartType: 'bar',
        animated: 'true',
      },
    });
  }
  
  // Determine complexity
  let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
  if (spec.dataStore.fields.length > 5 || spec.views.length > 2) {
    complexity = 'moderate';
  }
  if (spec.dataStore.fields.length > 8 || spec.views.length > 3) {
    complexity = 'complex';
  }
  
  return {
    overview: `${spec.name} is a ${spec.category} tracking application that helps you manage and visualize your ${spec.category} data. It provides an intuitive form for data entry and multiple views for analysis.`,
    architecture: {
      primitives,
      dataFlow: 'User enters data through the form → Data is validated and stored → Views automatically update to reflect changes → Users can filter, sort, and analyze their data',
    },
    components: {
      form: {
        name: 'EntryForm',
        type: 'FormPrimitive',
        description: `A dynamic form with ${spec.dataStore.fields.length} fields for adding new ${spec.category} entries`,
        props: {
          fields: spec.dataStore.fields.map(f => f.name).join(', '),
          validation: 'enabled',
        },
      },
      views: viewComponents,
    },
    steps: [
      'Initialize data storage with the defined schema',
      `Render FormPrimitive with ${spec.dataStore.fields.length} configured fields`,
      'Set up TablePrimitive with sortable columns and filtering',
      hasChart ? 'Configure ChartPrimitive for data visualization' : 'Enable data export functionality',
      'Connect form submission to data storage',
      'Wire up views to reactively display stored data',
    ],
    estimatedComplexity: complexity,
  };
}

/**
 * Generate an implementation plan for the given spec
 * Emits status updates via SSE during generation
 */
export async function generateImplementationPlan(
  spec: ProjectSpec,
  statusId: string
): Promise<ImplementationPlan> {
  console.log('\n🎯 === Generating Implementation Plan ===');
  console.log(`   App: ${spec.name}`);
  console.log(`   Category: ${spec.category}`);
  console.log(`   Fields: ${spec.dataStore.fields.length}`);
  console.log(`   Views: ${spec.views.length}`);
  
  // Emit starting status
  emitStatus(statusId, 'plan', 'Analyzing app architecture...', {
    severity: 'info',
    technicalDetails: 'Building LLM prompt for plan generation',
    progress: 20,
  });
  
  try {
    // Build the prompt
    const prompt = buildPlanPrompt(spec);
    
    emitStatus(statusId, 'plan', 'Generating implementation plan...', {
      severity: 'info',
      technicalDetails: 'Calling LLM for plan generation',
      progress: 40,
    });
    
    // Call the LLM
    const response = await complete({
      messages: [
        {
          role: 'system',
          content: 'You are an expert software architect. Generate detailed implementation plans for web applications. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      maxTokens: 1500,
    });
    
    console.log('✅ LLM plan response received, length:', response.length);
    
    emitStatus(statusId, 'plan', 'Processing plan details...', {
      severity: 'info',
      technicalDetails: 'Parsing LLM response into structured plan',
      progress: 70,
    });
    
    // Parse the response
    const plan = parsePlanResponse(response, spec);
    
    console.log('✅ Plan generated successfully:');
    console.log(`   Overview: ${plan.overview.substring(0, 50)}...`);
    console.log(`   Primitives: ${plan.architecture.primitives.join(', ')}`);
    console.log(`   Steps: ${plan.steps.length}`);
    console.log(`   Complexity: ${plan.estimatedComplexity}`);
    
    emitStatus(statusId, 'plan', 'Implementation plan ready!', {
      severity: 'success',
      technicalDetails: `Plan: ${plan.steps.length} steps, ${plan.estimatedComplexity} complexity`,
      progress: 100,
    });
    
    return plan;
  } catch (error) {
    console.error('❌ Plan generation failed:', error);
    
    emitStatus(statusId, 'plan', 'Using simplified plan (AI unavailable)', {
      severity: 'warning',
      technicalDetails: error instanceof Error ? error.message : 'Unknown error',
      progress: 100,
    });
    
    // Return fallback plan
    return createFallbackPlan(spec);
  }
}

/**
 * Format a plan into a human-readable message for the chat
 */
export function formatPlanMessage(plan: ImplementationPlan): string {
  const stepsFormatted = plan.steps
    .map((step, i) => `${i + 1}. ${step}`)
    .join('\n');
  
  const primitivesFormatted = plan.architecture.primitives
    .map(p => `• ${p}`)
    .join('\n');
  
  return `## Implementation Plan

${plan.overview}

### Architecture
**Components Used:**
${primitivesFormatted}

**Data Flow:**
${plan.architecture.dataFlow}

### Build Steps
${stepsFormatted}

**Estimated Complexity:** ${plan.estimatedComplexity.charAt(0).toUpperCase() + plan.estimatedComplexity.slice(1)}

---

Review the plan above and click "Build My App" when you're ready!`;
}
