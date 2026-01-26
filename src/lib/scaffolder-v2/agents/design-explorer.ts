/**
 * Design Explorer Agent
 * Autonomously explores design possibilities through internal dialogue
 * Generates multiple concepts, critiques them, and produces refined designs
 */

import { BaseAgent } from './base-agent';
import { generateId } from '@/lib/utils';
import type { 
  ConversationState, 
  AgentResponse, 
  Schema,
  LayoutNode,
  AestheticSpec,
  AppCapabilities,
  CustomViewSpec,
  EnhancedIntent,
  ComponentType,
} from '../types';

// ============================================================================
// Design Concept Types
// ============================================================================

export interface DesignConcept {
  id: string;
  name: string;
  description: string;
  
  // Design artifacts
  layout: LayoutNode;
  aesthetics: AestheticSpec;
  capabilities: AppCapabilities;
  
  // Evaluation scores (0-100)
  scores: {
    creativity: number;     // How unique/non-generic is this?
    usability: number;      // How well does it serve the user's needs?
    polish: number;         // How polished/complete does it feel?
    coherence: number;      // How well do elements work together?
  };
  
  // Self-critique
  critique: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  };
  
  // Is this recommended?
  recommended: boolean;
  confidence: number;
}

export interface ExplorationResult {
  concepts: DesignConcept[];
  selectedConcept: DesignConcept;
  reasoning: string;
  iterations: number;
  totalScore: number;
}

// ============================================================================
// Prompts
// ============================================================================

const DESIGN_EXPLORATION_PROMPT = `You are a creative design explorer. Your job is to generate MULTIPLE DISTINCT design concepts for an app, NOT just one generic solution.

## Your Goals
1. Generate 3+ DISTINCTLY DIFFERENT design concepts
2. Each concept should take a different approach to solving the user's need
3. Avoid generic CRUD patterns (form on left, table on right)
4. Think like a product designer, not a database administrator

## Concept Generation Guidelines

For each concept, consider:
- What is the PRIMARY interaction the user will do MOST OFTEN?
- What should they see IMMEDIATELY when they open the app?
- What should be hidden/accessible on demand?
- How can we delight them with the experience?

## Example Concept Variations

For a "habit tracker":
1. **Heatmap Focus**: GitHub-style contribution graph as hero, floating check-in button
2. **Streak Gamification**: Big streak counter, daily challenge cards, achievement badges
3. **Minimalist Daily**: Just today's habits as a checklist, swipe to complete
4. **Calendar Integration**: Monthly calendar view with habit dots, tap day to see details

For a "expense tracker":
1. **Visual Budget**: Pie chart hero, spending categories as colorful cards
2. **Timeline**: Scrolling timeline of expenses, quick-add floating button
3. **Dashboard**: Stats at top, recent transactions, monthly summary
4. **Minimal Entry**: Big "Add Expense" button, recent list below

## Output Format

For each concept, provide:
1. Name (2-3 words, descriptive)
2. Description (1-2 sentences explaining the approach)
3. Primary component (what dominates the view)
4. Secondary components (what supports it)
5. Interaction pattern (how users primarily interact)
6. Why it's different from the others

Generate concepts as JSON.`;

const DESIGN_CRITIQUE_PROMPT = `You are a critical design reviewer. Evaluate this design concept honestly.

## Evaluation Criteria

Score each criterion 0-100:

1. **Creativity** (0-100)
   - 0-30: Generic CRUD (form + table)
   - 30-50: Standard patterns with minor variations
   - 50-70: Interesting approach but somewhat expected
   - 70-90: Creative and distinctive
   - 90-100: Truly innovative and delightful

2. **Usability** (0-100)
   - Does the primary view serve the most common use case?
   - Is the most frequent action easy to perform?
   - Is the information hierarchy clear?

3. **Polish** (0-100)
   - Does it feel complete and cohesive?
   - Are animations and interactions well-considered?
   - Is the aesthetic distinctive?

4. **Coherence** (0-100)
   - Do all elements work together?
   - Is there a clear design language?
   - Do interactions feel natural?

## Be Honest
- If it's generic CRUD, say so (score < 40 for creativity)
- If it doesn't serve the user's actual needs, say so
- Suggest specific improvements

Provide critique as JSON with scores and text feedback.`;

