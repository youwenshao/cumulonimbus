/**
 * Implementation Engineer Agent
 * 
 * Generates code from the complete design specification.
 * NO TEMPLATES - generates fresh, custom code for each app
 * based on the journey, interactions, components, and data layer.
 */

import { BaseAgent } from './base-agent';
import { generateId } from '@/lib/utils';
import { streamComplete } from '@/lib/qwen';
import type { ConversationState, AgentResponse } from '../types';
import type {
  DesignConsensus,
  UserJourney,
  InteractionSpec,
  ComponentSystem,
  ComponentDesign,
  DataLayer,
  DataOperationSpec,
  ImplementationSpec,
  GeneratedCode,
  GeneratedFile,
  GeneratedComponentSpec,
} from '../journey-types';

// ============================================================================
// Implementation Engineer System Prompt
// ============================================================================

const IMPLEMENTATION_ENGINEER_SYSTEM_PROMPT = `You are an Implementation Engineer who generates CUSTOM code from design specifications.

## Your Philosophy

- NO templates, NO boilerplate
- Every app gets fresh, unique code
- Follow the design spec EXACTLY
- Use the libraries specified by the Component Architect
- Implement ALL animations specified by the Interaction Designer

## Code Quality Standards

- Use 'use client' for React components
- TypeScript with strict types
- Named exports (not default)
- Framer Motion for animations
- CSS variables for theming
- Proper error handling

## File Generation

For each component designed:
1. Read its ComponentDesign spec
2. Generate EXACTLY what it describes
3. Implement ALL its interactions
4. Use its suggested libraries

For the data layer:
1. Read DataOperationSpec for each operation
2. Generate CUSTOM functions (not CRUD)
3. Implement storage as specified

## Component Generation Template

Each component should:
- Import required libraries
- Define types for props
- Implement all interactions
- Apply animations as specified
- Use design tokens

## CRITICAL RULES

1. NO generic CRUD patterns
2. NO form/table templates
3. Generate EXACTLY what the design specifies
4. Every component is UNIQUE to this app

Output ONLY the code - no explanations, no markdown blocks.`;

// ============================================================================
// Implementation Engineer Agent
// ============================================================================

export class ImplementationEngineer extends BaseAgent {
  constructor() {
    super({
      name: 'ImplementationEngineer',
      description: 'Generates custom code from design specifications',
      temperature: 0.3,
      maxTokens: 8192,
    });
  }

  protected buildSystemPrompt(): string {
    return IMPLEMENTATION_ENGINEER_SYSTEM_PROMPT;
  }

  /**
   * Generate complete implementation from design consensus
   */
  async implement(consensus: DesignConsensus): Promise<GeneratedCode> {
    this.log('Implementing design', {
      components: consensus.components.components.length,
      operations: consensus.dataLayer.operations.length,
    });

    const files: GeneratedFile[] = [];

    // 1. Generate types
    const typesFile = this.generateTypes(consensus);
    files.push(typesFile);

    // 2. Generate data operations (NOT CRUD)
    const dataFile = await this.generateDataLayer(consensus.dataLayer);
    files.push(dataFile);

    // 3. Generate each component
    for (const component of consensus.components.components) {
      const componentFile = await this.generateComponent(
        component,
        consensus.interactions,
        consensus.components.designTokens
      );
      files.push(componentFile);
    }

    // 4. Generate main app
    const appFile = await this.generateApp(consensus);
    files.push(appFile);

    // 5. Generate styles/tokens
    const stylesFile = this.generateStyles(consensus.components.designTokens);
    files.push(stylesFile);

    return {
      files,
      entryPoint: 'App.tsx',
      dependencies: this.collectDependencies(consensus),
    };
  }

