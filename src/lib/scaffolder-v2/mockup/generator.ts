/**
 * Mockup Generator
 * Generates SVG wireframes for visual previews
 */

import type { 
  LayoutNode, 
  Schema, 
  MockupData, 
  ComponentType,
} from '../types';

// SVG dimensions
const MOCKUP_WIDTH = 400;
const MOCKUP_HEIGHT = 300;
const PADDING = 16;
const COMPONENT_GAP = 12;

// Color palette (dark theme)
const COLORS = {
  background: '#0a0a0a',
  card: '#1a1a1a',
  cardHover: '#252525',
  border: '#333',
  accent: '#f43f5e',
  accentLight: 'rgba(244, 63, 94, 0.2)',
  text: '#fff',
  textMuted: '#888',
  input: '#2a2a2a',
};

export class MockupGenerator {
  /**
   * Generate SVG mockup from layout
   */
  generateSVG(layout: LayoutNode, schema: Schema, title?: string): MockupData {
    const elements: string[] = [];
    
    // Background
    elements.push(`
      <rect width="${MOCKUP_WIDTH}" height="${MOCKUP_HEIGHT}" fill="${COLORS.background}" rx="8"/>
    `);
    
    // Header
    elements.push(this.renderHeader(title || schema.label));
    
    // Content area
    const contentY = 50;
    const contentHeight = MOCKUP_HEIGHT - contentY - PADDING;
    
    this.renderLayoutNode(
      layout,
      elements,
      { x: PADDING, y: contentY, width: MOCKUP_WIDTH - (PADDING * 2), height: contentHeight }
    );
    
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MOCKUP_WIDTH} ${MOCKUP_HEIGHT}">
        <defs>
          <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:${COLORS.accent};stop-opacity:1" />
            <stop offset="100%" style="stop-color:#ec4899;stop-opacity:1" />
          </linearGradient>
        </defs>
        ${elements.join('\n')}
      </svg>
    `.trim();

    return {
      type: 'svg',
      content: svg,
      annotations: this.extractAnnotations(layout),
    };
  }

  /**
   * Render header section
   */
  private renderHeader(title: string): string {
    return `
      <rect x="0" y="0" width="${MOCKUP_WIDTH}" height="44" fill="${COLORS.card}"/>
      <text x="${PADDING}" y="28" fill="${COLORS.text}" font-family="system-ui, sans-serif" font-size="14" font-weight="600">${this.escapeXml(title)}</text>
      <line x1="0" y1="44" x2="${MOCKUP_WIDTH}" y2="44" stroke="${COLORS.border}" stroke-width="1"/>
    `;
  }

  /**
   * Render layout node recursively
   */
  private renderLayoutNode(
    node: LayoutNode,
    elements: string[],
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    if (node.type === 'component' && node.component) {
      this.renderComponent(node.component.type, elements, bounds);
      return;
    }

    if (node.type === 'container' && node.container) {
      const { direction, children, gap } = node.container;
      const gapSize = parseInt(gap || '12') || COMPONENT_GAP;
      
      if (!children || children.length === 0) return;

      if (direction === 'row') {
        this.renderRowContainer(children, elements, bounds, gapSize);
      } else {
        this.renderColumnContainer(children, elements, bounds, gapSize);
      }
    }
  }

  /**
   * Render row container
   */
  private renderRowContainer(
    children: LayoutNode[],
    elements: string[],
    bounds: { x: number; y: number; width: number; height: number },
    gap: number
  ): void {
    const childCount = children.length;
    const totalGap = (childCount - 1) * gap;
    const childWidth = (bounds.width - totalGap) / childCount;

    let x = bounds.x;
    for (const child of children) {
      const sizing = child.sizing;
      let width = childWidth;
      
      // Respect fixed sizing
      if (sizing?.basis && sizing.basis.endsWith('px')) {
        width = Math.min(parseInt(sizing.basis), bounds.width / 2);
      }
      
      this.renderLayoutNode(child, elements, {
        x,
        y: bounds.y,
        width,
        height: bounds.height,
      });
      
      x += width + gap;
    }
  }

  /**
   * Render column container
   */
  private renderColumnContainer(
    children: LayoutNode[],
    elements: string[],
    bounds: { x: number; y: number; width: number; height: number },
    gap: number
  ): void {
    const childCount = children.length;
    const totalGap = (childCount - 1) * gap;
    const childHeight = Math.min(80, (bounds.height - totalGap) / childCount);

    let y = bounds.y;
    for (const child of children) {
      this.renderLayoutNode(child, elements, {
        x: bounds.x,
        y,
        width: bounds.width,
        height: childHeight,
      });
      
      y += childHeight + gap;
    }
  }

  /**
   * Render individual component
   */
  private renderComponent(
    type: ComponentType,
    elements: string[],
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    switch (type) {
      case 'form':
        this.renderFormMockup(elements, bounds);
        break;
      case 'table':
        this.renderTableMockup(elements, bounds);
        break;
      case 'chart':
        this.renderChartMockup(elements, bounds);
        break;
      case 'stats':
        this.renderStatsMockup(elements, bounds);
        break;
      case 'kanban':
        this.renderKanbanMockup(elements, bounds);
        break;
      case 'cards':
        this.renderCardsMockup(elements, bounds);
        break;
      default:
        this.renderGenericMockup(type, elements, bounds);
    }
  }

  /**
   * Render form mockup
   */
  private renderFormMockup(
    elements: string[],
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    const { x, y, width, height } = bounds;
    const inputHeight = 20;
    const labelHeight = 12;
    const fieldGap = 8;
    
    // Card background
    elements.push(`
      <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${COLORS.card}" rx="6"/>
    `);
    
    // Title
    elements.push(`
      <text x="${x + 10}" y="${y + 18}" fill="${COLORS.textMuted}" font-family="system-ui, sans-serif" font-size="10">Add Entry</text>
    `);
    
    // Input fields (simplified)
    let fieldY = y + 28;
    const maxFields = Math.floor((height - 50) / (inputHeight + labelHeight + fieldGap));
    
    for (let i = 0; i < Math.min(3, maxFields); i++) {
      // Input box
      elements.push(`
        <rect x="${x + 8}" y="${fieldY}" width="${width - 16}" height="${inputHeight}" fill="${COLORS.input}" rx="3"/>
      `);
      fieldY += inputHeight + fieldGap;
    }
    
    // Submit button
    if (height > 80) {
      elements.push(`
        <rect x="${x + 8}" y="${y + height - 28}" width="${width - 16}" height="${20}" fill="url(#accentGradient)" rx="4"/>
        <text x="${x + width/2}" y="${y + height - 14}" fill="${COLORS.text}" font-family="system-ui, sans-serif" font-size="9" text-anchor="middle">Add</text>
      `);
    }
  }

  /**
   * Render table mockup
   */
  private renderTableMockup(
    elements: string[],
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    const { x, y, width, height } = bounds;
    const rowHeight = 20;
    
    // Card background
    elements.push(`
      <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${COLORS.card}" rx="6"/>
    `);
    
    // Header row
    elements.push(`
      <rect x="${x}" y="${y}" width="${width}" height="${rowHeight}" fill="${COLORS.cardHover}" rx="6"/>
    `);
    
    // Header columns
    const colWidth = (width - 16) / 3;
    for (let i = 0; i < 3; i++) {
      elements.push(`
        <rect x="${x + 8 + (i * colWidth)}" y="${y + 6}" width="${colWidth - 8}" height="8" fill="${COLORS.input}" rx="2"/>
      `);
    }
    
    // Data rows
    const maxRows = Math.floor((height - rowHeight - 10) / rowHeight);
    for (let row = 0; row < Math.min(4, maxRows); row++) {
      const rowY = y + rowHeight + 4 + (row * rowHeight);
      
      // Row separator
      if (row > 0) {
        elements.push(`
          <line x1="${x + 8}" y1="${rowY}" x2="${x + width - 8}" y2="${rowY}" stroke="${COLORS.border}" stroke-width="0.5"/>
        `);
      }
      
      // Cell content
      for (let col = 0; col < 3; col++) {
        const cellWidth = colWidth * (col === 0 ? 0.8 : 0.5);
        elements.push(`
          <rect x="${x + 8 + (col * colWidth)}" y="${rowY + 6}" width="${cellWidth}" height="6" fill="${COLORS.input}" rx="2"/>
        `);
      }
    }
  }

  /**
   * Render chart mockup
   */
  private renderChartMockup(
    elements: string[],
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    const { x, y, width, height } = bounds;
    
    // Card background
    elements.push(`
      <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${COLORS.card}" rx="6"/>
    `);
    
    // Chart title
    elements.push(`
      <text x="${x + 10}" y="${y + 16}" fill="${COLORS.textMuted}" font-family="system-ui, sans-serif" font-size="9">Analytics</text>
    `);
    
    // Bar chart
    const chartX = x + 10;
    const chartY = y + 26;
    const chartWidth = width - 20;
    const chartHeight = height - 36;
    const barCount = 5;
    const barWidth = (chartWidth - (barCount * 4)) / barCount;
    
    for (let i = 0; i < barCount; i++) {
      const barHeight = (0.3 + Math.random() * 0.7) * chartHeight;
      const barX = chartX + (i * (barWidth + 4));
      const barY = chartY + chartHeight - barHeight;
      
      elements.push(`
        <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" fill="${i === 2 ? COLORS.accent : COLORS.accentLight}" rx="2"/>
      `);
    }
  }

  /**
   * Render stats mockup
   */
  private renderStatsMockup(
    elements: string[],
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    const { x, y, width, height } = bounds;
    const statCount = 3;
    const statWidth = (width - (statCount + 1) * 8) / statCount;
    
    for (let i = 0; i < statCount; i++) {
      const statX = x + 8 + (i * (statWidth + 8));
      
      // Stat card
      elements.push(`
        <rect x="${statX}" y="${y}" width="${statWidth}" height="${height}" fill="${COLORS.card}" rx="6"/>
      `);
      
      // Number
      elements.push(`
        <text x="${statX + statWidth/2}" y="${y + height/2}" fill="${COLORS.text}" font-family="system-ui, sans-serif" font-size="16" font-weight="600" text-anchor="middle">${Math.floor(Math.random() * 100)}</text>
      `);
      
      // Label
      elements.push(`
        <rect x="${statX + 8}" y="${y + height - 14}" width="${statWidth - 16}" height="6" fill="${COLORS.input}" rx="2"/>
      `);
    }
  }

  /**
   * Render kanban mockup
   */
  private renderKanbanMockup(
    elements: string[],
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    const { x, y, width, height } = bounds;
    const colCount = 3;
    const colWidth = (width - (colCount + 1) * 8) / colCount;
    const colLabels = ['To Do', 'Doing', 'Done'];
    
    for (let i = 0; i < colCount; i++) {
      const colX = x + 8 + (i * (colWidth + 8));
      
      // Column background
      elements.push(`
        <rect x="${colX}" y="${y}" width="${colWidth}" height="${height}" fill="${COLORS.card}" rx="6"/>
      `);
      
      // Column header
      elements.push(`
        <text x="${colX + 8}" y="${y + 14}" fill="${COLORS.textMuted}" font-family="system-ui, sans-serif" font-size="8">${colLabels[i]}</text>
      `);
      
      // Cards in column
      const cardCount = 2 - i; // More cards in first column
      for (let j = 0; j <= cardCount; j++) {
        const cardY = y + 22 + (j * 24);
        elements.push(`
          <rect x="${colX + 4}" y="${cardY}" width="${colWidth - 8}" height="20" fill="${COLORS.cardHover}" rx="3"/>
          <rect x="${colX + 8}" y="${cardY + 6}" width="${colWidth - 20}" height="4" fill="${COLORS.input}" rx="1"/>
        `);
      }
    }
  }

  /**
   * Render cards mockup
   */
  private renderCardsMockup(
    elements: string[],
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    const { x, y, width, height } = bounds;
    const cardWidth = (width - 24) / 2;
    const cardHeight = (height - 16) / 2;
    
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const cardX = x + 8 + (col * (cardWidth + 8));
        const cardY = y + 8 + (row * (cardHeight + 8));
        
        elements.push(`
          <rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" fill="${COLORS.card}" rx="6"/>
          <rect x="${cardX + 8}" y="${cardY + 10}" width="${cardWidth - 16}" height="8" fill="${COLORS.input}" rx="2"/>
          <rect x="${cardX + 8}" y="${cardY + 24}" width="${cardWidth - 32}" height="6" fill="${COLORS.input}" rx="2"/>
        `);
      }
    }
  }

  /**
   * Render generic component mockup
   */
  private renderGenericMockup(
    type: string,
    elements: string[],
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    const { x, y, width, height } = bounds;
    
    elements.push(`
      <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${COLORS.card}" rx="6"/>
      <text x="${x + width/2}" y="${y + height/2}" fill="${COLORS.textMuted}" font-family="system-ui, sans-serif" font-size="10" text-anchor="middle">${type}</text>
    `);
  }

  /**
   * Extract annotations from layout
   */
  private extractAnnotations(layout: LayoutNode): MockupData['annotations'] {
    const annotations: MockupData['annotations'] = [];
    
    const extract = (node: LayoutNode) => {
      if (node.type === 'component' && node.component) {
        annotations?.push({
          component: node.component.type,
          description: this.getComponentDescription(node.component.type),
        });
      }
      
      if (node.type === 'container' && node.container?.children) {
        for (const child of node.container.children) {
          extract(child);
        }
      }
    };
    
    extract(layout);
    return annotations;
  }

  /**
   * Get component description
   */
  private getComponentDescription(type: ComponentType): string {
    const descriptions: Record<ComponentType, string> = {
      form: 'Data entry form for adding new items',
      table: 'Table view for browsing and managing data',
      chart: 'Visual chart for data analysis',
      stats: 'Key metrics and statistics',
      kanban: 'Kanban board for workflow management',
      cards: 'Card grid for visual browsing',
      calendar: 'Calendar view for date-based data',
      filters: 'Filter controls for refining data',
      custom: 'Custom component',
    };
    return descriptions[type] || type;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// Export singleton instance
export const mockupGenerator = new MockupGenerator();
