/**
 * Creative Quality Gate
 * Evaluates design creativity and blocks generic CRUD patterns
 * Ensures apps meet quality thresholds before building
 */

import type { 
  LayoutNode, 
  Schema, 
  AppCapabilities,
  AestheticSpec,
  ComponentType,
} from './types';

// ============================================================================
// Quality Gate Types
// ============================================================================

export interface QualityScore {
  /** Overall quality score (0-100) */
  overall: number;
  /** Creativity/uniqueness score (0-100) */
  creativity: number;
  /** How well it serves user needs (0-100) */
  usability: number;
  /** Visual polish and coherence (0-100) */
  polish: number;
  /** Whether it passes the minimum threshold */
  passes: boolean;
}

export interface QualityReport {
  score: QualityScore;
  /** Detected issues that lower quality */
  issues: QualityIssue[];
  /** Positive aspects of the design */
  strengths: string[];
  /** Specific suggestions for improvement */
  suggestions: string[];
  /** Whether this is considered a generic CRUD pattern */
  isGenericCRUD: boolean;
  /** Detailed breakdown by category */
  breakdown: {
    layoutScore: number;
    componentDiversity: number;
    aestheticScore: number;
    capabilityScore: number;
  };
}

export interface QualityIssue {
  type: 'critical' | 'warning' | 'info';
  category: 'layout' | 'components' | 'aesthetics' | 'capabilities';
  message: string;
  suggestion?: string;
}

// ============================================================================
// Quality Gate Configuration
// ============================================================================

export interface QualityGateConfig {
  /** Minimum overall score to pass (default: 60) */
  minOverallScore: number;
  /** Minimum creativity score to pass (default: 50) */
  minCreativityScore: number;
  /** Whether to block generic CRUD patterns */
  blockGenericCRUD: boolean;
  /** Whether to require aesthetics */
  requireAesthetics: boolean;
}

const DEFAULT_CONFIG: QualityGateConfig = {
  minOverallScore: 60,
  minCreativityScore: 50,
  blockGenericCRUD: true,
  requireAesthetics: true,
};

// ============================================================================
// Generic CRUD Detection Patterns
// ============================================================================

const GENERIC_CRUD_PATTERNS = {
  /** Layout patterns that indicate generic CRUD */
  layouts: [
    // Form on left/top, table on right/bottom
    { pattern: 'form-table-split', penalty: 30 },
    // Just form and table, nothing else
    { pattern: 'form-table-only', penalty: 40 },
    // Standard dashboard with form
    { pattern: 'standard-dashboard', penalty: 20 },
  ],
  
  /** Component combinations that indicate generic CRUD */
  componentCombos: [
    { components: ['form', 'table'], penalty: 25, message: 'Standard form+table combination' },
    { components: ['form', 'table', 'filters'], penalty: 20, message: 'Basic CRUD with filters' },
  ],
  
  /** Capability patterns that indicate generic CRUD */
  capabilities: [
    { pattern: 'full-crud', penalty: 15, message: 'Full CRUD operations without specialization' },
  ],
};

// ============================================================================
// Creative Quality Gate Class
// ============================================================================

export class CreativeQualityGate {
  private config: QualityGateConfig;