const DESIGN_SYNTHESIS_PROMPT = `You are a design synthesizer. Given multiple design concepts and their critiques, create an OPTIMAL final design.

## Your Task
1. Review all concepts and their scores
2. Identify the best elements from each
3. Synthesize a final design that:
   - Takes the most creative approach
   - Serves the user's actual needs
   - Feels polished and cohesive
   - Avoids generic CRUD patterns

## Rules
- The final design must score at least 70+ on creativity
- If no concept meets this bar, IMPROVE the best one
- Don't just pick the highest-scored concept - SYNTHESIZE the best elements
- Add improvements suggested in critiques

Output the final design as a complete concept JSON.`;

// ============================================================================
// Design Explorer Agent
// ============================================================================

export class DesignExplorerAgent extends BaseAgent {
  private maxIterations = 3;
  private creativityThreshold = 70;

  constructor() {
    super({
      name: 'DesignExplorer',
      description: 'Explores multiple design concepts through internal dialogue',
      temperature: 0.7, // Higher for creative exploration
      maxTokens: 8192,
    });
  }

  protected buildSystemPrompt(state: ConversationState): string {
    return DESIGN_EXPLORATION_PROMPT;
  }

  /**
   * Main exploration process
   * Generates concepts, critiques them, and produces a refined design
   */
  async explore(
    userRequest: string,
    schema: Schema,
    intent?: EnhancedIntent
  ): Promise<ExplorationResult> {
    this.log('Starting design exploration', { userRequest: userRequest.substring(0, 100) });

    let iteration = 0;
    let concepts: DesignConcept[] = [];
    let selectedConcept: DesignConcept | null = null;

    while (iteration < this.maxIterations) {
      iteration++;
      this.log(`Exploration iteration ${iteration}`);

      // Step 1: Generate concepts (or refine from previous iteration)
      if (concepts.length === 0) {
        concepts = await this.generateConcepts(userRequest, schema, intent);
      } else {
        // Refine concepts based on critiques
        concepts = await this.refineConcepts(concepts, userRequest, schema);
      }

      // Step 2: Critique each concept
      for (const concept of concepts) {
        const critique = await this.critiqueConcept(concept, userRequest, intent);
        concept.scores = critique.scores;
        concept.critique = critique.critique;
        concept.confidence = this.calculateConfidence(critique.scores);
      }

      // Step 3: Check if any concept meets threshold
      const bestConcept = concepts.reduce((best, c) => 
        c.scores.creativity > best.scores.creativity ? c : best
      , concepts[0]);

      if (bestConcept.scores.creativity >= this.creativityThreshold) {
        selectedConcept = bestConcept;
        selectedConcept.recommended = true;
        break;
      }

      this.log(`Best concept scored ${bestConcept.scores.creativity}, below threshold ${this.creativityThreshold}`);
    }

    // If no concept met threshold, synthesize a better one
    if (!selectedConcept) {
      this.log('No concept met threshold, synthesizing improved design');
      selectedConcept = await this.synthesizeFinalDesign(concepts, userRequest, schema, intent);
    }

    const totalScore = this.calculateTotalScore(selectedConcept.scores);

    return {
      concepts,
      selectedConcept,
      reasoning: `Selected "${selectedConcept.name}" after ${iteration} iteration(s). ` +
        `Creativity: ${selectedConcept.scores.creativity}, ` +
        `Usability: ${selectedConcept.scores.usability}, ` +
        `Total: ${totalScore}`,
      iterations: iteration,
      totalScore,
    };
  }

