/**
 * Layout DSL - Domain Specific Language for layouts
 * Provides utilities for working with layout trees
 */

import { generateId } from '@/lib/utils';
import type { 
  LayoutNode, 
  ComponentType, 
  ContainerDirection,
  ResponsiveConfig,
  SizingConfig,
  ComponentConfig,
} from '../types';

/**
 * Create a container layout node
 */
export function container(
  direction: ContainerDirection,
  children: LayoutNode[],
  options: {
    responsive?: ResponsiveConfig;
    gap?: string;
    padding?: string;
    sizing?: SizingConfig;
    className?: string;
  } = {}
): LayoutNode {
  return {
    id: generateId(),
    type: 'container',
    container: {
      direction,
      children,
      responsive: options.responsive || {
        mobile: 'stack',
        tablet: 'stack',
        desktop: 'side-by-side',
      },
      gap: options.gap || '1rem',
      padding: options.padding,
    },
    sizing: options.sizing,
    className: options.className,
  };
}

/**
 * Create a component layout node
 */
export function component(
  type: ComponentType,
  props: Record<string, unknown> = {},
  options: {
    variant?: string;
    sizing?: SizingConfig;
    sticky?: boolean;
    className?: string;
  } = {}
): LayoutNode {
  return {
    id: generateId(),
    type: 'component',
    component: {
      type,
      variant: options.variant,
      props,
      position: {
        sticky: options.sticky,
      },
    },
    sizing: options.sizing,
    className: options.className,
  };
}

/**
 * Create a row container (horizontal layout)
 */
export function row(
  children: LayoutNode[],
  options: Parameters<typeof container>[2] = {}
): LayoutNode {
  return container('row', children, options);
}

/**
 * Create a column container (vertical layout)
 */
export function column(
  children: LayoutNode[],
  options: Parameters<typeof container>[2] = {}
): LayoutNode {
  return container('column', children, options);
}

/**
 * Create a grid container
 */
export function grid(
  children: LayoutNode[],
  options: Parameters<typeof container>[2] = {}
): LayoutNode {
  return container('grid', children, {
    ...options,
    responsive: options.responsive || {
      mobile: 'stack',
      tablet: 'grid',
      desktop: 'grid',
    },
  });
}

// Pre-built component shortcuts
export const components = {
  form: (props: Record<string, unknown> = {}, sizing?: SizingConfig) => 
    component('form', props, { sizing }),
  
  table: (props: Record<string, unknown> = {}, sizing?: SizingConfig) => 
    component('table', props, { sizing }),
  
  chart: (chartType: string = 'bar', props: Record<string, unknown> = {}, sizing?: SizingConfig) => 
    component('chart', { chartType, ...props }, { sizing }),
  
  cards: (props: Record<string, unknown> = {}, sizing?: SizingConfig) => 
    component('cards', props, { sizing }),
  
  stats: (props: Record<string, unknown> = {}, sizing?: SizingConfig) => 
    component('stats', props, { sizing }),
  
  filters: (props: Record<string, unknown> = {}, sizing?: SizingConfig) => 
    component('filters', props, { sizing }),
  
  kanban: (props: Record<string, unknown> = {}, sizing?: SizingConfig) => 
    component('kanban', props, { sizing }),
  
  calendar: (props: Record<string, unknown> = {}, sizing?: SizingConfig) => 
    component('calendar', props, { sizing }),
};

// Pre-built sizing configurations
export const sizing = {
  fixed: (width: string): SizingConfig => ({
    basis: width,
    grow: 0,
    shrink: 0,
  }),
  
  flexible: (basis: string = 'auto'): SizingConfig => ({
    basis,
    grow: 1,
    shrink: 1,
  }),
  
  fill: (): SizingConfig => ({
    basis: '1fr',
    grow: 1,
    shrink: 1,
  }),
  
  sidebar: (): SizingConfig => ({
    basis: '300px',
    grow: 0,
    shrink: 0,
    minWidth: '250px',
    maxWidth: '400px',
  }),
  
  main: (): SizingConfig => ({
    basis: '1fr',
    grow: 1,
    shrink: 1,
    minWidth: '400px',
  }),
};