  /**
   * Generate TypeScript types from the design
   */
  private generateTypes(consensus: DesignConsensus): GeneratedFile {
    const { dataLayer, components } = consensus;

    let types = `// Auto-generated types for ${consensus.journey.appName}

`;

    // Generate types from data structures
    for (const structure of dataLayer.structures) {
      types += `export interface ${this.pascalCase(structure.name)} {\n`;
      for (const field of structure.fields) {
        const tsType = this.mapToTsType(field.type);
        types += `  ${field.name}${field.required ? '' : '?'}: ${tsType};\n`;
      }
      types += `}\n\n`;
    }

    // Generate input types for operations
    for (const op of dataLayer.operations) {
      if (op.inputs.length > 0) {
        types += `export interface ${this.pascalCase(op.name)}Input {\n`;
        for (const input of op.inputs) {
          const tsType = this.mapToTsType(input.type);
          types += `  ${input.name}${input.required ? '' : '?'}: ${tsType};\n`;
        }
        types += `}\n\n`;
      }
    }

    // Generate component prop types
    for (const component of components.components) {
      if (component.propsSpec.length > 0) {
        types += `export interface ${component.name}Props {\n`;
        for (const prop of component.propsSpec) {
          types += `  ${prop.name}${prop.required ? '' : '?'}: ${prop.type};\n`;
        }
        types += `}\n\n`;
      }
    }

    return {
      path: 'lib/types.ts',
      content: types,
      type: 'types',
    };
  }