  /**
   * Generate initial design concepts
   */
  private async generateConcepts(
    userRequest: string,
    schema: Schema,
    intent?: EnhancedIntent
  ): Promise<DesignConcept[]> {
    const prompt = `Generate 3-4 distinctly different design concepts for this app:

User Request: "${userRequest}"

Schema: ${schema.name}
Fields: ${schema.fields.filter(f => !f.generated).map(f => `${f.label} (${f.type})`).join(', ')}

${intent ? `
App Category: ${intent.appCategory}
Primary Goal: ${intent.primaryGoal}
Key Entities: ${intent.entities.map(e => e.name).join(', ')}
Reference Apps: ${intent.referenceApps.map(r => r.name).join(', ') || 'None'}
` : ''}

Generate CREATIVE concepts - avoid generic form+table CRUD patterns!

Return JSON array of concepts with this structure:
{
  "concepts": [
    {
      "name": "Concept Name",
      "description": "Brief description of the approach",
      "primaryComponent": { "type": "heatmap|timeline|cards|etc", "description": "What it shows" },
      "secondaryComponents": [{ "type": "string", "description": "string" }],
      "interactionPattern": "How users primarily interact",
      "whyDifferent": "What makes this unique"
    }
  ]
}`;

    try {
      const response = await this.callLLMJSON<{
        concepts: Array<{
          name: string;
          description: string;
          primaryComponent: { type: string; description: string };
          secondaryComponents: Array<{ type: string; description: string }>;
          interactionPattern: string;
          whyDifferent: string;
        }>;
      }>(
        [
          { role: 'system', content: DESIGN_EXPLORATION_PROMPT },
          { role: 'user', content: prompt },
        ],
        '{"concepts": [...]}'
      );

      return response.concepts.map(c => this.conceptToDesign(c, schema, intent));
    } catch (error) {
      this.log('Concept generation failed, using fallbacks', { error });
      return this.generateFallbackConcepts(schema, intent);
    }
  }

  /**
   * Convert raw concept to full DesignConcept
   */
  private conceptToDesign(
    raw: {
      name: string;
      description: string;
      primaryComponent: { type: string; description: string };
      secondaryComponents: Array<{ type: string; description: string }>;
      interactionPattern: string;
      whyDifferent: string;
    },
    schema: Schema,
    intent?: EnhancedIntent
  ): DesignConcept {
    // Build layout from concept
    const primaryType = this.mapToComponentType(raw.primaryComponent.type);
    const layout = this.buildLayoutFromConcept(raw, schema);
    const aesthetics = this.generateAesthetics(raw.name);
    const capabilities = this.inferCapabilities(raw, intent);

    return {
      id: generateId(),
      name: raw.name,
      description: raw.description,
      layout,
      aesthetics,
      capabilities,
      scores: { creativity: 0, usability: 0, polish: 0, coherence: 0 },
      critique: { strengths: [], weaknesses: [], suggestions: [] },
      recommended: false,
      confidence: 0,
    };
  }

  /**
   * Map string type to ComponentType
   */
  private mapToComponentType(type: string): ComponentType {
    const typeMap: Record<string, ComponentType> = {
      heatmap: 'heatmap',
      'heat map': 'heatmap',
      'contribution graph': 'heatmap',
      timeline: 'timeline',
      calendar: 'calendar',
      kanban: 'kanban',
      cards: 'cards',
      gallery: 'gallery',
      list: 'list',
      table: 'table',
      chart: 'chart',
      stats: 'stats',
      form: 'form',
    };

    const normalized = type.toLowerCase();
    for (const [key, value] of Object.entries(typeMap)) {
      if (normalized.includes(key)) return value;
    }
    return 'custom';
  }

  /**
   * Build layout tree from concept
   */
  private buildLayoutFromConcept(
    concept: {
      primaryComponent: { type: string; description: string };
      secondaryComponents: Array<{ type: string; description: string }>;
    },
    schema: Schema
  ): LayoutNode {
    const primaryType = this.mapToComponentType(concept.primaryComponent.type);
    
    const children: LayoutNode[] = [
      {
        id: generateId(),
        type: 'component',
        component: {
          type: primaryType,
          props: {
            description: concept.primaryComponent.description,
            isPrimary: true,
          },
        },
        sizing: {
          basis: '100%',
          grow: 1,
          shrink: 0,
        },
      },
    ];

    // Add secondary components
    for (const secondary of concept.secondaryComponents) {
      const secType = this.mapToComponentType(secondary.type);
      children.push({
        id: generateId(),
        type: 'component',
        component: {
          type: secType,
          props: {
            description: secondary.description,
          },
        },
      });
    }

    return {
      id: generateId(),
      type: 'container',
      container: {
        direction: 'column',
        gap: '1.5rem',
        padding: '1.5rem',
        children,
        responsive: {
          mobile: 'stack',
          tablet: 'stack',
          desktop: 'side-by-side',
        },
      },
    };
  }

