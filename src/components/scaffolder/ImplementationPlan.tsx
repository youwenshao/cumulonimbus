'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Layers, GitBranch, Box, ListChecks, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImplementationPlan as ImplementationPlanType } from '@/lib/scaffolder/types';

interface ImplementationPlanProps {
  plan: ImplementationPlanType;
  className?: string;
  defaultExpanded?: boolean;
}

export function ImplementationPlan({ plan, className, defaultExpanded = true }: ImplementationPlanProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    architecture: true,
    components: true,
    steps: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const complexityColors = {
    simple: 'text-green-400 bg-green-400/10 border-green-400/30',
    moderate: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    complex: 'text-red-400 bg-red-400/10 border-red-400/30',
  };

  return (
    <div className={cn('bg-surface-dark border border-outline-mid rounded-xl overflow-hidden', className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-light transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-yellow/20 flex items-center justify-center">
            <Layers className="w-5 h-5 text-accent-yellow" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-text-primary">Implementation Plan</h3>
            <p className="text-sm text-text-secondary">
              {plan.steps.length} steps • {plan.estimatedComplexity} complexity
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn(
            'px-3 py-1 text-xs font-medium rounded-full border',
            complexityColors[plan.estimatedComplexity]
          )}>
            {plan.estimatedComplexity.charAt(0).toUpperCase() + plan.estimatedComplexity.slice(1)}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-text-secondary" />
          ) : (
            <ChevronRight className="w-5 h-5 text-text-secondary" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-outline-mid">
          {/* Overview */}
          <div className="p-4 border-b border-outline-light">
            <p className="text-text-secondary leading-relaxed">{plan.overview}</p>
          </div>

          {/* Architecture Section */}
          <CollapsibleSection
            title="Architecture"
            icon={<GitBranch className="w-4 h-4" />}
            isExpanded={expandedSections.architecture}
            onToggle={() => toggleSection('architecture')}
          >
            <div className="space-y-4">
              {/* Primitives */}
              <div>
                <h5 className="text-sm font-medium text-text-primary mb-2">Components Used</h5>
                <div className="flex flex-wrap gap-2">
                  {plan.architecture.primitives.map((primitive, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 text-sm bg-surface-light border border-outline-light rounded-lg text-text-secondary"
                    >
                      {primitive}
                    </span>
                  ))}
                </div>
              </div>

              {/* Data Flow */}
              <div>
                <h5 className="text-sm font-medium text-text-primary mb-2">Data Flow</h5>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {plan.architecture.dataFlow}
                </p>
              </div>
            </div>
          </CollapsibleSection>

          {/* Components Section */}
          <CollapsibleSection
            title="Components"
            icon={<Box className="w-4 h-4" />}
            isExpanded={expandedSections.components}
            onToggle={() => toggleSection('components')}
          >
            <div className="space-y-3">
              {/* Form Component */}
              <ComponentCard
                name={plan.components.form.name}
                type={plan.components.form.type}
                description={plan.components.form.description}
                isForm
              />

              {/* View Components */}
              {plan.components.views.map((view, i) => (
                <ComponentCard
                  key={i}
                  name={view.name}
                  type={view.type}
                  description={view.description}
                />
              ))}
            </div>
          </CollapsibleSection>

          {/* Build Steps Section */}
          <CollapsibleSection
            title="Build Steps"
            icon={<ListChecks className="w-4 h-4" />}
            isExpanded={expandedSections.steps}
            onToggle={() => toggleSection('steps')}
            noBorder
          >
            <ol className="space-y-2">
              {plan.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-surface-light border border-outline-light flex items-center justify-center text-xs font-medium text-text-secondary">
                    {i + 1}
                  </span>
                  <span className="text-sm text-text-secondary pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  noBorder?: boolean;
}

function CollapsibleSection({ title, icon, isExpanded, onToggle, children, noBorder }: CollapsibleSectionProps) {
  return (
    <div className={cn(!noBorder && 'border-b border-outline-light')}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-light/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-text-primary">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-text-secondary" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-secondary" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

interface ComponentCardProps {
  name: string;
  type: string;
  description: string;
  isForm?: boolean;
}

function ComponentCard({ name, type, description, isForm }: ComponentCardProps) {
  return (
    <div className={cn(
      'p-3 rounded-lg border',
      isForm 
        ? 'bg-accent-yellow/5 border-accent-yellow/20' 
        : 'bg-surface-light border-outline-light'
    )}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-text-primary text-sm">{name}</span>
        <span className={cn(
          'text-xs px-2 py-0.5 rounded',
          isForm ? 'bg-accent-yellow/20 text-accent-yellow' : 'bg-surface-dark text-text-secondary'
        )}>
          {type}
        </span>
      </div>
      <p className="text-xs text-text-secondary">{description}</p>
    </div>
  );
}

export default ImplementationPlan;
