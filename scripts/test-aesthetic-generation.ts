#!/usr/bin/env tsx
/**
 * Test Aesthetic Generation
 * Generates a test app and verifies aesthetic implementation
 */

interface AestheticData {
  theme?: string;
  typography?: {
    heading: string;
    body: string;
    accent: string;
  };
  colorPalette?: {
    primary: string;
    accent: string;
    background: string;
    isDark: boolean;
  };
  motion?: {
    intensity: string;
    pageLoadStrategy: string;
    interactions: string[];
  };
}

interface TestResult {
  appId: string;
  appUrl: string;
  aesthetics?: AestheticData;
  hasGoogleFonts: boolean;
  hasCSSVariables: boolean;
  hasFramerMotion: boolean;
  hasBackgroundGradient: boolean;
  generatedCode: string;
}

async function generateTestApp(prompt: string): Promise<TestResult> {
  const baseUrl = 'http://localhost:1000';
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing app generation with prompt: "${prompt}"`);
  console.log(`${'='.repeat(60)}\n`);

  // Step 1: Start conversation and stream
  console.log('📝 Step 1: Starting conversation...');
  const streamResponse = await fetch(`${baseUrl}/api/scaffolder/freeform`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'stream',
      message: prompt,
    }),
  });

  if (!streamResponse.ok) {
    throw new Error(`Stream failed: ${streamResponse.status} ${streamResponse.statusText}`);
  }

  // Parse SSE stream
  const reader = streamResponse.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';
  let conversationId: string | null = null;
  let aestheticLogged = false;

  console.log('📡 Streaming conversation...\n');

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
        
        if (data.type === 'agent_start') {
          console.log(`  ▶️  ${data.agent} started`);
        } else if (data.type === 'agent_complete') {
          console.log(`  ✅ ${data.agent} completed (${data.durationMs}ms)`);
        } else if (data.type === 'done') {
          conversationId = data.conversationId;
          console.log(`\n✨ Conversation complete: ${conversationId}`);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }

  if (!conversationId) {
    throw new Error('No conversation ID received');
  }

  // Step 2: Build the app
  console.log('\n🔨 Step 2: Building app...');
  const buildResponse = await fetch(`${baseUrl}/api/scaffolder/freeform`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'build',
      conversationId,
    }),
  });

  if (!buildResponse.ok) {
    throw new Error(`Build failed: ${buildResponse.status}`);
  }

  const buildData = await buildResponse.json();
  const appId = buildData.app.id;
  const appUrl = `${baseUrl}/s/${buildData.app.subdomain}`;
  const generatedCode = buildData.generatedCode?.pageComponent || '';

  console.log(`✅ App built successfully!`);
  console.log(`   App ID: ${appId}`);
  console.log(`   URL: ${appUrl}`);

  // Step 3: Analyze generated code
  console.log('\n🔍 Step 3: Analyzing generated code...');
  
  const hasGoogleFonts = generatedCode.includes('@import url') && 
                         generatedCode.includes('fonts.googleapis.com');
  const hasCSSVariables = generatedCode.includes('--font-heading') || 
                          generatedCode.includes('--color-primary');
  const hasFramerMotion = generatedCode.includes('from \'framer-motion\'');
  const hasBackgroundGradient = generatedCode.includes('gradient') || 
                                generatedCode.includes('radial-gradient');

  // Extract aesthetics from app config
  let aesthetics: AestheticData | undefined;
  if (buildData.app.config?.v2Pipeline?.aesthetics) {
    aesthetics = buildData.app.config.v2Pipeline.aesthetics;
  }

  console.log(`   Google Fonts: ${hasGoogleFonts ? '✅' : '❌'}`);
  console.log(`   CSS Variables: ${hasCSSVariables ? '✅' : '❌'}`);
  console.log(`   Framer Motion: ${hasFramerMotion ? '✅' : '❌'}`);
  console.log(`   Background Gradient: ${hasBackgroundGradient ? '✅' : '❌'}`);

  if (aesthetics) {
    console.log('\n🎨 Aesthetic Details:');
    console.log(`   Theme: ${aesthetics.theme}`);
    console.log(`   Heading Font: ${aesthetics.typography?.heading}`);
    console.log(`   Body Font: ${aesthetics.typography?.body}`);
    console.log(`   Primary Color: ${aesthetics.colorPalette?.primary}`);
    console.log(`   Accent Color: ${aesthetics.colorPalette?.accent}`);
    console.log(`   Dark Theme: ${aesthetics.colorPalette?.isDark ? 'Yes' : 'No'}`);
    console.log(`   Motion: ${aesthetics.motion?.intensity} / ${aesthetics.motion?.pageLoadStrategy}`);
  } else {
    console.log('\n⚠️  No aesthetics found in config');
  }

  return {
    appId,
    appUrl,
    aesthetics,
    hasGoogleFonts,
    hasCSSVariables,
    hasFramerMotion,
    hasBackgroundGradient,
    generatedCode,
  };
}

async function main() {
  console.log('🚀 Artistic UI Designer Test Suite\n');

  try {
    // Test 1: Generate a single app
    const result = await generateTestApp('Build a simple task manager');

    // Validate results
    console.log('\n📊 Test Results Summary:');
    console.log('========================\n');

    const checks = [
      { name: 'Aesthetics Present', passed: !!result.aesthetics },
      { name: 'Google Fonts Imported', passed: result.hasGoogleFonts },
      { name: 'CSS Variables Defined', passed: result.hasCSSVariables },
      { name: 'Framer Motion Used', passed: result.hasFramerMotion },
      { name: 'Background Gradient Applied', passed: result.hasBackgroundGradient },
    ];

    let passedCount = 0;
    for (const check of checks) {
      console.log(`${check.passed ? '✅' : '❌'} ${check.name}`);
      if (check.passed) passedCount++;
    }

    console.log(`\n${passedCount}/${checks.length} checks passed`);

    if (passedCount === checks.length) {
      console.log('\n🎉 All tests passed! Artistic UI Designer is working correctly.');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed. Review the results above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