  /**
   * Generate aesthetics based on concept name
   */
  private generateAesthetics(conceptName: string): AestheticSpec {
    // Theme selection based on concept keywords
    const themes = [
      {
        keywords: ['minimal', 'clean', 'simple'],
        theme: 'minimalist',
        colors: {
          primary: '#3b82f6',
          accent: '#10b981',
          background: '#0a0a0a',
          backgroundAlt: '#171717',
          text: '#fafafa',
          textMuted: '#a1a1aa',
          isDark: true,
        },
        fonts: { heading: 'Outfit', body: 'DM Sans', accent: 'JetBrains Mono' },
      },
      {
        keywords: ['gamif', 'streak', 'achievement', 'fun'],
        theme: 'playful',
        colors: {
          primary: '#f59e0b',
          accent: '#ec4899',
          background: '#1e1b4b',
          backgroundAlt: '#312e81',
          text: '#fafafa',
          textMuted: '#a5b4fc',
          isDark: true,
        },
        fonts: { heading: 'Unbounded', body: 'Sora', accent: 'Fira Code' },
      },
      {
        keywords: ['focus', 'primary', 'hero'],
        theme: 'bold',
        colors: {
          primary: '#8b5cf6',
          accent: '#f43f5e',
          background: '#0f0f0f',
          backgroundAlt: '#1a1a1a',
          text: '#ffffff',
          textMuted: '#9ca3af',
          isDark: true,
        },
        fonts: { heading: 'Clash Display', body: 'Manrope', accent: 'Berkeley Mono' },
      },
    ];

    // Find matching theme or use default
    const nameLower = conceptName.toLowerCase();
    const matchedTheme = themes.find(t => 
      t.keywords.some(k => nameLower.includes(k))
    ) || themes[2];

    return {
      theme: matchedTheme.theme,
      typography: matchedTheme.fonts,
      colorPalette: matchedTheme.colors,
      motion: {
        intensity: 'moderate',
        pageLoadStrategy: 'stagger',
        interactions: ['hover-lift', 'click-bounce', 'focus-ring'],
      },
      backgroundStyle: {
        type: 'gradient',
        layers: [
          `radial-gradient(ellipse at 20% 80%, ${matchedTheme.colors.primary}15 0%, transparent 50%)`,
          `linear-gradient(180deg, ${matchedTheme.colors.background} 0%, ${matchedTheme.colors.backgroundAlt} 100%)`,
        ],
      },
    };
  }

  /**
   * Infer app capabilities from concept
   */
  private inferCapabilities(
    concept: {
      primaryComponent: { type: string; description: string };
      interactionPattern: string;
    },
    intent?: EnhancedIntent
  ): AppCapabilities {
    const interactionLower = concept.interactionPattern.toLowerCase();
    
    return {
      needsDataEntry: interactionLower.includes('add') || interactionLower.includes('create') || interactionLower.includes('input'),
      needsDataList: interactionLower.includes('view') || interactionLower.includes('browse') || interactionLower.includes('list'),
      needsDataVisualization: ['heatmap', 'chart', 'stats', 'calendar'].some(t => 
        concept.primaryComponent.type.toLowerCase().includes(t)
      ),
      needsCRUD: false, // Don't assume full CRUD
      needsRealtime: false,
      customViews: [],
      primaryInteraction: this.inferPrimaryInteraction(interactionLower),
      dataOperations: this.inferDataOperations(interactionLower),
    };
  }