  constructor(config: Partial<QualityGateConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Evaluate a design and return a quality report
   */
  evaluate(
    layout: LayoutNode,
    schema: Schema,
    capabilities?: AppCapabilities,
    aesthetics?: AestheticSpec
  ): QualityReport {
    const issues: QualityIssue[] = [];
    const strengths: string[] = [];
    const suggestions: string[] = [];

    // Evaluate each aspect
    const layoutScore = this.evaluateLayout(layout, issues, strengths, suggestions);
    const componentDiversity = this.evaluateComponentDiversity(layout, issues, strengths, suggestions);
    const aestheticScore = this.evaluateAesthetics(aesthetics, issues, strengths, suggestions);
    const capabilityScore = this.evaluateCapabilities(capabilities, issues, strengths, suggestions);

    // Calculate scores
    const creativity = this.calculateCreativityScore(
      layout, 
      componentDiversity, 
      capabilities,
      issues
    );
    
    const usability = this.calculateUsabilityScore(
      layout, 
      schema, 
      capabilities
    );
    
    const polish = this.calculatePolishScore(
      aestheticScore, 
      componentDiversity,
      layout
    );

    // Weighted overall score
    const overall = Math.round(
      creativity * 0.35 +
      usability * 0.30 +
      polish * 0.20 +
      capabilityScore * 0.15
    );

    // Check if it's generic CRUD
    const isGenericCRUD = this.detectGenericCRUD(layout, capabilities);
    
    // Apply generic CRUD penalty
    const finalCreativity = isGenericCRUD ? Math.max(0, creativity - 20) : creativity;
    const finalOverall = isGenericCRUD ? Math.max(0, overall - 15) : overall;

    // Determine if it passes
    const passes = 
      finalOverall >= this.config.minOverallScore &&
      finalCreativity >= this.config.minCreativityScore &&
      (!this.config.blockGenericCRUD || !isGenericCRUD);

    // Add generic CRUD issue if detected
    if (isGenericCRUD) {
      issues.unshift({
        type: 'critical',
        category: 'layout',
        message: 'Design follows a generic CRUD pattern (form + table)',
        suggestion: 'Consider a more creative primary view like heatmap, timeline, or cards',
      });
    }

    return {
      score: {
        overall: finalOverall,
        creativity: finalCreativity,
        usability,
        polish,
        passes,
      },
      issues,
      strengths,
      suggestions,
      isGenericCRUD,
      breakdown: {
        layoutScore,
        componentDiversity,
        aestheticScore,
        capabilityScore,
      },
    };
  }

  /**
   * Quick check if a design passes the quality gate
   */
  passes(
    layout: LayoutNode,
    schema: Schema,
    capabilities?: AppCapabilities,
    aesthetics?: AestheticSpec
  ): boolean {
    const report = this.evaluate(layout, schema, capabilities, aesthetics);
    return report.score.passes;
  }

  /**
   * Get a simple pass/fail message
   */
  getGateMessage(report: QualityReport): string {
    if (report.score.passes) {
      return `Design passes quality gate (score: ${report.score.overall}/100, creativity: ${report.score.creativity}/100)`;
    }

    const reasons: string[] = [];
    
    if (report.score.overall < this.config.minOverallScore) {
      reasons.push(`overall score ${report.score.overall} < ${this.config.minOverallScore}`);
    }
    if (report.score.creativity < this.config.minCreativityScore) {
      reasons.push(`creativity score ${report.score.creativity} < ${this.config.minCreativityScore}`);
    }
    if (report.isGenericCRUD && this.config.blockGenericCRUD) {
      reasons.push('generic CRUD pattern detected');
    }

    return `Design does not pass quality gate: ${reasons.join(', ')}`;
  }

  // ============================================================================
  // Evaluation Methods
  // ============================================================================

  private evaluateLayout(
    layout: LayoutNode,
    issues: QualityIssue[],
    strengths: string[],
    suggestions: string[]
  ): number {
    let score = 50; // Base score

    // Count components
    const components = this.extractComponents(layout);
    const componentCount = components.length;

    // Reward component variety
    if (componentCount >= 3) {
      score += 15;
      strengths.push(`Good component variety (${componentCount} components)`);
    } else if (componentCount < 2) {
      score -= 10;
      suggestions.push('Consider adding more components for a richer experience');
    }

    // Check for nested containers (indicates more complex layout)
    const nestingDepth = this.getMaxNestingDepth(layout);
    if (nestingDepth >= 2) {
      score += 10;
      strengths.push('Good layout structure with meaningful nesting');
    }

    // Check for responsive configuration
    if (layout.container?.responsive) {
      score += 10;
      strengths.push('Responsive design configured');
    }

    // Check for sizing configuration
    const hasSizing = this.checkForSizing(layout);
    if (hasSizing) {
      score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  private evaluateComponentDiversity(
    layout: LayoutNode,
    issues: QualityIssue[],
    strengths: string[],
    suggestions: string[]
  ): number {
    const components = this.extractComponents(layout);
    const uniqueTypes = new Set(components.map(c => c.type));
    
    let score = 30; // Base score

    // Reward unique component types
    score += uniqueTypes.size * 10;

    // Check for creative components
    const creativeTypes: ComponentType[] = ['heatmap', 'timeline', 'gallery', 'kanban', 'calendar'];
    const hasCreativeComponent = components.some(c => creativeTypes.includes(c.type));
    
    if (hasCreativeComponent) {
      score += 25;
      strengths.push('Uses creative component types');
    } else {
      suggestions.push('Consider using creative components like heatmap, timeline, or gallery');
    }

    // Penalty for only having form and table
    const onlyFormAndTable = 
      uniqueTypes.size === 2 && 
      uniqueTypes.has('form') && 
      uniqueTypes.has('table');
    
    if (onlyFormAndTable) {
      score -= 20;
      issues.push({
        type: 'warning',
        category: 'components',
        message: 'Only form and table components - consider more variety',
        suggestion: 'Add visualization or specialized components',
      });
    }

    return Math.min(100, Math.max(0, score));
  }

  private evaluateAesthetics(
    aesthetics: AestheticSpec | undefined,
    issues: QualityIssue[],
    strengths: string[],
    suggestions: string[]
  ): number {
    if (!aesthetics) {
      if (this.config.requireAesthetics) {
        issues.push({
          type: 'warning',
          category: 'aesthetics',
          message: 'No aesthetic specification provided',
          suggestion: 'Add theme, colors, and typography for a polished look',
        });
      }
      return 30; // Base score without aesthetics
    }

    let score = 50; // Base score with aesthetics

    // Check for complete aesthetic specification
    if (aesthetics.theme) {
      score += 10;
      strengths.push(`Theme: ${aesthetics.theme}`);
    }

    if (aesthetics.typography?.heading && aesthetics.typography?.body) {
      score += 10;
      strengths.push('Custom typography defined');
    }

    if (aesthetics.colorPalette?.primary && aesthetics.colorPalette?.accent) {
      score += 10;
      strengths.push('Color palette defined');
    }

    if (aesthetics.motion?.pageLoadStrategy) {
      score += 10;
      strengths.push('Animations configured');
    }

    if (aesthetics.backgroundStyle?.layers?.length) {
      score += 10;
      strengths.push('Atmospheric background defined');
    }

    return Math.min(100, Math.max(0, score));
  }

  private evaluateCapabilities(
    capabilities: AppCapabilities | undefined,
    issues: QualityIssue[],
    strengths: string[],
    suggestions: string[]
  ): number {
    if (!capabilities) {
      return 50; // Neutral score without capabilities
    }

    let score = 50; // Base score

    // Reward specialized capabilities
    if (!capabilities.needsCRUD) {
      score += 15;
      strengths.push('Not using full CRUD - specialized approach');
    }

    if (capabilities.customViews?.length) {
      score += 20;
      strengths.push(`${capabilities.customViews.length} custom view(s) defined`);
    }

    if (capabilities.primaryInteraction !== 'manage') {
      score += 10;
      strengths.push(`Focused primary interaction: ${capabilities.primaryInteraction}`);
    }

    // Check for over-reliance on CRUD
    if (capabilities.needsCRUD && capabilities.needsDataEntry && capabilities.needsDataList) {
      score -= 10;
      suggestions.push('Consider if full CRUD is really needed for this app');
    }

    return Math.min(100, Math.max(0, score));
  }

  // ============================================================================
  // Score Calculation Methods
  // ============================================================================

  private calculateCreativityScore(
    layout: LayoutNode,
    componentDiversity: number,
    capabilities: AppCapabilities | undefined,
    issues: QualityIssue[]
  ): number {
    let score = componentDiversity;

    // Bonus for avoiding CRUD
    if (capabilities && !capabilities.needsCRUD) {
      score += 15;
    }

    // Penalty for each critical issue
    const criticalIssues = issues.filter(i => i.type === 'critical').length;
    score -= criticalIssues * 15;

    // Check for creative primary component
    const components = this.extractComponents(layout);
    const primaryComponent = components.find(c => (c.props as any)?.isPrimary);
    const creativeTypes: ComponentType[] = ['heatmap', 'timeline', 'gallery', 'kanban', 'calendar'];
    
    if (primaryComponent && creativeTypes.includes(primaryComponent.type)) {
      score += 20;
    }

    return Math.min(100, Math.max(0, score));
  }

  private calculateUsabilityScore(
    layout: LayoutNode,
    schema: Schema,
    capabilities: AppCapabilities | undefined
  ): number {
    let score = 60; // Base score

    const components = this.extractComponents(layout);
    const componentTypes = new Set(components.map(c => c.type));

    // Check if the layout serves the schema's data needs
    const hasNumericFields = schema.fields.some(f => f.type === 'number');
    const hasDateFields = schema.fields.some(f => f.type === 'date' || f.type === 'datetime');
    const hasEnumFields = schema.fields.some(f => f.type === 'enum');

    // Reward appropriate component choices
    if (hasNumericFields && (componentTypes.has('chart') || componentTypes.has('stats'))) {
      score += 10;
    }
    if (hasDateFields && (componentTypes.has('calendar') || componentTypes.has('timeline') || componentTypes.has('heatmap'))) {
      score += 10;
    }
    if (hasEnumFields && componentTypes.has('kanban')) {
      score += 10;
    }

    // Check for data entry if capabilities require it
    if (capabilities?.needsDataEntry && componentTypes.has('form')) {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  private calculatePolishScore(
    aestheticScore: number,
    componentDiversity: number,
    layout: LayoutNode
  ): number {
    let score = aestheticScore * 0.5 + componentDiversity * 0.3;

    // Bonus for consistent configuration
    if (layout.container?.gap && layout.container?.padding) {
      score += 10;
    }

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  // ============================================================================
  // Detection Methods
  // ============================================================================

  private detectGenericCRUD(
    layout: LayoutNode,
    capabilities?: AppCapabilities
  ): boolean {
    const components = this.extractComponents(layout);
    const componentTypes = components.map(c => c.type);

    // Pattern 1: Only form and table
    if (
      componentTypes.length === 2 &&
      componentTypes.includes('form') &&
      componentTypes.includes('table')
    ) {
      return true;
    }

    // Pattern 2: Form, table, and filters only
    if (
      componentTypes.length === 3 &&
      componentTypes.includes('form') &&
      componentTypes.includes('table') &&
      componentTypes.includes('filters')
    ) {
      return true;
    }

    // Pattern 3: Full CRUD capabilities with standard layout
    if (
      capabilities?.needsCRUD &&
      componentTypes.includes('form') &&
      componentTypes.includes('table') &&
      !componentTypes.some(t => ['heatmap', 'timeline', 'gallery', 'kanban', 'calendar'].includes(t))
    ) {
      return true;
    }

    return false;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private extractComponents(layout: LayoutNode): Array<{ type: ComponentType; props: unknown }> {
    const components: Array<{ type: ComponentType; props: unknown }> = [];

    const traverse = (node: LayoutNode) => {
      if (node.type === 'component' && node.component) {
        components.push({
          type: node.component.type,
          props: node.component.props,
        });
      }
      if (node.type === 'container' && node.container?.children) {
        for (const child of node.container.children) {
          traverse(child);
        }
      }
    };

    traverse(layout);
    return components;
  }

  private getMaxNestingDepth(layout: LayoutNode, currentDepth = 0): number {
    if (layout.type === 'component') {
      return currentDepth;
    }

    if (layout.type === 'container' && layout.container?.children) {
      let maxChildDepth = currentDepth;
      for (const child of layout.container.children) {
        const childDepth = this.getMaxNestingDepth(child, currentDepth + 1);
        maxChildDepth = Math.max(maxChildDepth, childDepth);
      }
      return maxChildDepth;
    }

    return currentDepth;
  }

  private checkForSizing(layout: LayoutNode): boolean {
    if (layout.sizing) return true;

    if (layout.type === 'container' && layout.container?.children) {
      for (const child of layout.container.children) {
        if (this.checkForSizing(child)) return true;
      }
    }

    return false;
  }
}

// Export singleton instance with default config
export const creativeQualityGate = new CreativeQualityGate();

// Export a strict version that requires higher creativity
export const strictQualityGate = new CreativeQualityGate({
  minOverallScore: 70,
  minCreativityScore: 65,
  blockGenericCRUD: true,
  requireAesthetics: true,
});
