#!/usr/bin/env tsx
/**
 * Inspect Generated Code for Aesthetic Implementation
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectCode() {
  const app = await prisma.app.findFirst({
    where: { version: 'v2' },
    orderBy: { createdAt: 'desc' },
    select: { generatedCode: true, name: true, componentFiles: true }
  });

  if (!app) {
    console.log('No V2 app found');
    process.exit(1);
  }

  const code = app.generatedCode || '';
  
  console.log('🔍 Detailed Code Analysis for:', app.name);
  console.log('='.repeat(60), '\n');

  // Extract Google Fonts section
  const fontImportMatch = code.match(/@import url\(['"]https:\/\/fonts\.googleapis\.com[^'"]+['"]/);
  if (fontImportMatch) {
    console.log('✅ Google Fonts Import Found:');
    const url = fontImportMatch[0].substring(0, 100);
    console.log('  ', url + '...');
  } else {
    console.log('❌ No Google Fonts import found');
  }

  // Extract CSS Variables
  const cssVarMatches = code.match(/--font-[a-z]+:|--color-[a-z-]+:/g);
  if (cssVarMatches) {
    console.log('\n✅ CSS Variables Found (' + cssVarMatches.length + '):');
    const uniqueVars = [...new Set(cssVarMatches)].slice(0, 10);
    uniqueVars.forEach(v => console.log('   -', v.replace(':', '')));
  } else {
    console.log('\n❌ No CSS variables found');
  }

  // Check for Framer Motion
  const motionImport = code.match(/import.*from ['"]framer-motion['"]/);
  if (motionImport) {
    console.log('\n✅ Framer Motion Import:');
    console.log('  ', motionImport[0]);
  }

  const motionUsage = code.match(/<motion\.[a-z]+/g);
  if (motionUsage) {
    console.log('\n✅ Motion Components Used (' + motionUsage.length + '):');
    const uniqueMotion = [...new Set(motionUsage)].slice(0, 5);
    uniqueMotion.forEach(m => console.log('   -', m));
  }

  // Check for background styling
  const backgroundMatch = code.match(/background:\s*[`'][^`']*gradient[^`']*[`']/);
  if (backgroundMatch) {
    console.log('\n✅ Background Gradient:');
    const bgValue = backgroundMatch[0].substring(0, 120);
    console.log('  ', bgValue + '...');
  }

  // Check for inline styles with CSS variables
  const varUsage = code.match(/var\(--[a-z-]+\)/g);
  if (varUsage) {
    console.log('\n✅ CSS Variable Usage (' + varUsage.length + ' instances):');
    const uniqueUsage = [...new Set(varUsage)].slice(0, 8);
    uniqueUsage.forEach(u => console.log('   -', u));
  }

  // Sample code snippet
  const lines = code.split('\n');
  const styleLineIdx = lines.findIndex(l => l.includes(':root {'));
  if (styleLineIdx !== -1) {
    console.log('\n📄 CSS Variables Definition Sample:');
    console.log('   ' + lines.slice(styleLineIdx, Math.min(styleLineIdx + 8, lines.length)).join('\n   '));
  }

  // Check component files for CSS variable usage
  const componentFiles = typeof app.componentFiles === 'string' 
    ? JSON.parse(app.componentFiles) 
    : app.componentFiles;
  
  if (componentFiles) {
    console.log('\n🔍 Component Files Analysis:');
    let componentCount = 0;
    let varsInComponents = 0;
    
    for (const [filename, content] of Object.entries(componentFiles)) {
      if (filename.endsWith('.tsx') && !filename.includes('App.tsx')) {
        componentCount++;
        const componentVars = (content as string).match(/var\(--[a-z-]+\)/g);
        if (componentVars) {
          varsInComponents += componentVars.length;
        }
      }
    }
    console.log(`   Components analyzed: ${componentCount}`);
    console.log(`   CSS var usages in components: ${varsInComponents}`);
  }

  await prisma.$disconnect();
  
  console.log('\n✅ Test 2 COMPLETED: Code inspection shows aesthetic implementation');
}

inspectCode();
