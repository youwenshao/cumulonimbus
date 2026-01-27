/**
 * Add Dependency Tool
 * Adds npm packages to the project
 */

import { z } from 'zod';
import {
  ToolDefinition,
  AgentContext,
  escapeXmlAttr,
} from './types';

const addDependencySchema = z.object({
  packages: z.string().describe('Space-separated list of packages to add (e.g., "axios lodash react-icons")'),
  dev: z.boolean().optional().default(false).describe('Whether to add as devDependency'),
});

type AddDependencyArgs = z.infer<typeof addDependencySchema>;

// Common packages that are likely already installed in the scaffold
const PRE_INSTALLED = new Set([
  'react',
  'react-dom',
  'react-router-dom',
  '@tanstack/react-query',
  'zod',
  'react-hook-form',
  '@hookform/resolvers',
  'date-fns',
  'lucide-react',
  'clsx',
  'tailwind-merge',
  'class-variance-authority',
  'sonner',
  'recharts',
  // Radix UI packages
  '@radix-ui/react-accordion',
  '@radix-ui/react-alert-dialog',
  '@radix-ui/react-aspect-ratio',
  '@radix-ui/react-avatar',
  '@radix-ui/react-checkbox',
  '@radix-ui/react-collapsible',
  '@radix-ui/react-context-menu',
  '@radix-ui/react-dialog',
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-hover-card',
  '@radix-ui/react-label',
  '@radix-ui/react-menubar',
  '@radix-ui/react-navigation-menu',
  '@radix-ui/react-popover',
  '@radix-ui/react-progress',
  '@radix-ui/react-radio-group',
  '@radix-ui/react-scroll-area',
  '@radix-ui/react-select',
  '@radix-ui/react-separator',
  '@radix-ui/react-slider',
  '@radix-ui/react-slot',
  '@radix-ui/react-switch',
  '@radix-ui/react-tabs',
  '@radix-ui/react-toast',
  '@radix-ui/react-toggle',
  '@radix-ui/react-toggle-group',
  '@radix-ui/react-tooltip',
]);

export const addDependencyTool: ToolDefinition<AddDependencyArgs> = {
  name: 'add_dependency',
  description: 'Add npm packages to the project. Many common packages like React, Radix UI, Tailwind utilities, and Shadcn dependencies are already installed.',
  inputSchema: addDependencySchema,
  defaultConsent: 'always',
  modifiesState: true,

  getConsentPreview: (args) => `Add packages: ${args.packages}`,

  buildXml: (args, isComplete) => {
    if (!args.packages) return undefined;
    
    let xml = `<dyad-add-dependency packages="${escapeXmlAttr(args.packages)}"`;
    if (args.dev) {
      xml += ' dev="true"';
    }
    
    if (isComplete) {
      xml += '></dyad-add-dependency>';
    }
    
    return xml;
  },

  execute: async (args, ctx: AgentContext) => {
    const packageList = args.packages.split(/\s+/).filter(Boolean);
    
    if (packageList.length === 0) {
      return 'No packages specified';
    }
    
    // Check which packages are already installed
    const alreadyInstalled: string[] = [];
    const toAdd: string[] = [];
    
    for (const pkg of packageList) {
      // Extract package name (without version specifier)
      const pkgName = pkg.replace(/@[\d.^~]+$/, '').replace(/@latest$/, '');
      
      if (PRE_INSTALLED.has(pkgName)) {
        alreadyInstalled.push(pkgName);
      } else {
        toAdd.push(pkg);
      }
    }
    
    // Update package.json
    const depKey = args.dev ? 'devDependencies' : 'dependencies';
    
    if (!ctx.packageJson[depKey]) {
      ctx.packageJson[depKey] = {};
    }
    
    const deps = ctx.packageJson[depKey] as Record<string, string>;
    
    for (const pkg of toAdd) {
      // Extract package name and version
      const match = pkg.match(/^(@?[^@]+)(?:@(.+))?$/);
      if (match) {
        const [, name, version] = match;
        deps[name] = version || 'latest';
      }
    }
    
    // Update the package.json file in componentFiles
    ctx.componentFiles['package.json'] = JSON.stringify(ctx.packageJson, null, 2);
    
    // Stream the XML output
    const xml = addDependencyTool.buildXml!(args, true)!;
    ctx.onXmlComplete(xml);
    
    // Build response message
    const messages: string[] = [];
    
    if (toAdd.length > 0) {
      messages.push(`Added packages: ${toAdd.join(', ')}`);
    }
    
    if (alreadyInstalled.length > 0) {
      messages.push(`Already installed: ${alreadyInstalled.join(', ')}`);
    }
    
    return messages.join('\n');
  },
};

export default addDependencyTool;