  /**
   * Infer primary interaction type
   */
  private inferPrimaryInteraction(interactionPattern: string): AppCapabilities['primaryInteraction'] {
    if (interactionPattern.includes('track') || interactionPattern.includes('complete') || interactionPattern.includes('check')) {
      return 'track';
    }
    if (interactionPattern.includes('add') || interactionPattern.includes('create')) {
      return 'create';
    }
    if (interactionPattern.includes('view') || interactionPattern.includes('browse')) {
      return 'view';
    }
    if (interactionPattern.includes('visual') || interactionPattern.includes('chart')) {
      return 'visualize';
    }
    return 'custom';
  }

  /**
   * Infer data operations from interaction pattern
   */
  private inferDataOperations(interactionPattern: string): AppCapabilities['dataOperations'] {
    const ops: AppCapabilities['dataOperations'] = [];
    
    if (interactionPattern.includes('view') || interactionPattern.includes('see') || interactionPattern.includes('browse')) {
      ops.push({ type: 'read', description: 'View data', isPrimary: true });
    }
    if (interactionPattern.includes('add') || interactionPattern.includes('create') || interactionPattern.includes('new')) {
      ops.push({ type: 'create', description: 'Add new entries' });
    }
    if (interactionPattern.includes('complete') || interactionPattern.includes('check') || interactionPattern.includes('mark')) {
      ops.push({ type: 'update', description: 'Mark as complete' });
    }
    if (interactionPattern.includes('delete') || interactionPattern.includes('remove')) {
      ops.push({ type: 'delete', description: 'Remove entries' });
    }

    // Ensure at least read operation
    if (ops.length === 0) {
      ops.push({ type: 'read', description: 'View data', isPrimary: true });
    }

    return ops;
  }

  /**
   * Critique a design concept
   */
  private async critiqueConcept(
    concept: DesignConcept,
    userRequest: string,
    intent?: EnhancedIntent
  ): Promise<{
    scores: DesignConcept['scores'];
    critique: DesignConcept['critique'];
  }> {
    const prompt = `Critique this design concept:

User's Original Request: "${userRequest}"

Concept Name: ${concept.name}
Description: ${concept.description}

Layout Structure:
${JSON.stringify(concept.layout, null, 2)}

Capabilities:
- Needs Data Entry: ${concept.capabilities.needsDataEntry}
- Needs Data List: ${concept.capabilities.needsDataList}
- Needs Visualization: ${concept.capabilities.needsDataVisualization}
- Needs Full CRUD: ${concept.capabilities.needsCRUD}
- Primary Interaction: ${concept.capabilities.primaryInteraction}

${intent ? `
App Context:
- Category: ${intent.appCategory}
- Primary Goal: ${intent.primaryGoal}
` : ''}

Evaluate and score this concept. Be HONEST - if it's generic CRUD, score creativity LOW.

Return JSON:
{
  "scores": {
    "creativity": 0-100,
    "usability": 0-100,
    "polish": 0-100,
    "coherence": 0-100
  },
  "critique": {
    "strengths": ["string", "string"],
    "weaknesses": ["string", "string"],
    "suggestions": ["string", "string"]
  }
}`;

    try {
      return await this.callLLMJSON<{
        scores: DesignConcept['scores'];
        critique: DesignConcept['critique'];
      }>(
        [
          { role: 'system', content: DESIGN_CRITIQUE_PROMPT },
          { role: 'user', content: prompt },
        ],
        '{"scores": {...}, "critique": {...}}'
      );
    } catch (error) {
      this.log('Critique failed, using heuristic scores', { error });
      return this.heuristicCritique(concept);
    }
  }

  /**
   * Heuristic critique when LLM fails
   */
  private heuristicCritique(concept: DesignConcept): {
    scores: DesignConcept['scores'];
    critique: DesignConcept['critique'];
  } {
    // Check for generic CRUD patterns
    const hasForm = JSON.stringify(concept.layout).includes('"form"');
    const hasTable = JSON.stringify(concept.layout).includes('"table"');
    const isGenericCRUD = hasForm && hasTable;

    const creativity = isGenericCRUD ? 30 : 60;
    const usability = 70; // Assume decent usability
    const polish = concept.aesthetics ? 70 : 50;
    const coherence = 60;

    return {
      scores: { creativity, usability, polish, coherence },
      critique: {
        strengths: ['Clear structure', 'Functional'],
        weaknesses: isGenericCRUD ? ['Generic CRUD pattern', 'Not distinctive'] : [],
        suggestions: isGenericCRUD ? ['Consider a more creative primary view'] : [],
      },
    };
  }