// Pre-built layout templates
export const templates = {
  /**
   * Simple layout: Form above table
   */
  simple: (): LayoutNode => column([
    components.form(),
    components.table(),
  ], { gap: '1.5rem', padding: '1.5rem' }),

  /**
   * Sidebar layout: Form on left, content on right
   */
  sidebar: (): LayoutNode => row([
    components.form({}, sizing.sidebar()),
    column([
      components.filters(),
      components.table(),
    ], { sizing: sizing.main() }),
  ], { gap: '1.5rem', padding: '1.5rem' }),

  /**
   * Dashboard layout: Stats at top, chart and table below
   */
  dashboard: (): LayoutNode => column([
    components.stats(),
    row([
      components.chart('bar', {}, sizing.fill()),
      components.chart('pie', {}, sizing.fill()),
    ]),
    components.table(),
  ], { gap: '1.5rem', padding: '1.5rem' }),

  /**
   * Kanban layout: Kanban board with form modal
   */
  kanban: (): LayoutNode => column([
    row([
      components.form({}, sizing.sidebar()),
      components.filters({}, sizing.flexible()),
    ]),
    components.kanban({}, sizing.fill()),
  ], { gap: '1.5rem', padding: '1.5rem' }),

  /**
   * Cards layout: Grid of cards with filters
   */
  cards: (): LayoutNode => column([
    row([
      components.form({}, sizing.sidebar()),
      components.filters({}, sizing.flexible()),
    ]),
    components.cards(),
  ], { gap: '1.5rem', padding: '1.5rem' }),
};

/**
 * Walk through a layout tree and apply a transformation
 */
export function walkLayout<T>(
  node: LayoutNode,
  visitor: (node: LayoutNode, path: string[]) => T,
  path: string[] = []
): T[] {
  const results: T[] = [visitor(node, path)];
  
  if (node.type === 'container' && node.container?.children) {
    for (let i = 0; i < node.container.children.length; i++) {
      const child = node.container.children[i];
      results.push(...walkLayout(child, visitor, [...path, `children[${i}]`]));
    }
  }
  
  return results;
}

/**
 * Find a node in the layout tree by ID
 */
export function findNode(
  root: LayoutNode,
  nodeId: string
): LayoutNode | undefined {
  if (root.id === nodeId) return root;
  
  if (root.type === 'container' && root.container?.children) {
    for (const child of root.container.children) {
      const found = findNode(child, nodeId);
      if (found) return found;
    }
  }
  
  return undefined;
}

/**
 * Update a node in the layout tree
 */
export function updateNode(
  root: LayoutNode,
  nodeId: string,
  updater: (node: LayoutNode) => LayoutNode
): LayoutNode {
  if (root.id === nodeId) {
    return updater(root);
  }
  
  if (root.type === 'container' && root.container?.children) {
    return {
      ...root,
      container: {
        ...root.container,
        children: root.container.children.map(child =>
          updateNode(child, nodeId, updater)
        ),
      },
    };
  }
  
  return root;
}

/**
 * Add a child to a container node
 */
export function addChild(
  root: LayoutNode,
  containerId: string,
  child: LayoutNode,
  position: 'start' | 'end' | number = 'end'
): LayoutNode {
  return updateNode(root, containerId, (node) => {
    if (node.type !== 'container' || !node.container) {
      return node;
    }
    
    const children = [...node.container.children];
    
    if (position === 'start') {
      children.unshift(child);
    } else if (position === 'end') {
      children.push(child);
    } else {
      children.splice(position, 0, child);
    }
    
    return {
      ...node,
      container: {
        ...node.container,
        children,
      },
    };
  });
}

/**
 * Remove a node from the layout tree
 */
export function removeNode(
  root: LayoutNode,
  nodeId: string
): LayoutNode {
  if (root.id === nodeId) {
    // Cannot remove root
    return root;
  }
  
  if (root.type === 'container' && root.container?.children) {
    return {
      ...root,
      container: {
        ...root.container,
        children: root.container.children
          .filter(child => child.id !== nodeId)
          .map(child => removeNode(child, nodeId)),
      },
    };
  }
  
  return root;
}

/**
 * Get all component nodes from a layout
 */
export function getComponents(root: LayoutNode): LayoutNode[] {
  const components: LayoutNode[] = [];
  
  walkLayout(root, (node) => {
    if (node.type === 'component') {
      components.push(node);
    }
    return null;
  });
  
  return components;
}

/**
 * Count components by type
 */
export function countComponentTypes(root: LayoutNode): Record<ComponentType, number> {
  const counts: Record<string, number> = {};
  
  walkLayout(root, (node) => {
    if (node.type === 'component' && node.component) {
      const type = node.component.type;
      counts[type] = (counts[type] || 0) + 1;
    }
    return null;
  });
  
  return counts as Record<ComponentType, number>;
}