  /**
   * Generate data layer with custom operations (NOT CRUD)
   */
  private async generateDataLayer(dataLayer: DataLayer): Promise<GeneratedFile> {
    const prompt = `Generate a data layer module with these CUSTOM operations (NOT generic CRUD):

Storage Strategy: ${dataLayer.storage.type}
${dataLayer.storage.offlineSupport ? 'With offline support' : ''}

Data Structures:
${dataLayer.structures.map(s => `
${s.name}:
  Purpose: ${s.purpose}
  Fields: ${s.fields.map(f => `${f.name}: ${f.type}`).join(', ')}
`).join('\n')}

Operations to Implement:
${dataLayer.operations.map(op => `
${op.name}:
  Description: ${op.description}
  Triggered by: ${op.triggeredBy}
  Inputs: ${op.inputs.map(i => `${i.name}: ${i.type}`).join(', ') || 'none'}
  Returns: ${op.output}
  ${op.sideEffects?.length ? `Side effects: ${op.sideEffects.join(', ')}` : ''}
  ${op.implementationHints ? `Hints: ${op.implementationHints}` : ''}
`).join('\n')}

Generate TypeScript module with:
1. Storage helpers (load/save to ${dataLayer.storage.type})
2. Each operation as a named export
3. Proper error handling
4. NO generic CRUD functions

Use 'use client' directive. Export all operations.`;

    let code = '';
    for await (const chunk of streamComplete({
      messages: [
        { role: 'system', content: IMPLEMENTATION_ENGINEER_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      maxTokens: 4096,
    })) {
      code += chunk;
    }

    return {
      path: 'lib/data.ts',
      content: this.cleanCode(code),
      type: 'data',
    };
  }

  /**
   * Generate a single component from its design
   */
  private async generateComponent(
    component: ComponentDesign,
    interactions: InteractionSpec,
    designTokens: Record<string, any>
  ): Promise<GeneratedFile> {
    // Find relevant animations for this component
    const relevantAnimations = interactions.animations.filter(a =>
      a.target.toLowerCase().includes(component.name.toLowerCase()) ||
      component.interactions.some(i => i.animation?.includes(a.name))
    );

    // Find relevant gestures
    const relevantGestures = interactions.gestures.filter(g =>
      g.target.toLowerCase().includes(component.name.toLowerCase())
    );

    const prompt = `Generate a React component with these EXACT specifications:

**Component: ${component.name}**
${component.isPrimary ? '(This is the PRIMARY component)' : ''}
Layout Role: ${component.layoutRole}

**Purpose**: ${component.purpose}

**Description**: ${component.description}

**Visual Specifications**:
- Size: ${component.visual.sizing.width} × ${component.visual.sizing.height}
- Style: ${component.visual.style}
- Colors: 
  - Background: ${component.visual.colors.background}
  - Foreground: ${component.visual.colors.foreground}
  ${component.visual.colors.accent ? `- Accent: ${component.visual.colors.accent}` : ''}

**Interactions to Implement**:
${component.interactions.map(i => `
- Trigger: ${i.trigger}
  Effect: ${i.effect}
  ${i.animation ? `Animation: ${i.animation}` : ''}
`).join('\n')}

**Animations** (implement with framer-motion):
${relevantAnimations.map(a => `
- ${a.name}: ${a.trigger}
  Duration: ${a.duration}ms
  Easing: ${a.easing}
  ${a.stagger ? `Stagger: ${a.stagger.delay}ms ${a.stagger.direction}` : ''}
`).join('\n') || 'Standard entry animation'}

**Gestures**:
${relevantGestures.map(g => `
- ${g.type}${g.direction ? ` ${g.direction}` : ''} on ${g.target}
  Effect: ${g.effect}
`).join('\n') || 'Standard tap handling'}

**Props**:
${component.propsSpec.map(p => `
- ${p.name}: ${p.type} ${p.required ? '(required)' : '(optional)'}
  ${p.description}
`).join('\n') || 'No custom props'}

**Data Needs**:
${component.dataNeeds.map(d => `
- ${d.name}: ${d.type} from ${d.source}
  ${d.description}
`).join('\n') || 'No external data'}

**State Management**:
${component.stateNeeds.map(s => `
- ${s.name}: ${s.type} = ${JSON.stringify(s.initial)}
  Persistence: ${s.persistence}
`).join('\n') || 'No internal state'}

**Libraries to Use**: ${component.suggestedLibraries.join(', ') || 'framer-motion, lucide-react'}

Generate the COMPLETE component. Include:
1. All imports
2. 'use client' directive
3. TypeScript types
4. Named export
5. ALL animations with framer-motion
6. ALL interactions
7. Error handling

Output ONLY the code.`;

    let code = '';
    for await (const chunk of streamComplete({
      messages: [
        { role: 'system', content: IMPLEMENTATION_ENGINEER_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      maxTokens: 6144,
    })) {
      code += chunk;
    }

    return {
      path: `components/${component.name}.tsx`,
      content: this.cleanCode(code),
      type: 'component',
    };
  }

  /**
   * Generate main app file
   */
  private async generateApp(consensus: DesignConsensus): Promise<GeneratedFile> {
    const { journey, components, interactions } = consensus;

    const prompt = `Generate the main App component for "${journey.appName}":

**App Purpose**: ${journey.appPurpose}

**Components to Include**:
${components.components.map(c => `
- ${c.name} (${c.layoutRole})
  ${c.isPrimary ? 'PRIMARY COMPONENT - should be prominent' : ''}
`).join('\n')}

**Navigation**:
Type: ${journey.navigation.type}
${journey.navigation.primaryAction ? `Primary Action: ${journey.navigation.primaryAction.label} button at ${journey.navigation.primaryAction.position}` : ''}
Items: ${journey.navigation.items.map(i => i.label).join(', ') || 'None'}

**Page Entry Animation**:
${interactions.animations.find(a => a.trigger === 'mount')?.name || 'Stagger fade-in'}

**States to Handle**:
${journey.states.map(s => `- ${s.name}: ${s.description}`).join('\n')}

**Key Moments** (special celebrations):
${journey.keyMoments.map(m => `
- ${m.name}: ${m.trigger}
  Celebration: ${m.celebration?.type || 'animation'}
`).join('\n') || 'None'}

Generate the App component that:
1. Imports all components from ./components/
2. Imports data operations from ./lib/data
3. Manages app state (loading, empty, loaded)
4. Applies entry animations
5. Handles key moments with celebrations
6. Renders components in their layout roles

Output ONLY the code.`;

    let code = '';
    for await (const chunk of streamComplete({
      messages: [
        { role: 'system', content: IMPLEMENTATION_ENGINEER_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      maxTokens: 6144,
    })) {
      code += chunk;
    }

    return {
      path: 'App.tsx',
      content: this.cleanCode(code),
      type: 'entry',
    };
  }

  /**
   * Generate styles/tokens file
   */
  private generateStyles(designTokens: Record<string, any>): GeneratedFile {
    const cssVars = Object.entries(designTokens.colors || {})
      .map(([key, value]) => `  --color-${this.kebabCase(key)}: ${value};`)
      .join('\n');

    const fontVars = Object.entries(designTokens.fonts || {})
      .map(([key, value]) => `  --font-${key}: ${value};`)
      .join('\n');

    const spacingVars = Object.entries(designTokens.spacing || {})
      .map(([key, value]) => `  --spacing-${key}: ${value};`)
      .join('\n');

    const radiiVars = Object.entries(designTokens.radii || {})
      .map(([key, value]) => `  --radius-${key}: ${value};`)
      .join('\n');

    const shadowVars = Object.entries(designTokens.shadows || {})
      .map(([key, value]) => `  --shadow-${key}: ${value};`)
      .join('\n');

    const transitionVars = Object.entries(designTokens.transitions || {})
      .map(([key, value]) => `  --transition-${key}: ${value};`)
      .join('\n');

    const content = `/* Auto-generated design tokens */

:root {
  /* Colors */
${cssVars}

  /* Typography */
${fontVars}

  /* Spacing */
${spacingVars}

  /* Border Radius */
${radiiVars}

  /* Shadows */
${shadowVars}

  /* Transitions */
${transitionVars}
}

/* Base styles */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-body);
  background: var(--color-background);
  color: var(--color-text);
  min-height: 100vh;
}

/* Utility classes */
.text-muted {
  color: var(--color-textMuted);
}

.bg-elevated {
  background: var(--color-backgroundElevated);
}
`;

    return {
      path: 'styles/tokens.css',
      content,
      type: 'styles',
    };
  }

  /**
   * Collect all dependencies needed
   */
  private collectDependencies(consensus: DesignConsensus): Record<string, string> {
    const deps: Record<string, string> = {
      'framer-motion': '^10.0.0',
      'lucide-react': '^0.300.0',
    };

    // Collect from components
    for (const component of consensus.components.components) {
      for (const lib of component.suggestedLibraries) {
        if (!deps[lib]) {
          deps[lib] = 'latest';
        }
      }
    }

    // Common dependencies based on interactions
    if (consensus.interactions.animations.some(a => a.stagger)) {
      deps['framer-motion'] = '^10.0.0';
    }

    // If celebrations are needed
    if (consensus.journey.keyMoments.some(m => m.celebration?.type === 'confetti')) {
      deps['canvas-confetti'] = '^1.9.0';
    }

    return deps;
  }

  /**
   * Clean generated code
   */
  private cleanCode(code: string): string {
    // Remove markdown code blocks if present
    let cleaned = code.replace(/```(?:tsx?|javascript)?\n?/g, '').replace(/```\n?$/g, '');
    
    // Trim whitespace
    cleaned = cleaned.trim();
    
    return cleaned;
  }

  /**
   * Convert to PascalCase
   */
  private pascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Convert to kebab-case
   */
  private kebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Map type string to TypeScript type
   */
  private mapToTsType(type: string): string {
    const mapping: Record<string, string> = {
      string: 'string',
      number: 'number',
      boolean: 'boolean',
      date: 'Date',
      array: 'unknown[]',
      object: 'Record<string, unknown>',
    };
    return mapping[type] || type;
  }

  /**
   * Process method for AgentResponse interface
   */
  async process(
    message: string,
    state: ConversationState
  ): Promise<AgentResponse> {
    return {
      success: true,
      message: 'Implementation Engineer ready to generate code from design specifications',
      requiresUserInput: false,
    };
  }
}

// Export singleton instance
export const implementationEngineer = new ImplementationEngineer();