  /**
   * Refine concepts based on critiques
   */
  private async refineConcepts(
    concepts: DesignConcept[],
    userRequest: string,
    schema: Schema
  ): Promise<DesignConcept[]> {
    // Sort by creativity score
    const sortedConcepts = [...concepts].sort((a, b) => 
      b.scores.creativity - a.scores.creativity
    );

    // Take top 2 and try to improve them
    const topConcepts = sortedConcepts.slice(0, 2);
    const refinedConcepts: DesignConcept[] = [];

    for (const concept of topConcepts) {
      if (concept.scores.creativity < this.creativityThreshold) {
        const refined = await this.improveConcept(concept, userRequest, schema);
        refinedConcepts.push(refined);
      } else {
        refinedConcepts.push(concept);
      }
    }

    return refinedConcepts;
  }

  /**
   * Improve a concept based on its critique
   */
  private async improveConcept(
    concept: DesignConcept,
    userRequest: string,
    schema: Schema
  ): Promise<DesignConcept> {
    const prompt = `Improve this design concept to be MORE CREATIVE:

Current Concept: ${concept.name}
Current Description: ${concept.description}
Current Creativity Score: ${concept.scores.creativity}

Weaknesses to Address:
${concept.critique.weaknesses.join('\n')}

Suggestions:
${concept.critique.suggestions.join('\n')}

User's Request: "${userRequest}"

Create an IMPROVED version that:
1. Addresses the weaknesses
2. Increases creativity (avoid generic CRUD)
3. Better serves the user's actual needs

Return improved concept as JSON:
{
  "name": "Improved Name",
  "description": "Improved description",
  "primaryComponent": { "type": "string", "description": "string" },
  "secondaryComponents": [...],
  "interactionPattern": "string",
  "whyBetter": "What makes this better"
}`;

    try {
      const improved = await this.callLLMJSON<{
        name: string;
        description: string;
        primaryComponent: { type: string; description: string };
        secondaryComponents: Array<{ type: string; description: string }>;
        interactionPattern: string;
        whyBetter: string;
      }>(
        [
          { role: 'system', content: DESIGN_EXPLORATION_PROMPT },
          { role: 'user', content: prompt },
        ],
        '{"name": "...", ...}'
      );

      return this.conceptToDesign(
        { ...improved, whyDifferent: improved.whyBetter },
        schema
      );
    } catch (error) {
      this.log('Concept improvement failed', { error });
      return concept;
    }
  }

  /**
   * Synthesize final design from all concepts
   */
  private async synthesizeFinalDesign(
    concepts: DesignConcept[],
    userRequest: string,
    schema: Schema,
    intent?: EnhancedIntent
  ): Promise<DesignConcept> {
    const prompt = `Synthesize an OPTIMAL final design from these concepts:

User Request: "${userRequest}"

Concepts and Scores:
${concepts.map(c => `
- ${c.name} (creativity: ${c.scores.creativity}, usability: ${c.scores.usability})
  Strengths: ${c.critique.strengths.join(', ')}
  Weaknesses: ${c.critique.weaknesses.join(', ')}
`).join('\n')}

Create a FINAL design that:
1. Takes the best creative elements
2. Achieves at least 75 creativity score
3. Serves the user's needs excellently
4. Feels polished and cohesive

Return the synthesized concept as JSON:
{
  "name": "Final Design Name",
  "description": "Why this synthesis is optimal",
  "primaryComponent": { "type": "string", "description": "string" },
  "secondaryComponents": [...],
  "interactionPattern": "string",
  "synthesizedFrom": ["concept names used"]
}`;

    try {
      const synthesized = await this.callLLMJSON<{
        name: string;
        description: string;
        primaryComponent: { type: string; description: string };
        secondaryComponents: Array<{ type: string; description: string }>;
        interactionPattern: string;
        synthesizedFrom: string[];
      }>(
        [
          { role: 'system', content: DESIGN_SYNTHESIS_PROMPT },
          { role: 'user', content: prompt },
        ],
        '{"name": "...", ...}'
      );

      const finalConcept = this.conceptToDesign(
        { ...synthesized, whyDifferent: `Synthesized from: ${synthesized.synthesizedFrom.join(', ')}` },
        schema,
        intent
      );

      // Re-critique the synthesized design
      const finalCritique = await this.critiqueConcept(finalConcept, userRequest, intent);
      finalConcept.scores = finalCritique.scores;
      finalConcept.critique = finalCritique.critique;
      finalConcept.confidence = this.calculateConfidence(finalCritique.scores);
      finalConcept.recommended = true;

      return finalConcept;
    } catch (error) {
      this.log('Synthesis failed, returning best concept', { error });
      const best = concepts.reduce((a, b) => 
        a.scores.creativity > b.scores.creativity ? a : b
      );
      best.recommended = true;
      return best;
    }
  }

  /**
   * Generate fallback concepts when LLM fails
   */
  private generateFallbackConcepts(
    schema: Schema,
    intent?: EnhancedIntent
  ): DesignConcept[] {
    const concepts: DesignConcept[] = [];
    const category = intent?.appCategory || 'generic';

    // Concept 1: Primary view focus
    concepts.push({
      id: generateId(),
      name: 'Primary View Focus',
      description: 'A layout focused on the most important view for this app type',
      layout: this.buildLayoutFromConcept({
        primaryComponent: { type: this.getPrimaryComponentForCategory(category), description: 'Main view' },
        secondaryComponents: [{ type: 'action-button', description: 'Quick add' }],
      }, schema),
      aesthetics: this.generateAesthetics('Primary Focus'),
      capabilities: {
        needsDataEntry: true,
        needsDataList: true,
        needsDataVisualization: false,
        needsCRUD: false,
        needsRealtime: false,
        customViews: [],
        primaryInteraction: 'track',
        dataOperations: [{ type: 'read', description: 'View data', isPrimary: true }],
      },
      scores: { creativity: 50, usability: 70, polish: 60, coherence: 65 },
      critique: { strengths: ['Clean'], weaknesses: ['Could be more creative'], suggestions: [] },
      recommended: false,
      confidence: 0.5,
    });

    return concepts;
  }

  /**
   * Get primary component type for category
   */
  private getPrimaryComponentForCategory(category: string): string {
    const categoryComponents: Record<string, string> = {
      tracker: 'heatmap',
      crm: 'cards',
      dashboard: 'stats',
      workflow: 'kanban',
      content: 'gallery',
      inventory: 'table',
      social: 'timeline',
      generic: 'cards',
    };
    return categoryComponents[category] || 'cards';
  }

  /**
   * Calculate confidence from scores
   */
  private calculateConfidence(scores: DesignConcept['scores']): number {
    const total = this.calculateTotalScore(scores);
    return total / 100;
  }

  /**
   * Calculate total score from component scores
   */
  private calculateTotalScore(scores: DesignConcept['scores']): number {
    // Weighted average: creativity is most important
    return Math.round(
      scores.creativity * 0.4 +
      scores.usability * 0.3 +
      scores.polish * 0.15 +
      scores.coherence * 0.15
    );
  }

  /**
   * Process method for AgentResponse interface
   */
  async process(
    message: string,
    state: ConversationState
  ): Promise<AgentResponse> {
    if (state.schemas.length === 0) {
      return {
        success: false,
        message: 'Need a schema before exploring designs',
        requiresUserInput: true,
      };
    }

    const result = await this.explore(
      message,
      state.schemas[0],
      (state as any).enhancedIntent
    );

    return {
      success: true,
      message: `Explored ${result.concepts.length} design concepts over ${result.iterations} iteration(s). ` +
        `Selected "${result.selectedConcept.name}" with creativity score ${result.selectedConcept.scores.creativity}.`,
      data: result,
      requiresUserInput: false,
    };
  }
}

// Export singleton instance
export const designExplorerAgent = new DesignExplorerAgent();
