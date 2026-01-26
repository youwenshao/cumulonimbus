'use client';

import React, { useState } from 'react';
import { 
  Target, 
  Lightbulb, 
  Scale, 
  Database, 
  Layout, 
  Cog, 
  Code,
  CheckCircle, 
  Circle, 
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Agent types in the V2 pipeline
 */
export type PipelineAgent = 
  | 'intent-engine' 
  | 'architect' 
  | 'advisor' 
  | 'schema-designer' 
  | 'ui-designer' 
  | 'workflow-agent' 
  | 'code-generator';

/**
 * Activity state for each agent
 */
export interface AgentActivity {
  id: string;
  agent: PipelineAgent;
  status: 'queued' | 'running' | 'complete' | 'error';
  output?: AgentOutput;
  startTime?: number;
  endTime?: number;
  error?: string;
}

/**
 * Output from each agent type
 */
export interface AgentOutput {
  // Intent Engine
  category?: string;
  entities?: number;
  referenceApps?: string[];
  confidence?: number;
  
  // Schema Designer
  schemaName?: string;
  fieldCount?: number;
  
  // UI Designer
  layoutType?: string;
  componentCount?: number;
  
  // Workflow Agent
  workflowCount?: number;
  computedFieldCount?: number;
  
  // Code Generator
  componentNames?: string[];
  generatedFiles?: number;
  
  // Generic
  summary?: string;
}

/**
 * Agent metadata for display
 */
const AGENT_META: Record<PipelineAgent, {
  icon: typeof Target;
  label: string;
  color: string;
  bgColor: string;
  description: string;
}> = {
  'intent-engine': {
    icon: Target,
    label: 'Intent Engine',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    description: 'Analyzing your request',
  },
  'architect': {
    icon: Lightbulb,
    label: 'Architect',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    description: 'Designing your app',
  },
  'advisor': {
    icon: Scale,
    label: 'Advisor',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    description: 'Reviewing & refining',
  },
  'schema-designer': {
    icon: Database,
    label: 'Schema Designer',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    description: 'Designing data model',
  },
  'ui-designer': {
    icon: Layout,
    label: 'UI Designer',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    description: 'Planning layout',
  },
  'workflow-agent': {
    icon: Cog,
    label: 'Workflow Agent',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    description: 'Setting up automations',
  },
  'code-generator': {
    icon: Code,
    label: 'Code Generator',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    description: 'Writing code',
  },
};

interface AgentTimelineProps {
  activities: AgentActivity[];
  isCollapsible?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

/**
 * AgentTimeline - Real-time visualization of agent pipeline activity
 */
export function AgentTimeline({ 
  activities, 
  isCollapsible = true,
  defaultExpanded = true,
  className,
}: AgentTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());
  
  // Calculate overall progress
  const completedCount = activities.filter(a => a.status === 'complete').length;
  const totalCount = activities.length;
  const hasErrors = activities.some(a => a.status === 'error');
  const hasRunning = activities.some(a => a.status === 'running');
  
  const toggleActivity = (id: string) => {
    setExpandedActivities(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  if (activities.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      "rounded-xl bg-surface-elevated border border-outline-light overflow-hidden",
      className
    )}>
      {/* Header */}
      {isCollapsible ? (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 bg-surface-layer border-b border-outline-light hover:bg-surface-elevated transition-colors"
        >
          <div className="flex items-center gap-3">
            {hasRunning ? (
              <Loader2 className="w-4 h-4 animate-spin text-accent-yellow" />
            ) : hasErrors ? (
              <AlertCircle className="w-4 h-4 text-red-500" />
            ) : completedCount === totalCount ? (
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            ) : (
              <Circle className="w-4 h-4 text-text-tertiary" />
            )}
            <span className="text-sm font-medium text-text-primary">
              Agent Pipeline
            </span>
            <span className="text-xs text-text-tertiary">
              {completedCount}/{totalCount} complete
            </span>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-text-tertiary" />
          ) : (
            <ChevronRight className="w-4 h-4 text-text-tertiary" />
          )}
        </button>
      ) : (
        <div className="px-4 py-3 bg-surface-layer border-b border-outline-light">
          <div className="flex items-center gap-3">
            <Target className="w-4 h-4 text-accent-yellow" />
            <span className="text-sm font-medium text-text-primary">
              Agent Pipeline
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {activities.map((activity) => {
            const meta = AGENT_META[activity.agent];
            const Icon = meta.icon;
            const isActivityExpanded = expandedActivities.has(activity.id);
            const duration = activity.startTime && activity.endTime 
              ? ((activity.endTime - activity.startTime) / 1000).toFixed(1) 
              : null;
            
            return (
              <div 
                key={activity.id}
                className={cn(
                  "rounded-lg border transition-all",
                  activity.status === 'running' 
                    ? "border-accent-yellow/50 bg-accent-yellow/5"
                    : activity.status === 'complete'
                      ? "border-outline-light bg-surface-base"
                      : activity.status === 'error'
                        ? "border-red-500/50 bg-red-500/5"
                        : "border-outline-light bg-surface-layer/50"
                )}
              >
                <button
                  onClick={() => activity.output && toggleActivity(activity.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3",
                    activity.output ? "cursor-pointer hover:bg-surface-elevated/50" : "cursor-default"
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    meta.bgColor
                  )}>
                    <Icon className={cn("w-4 h-4", meta.color)} />
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">
                        {meta.label}
                      </span>
                      {activity.status === 'running' && (
                        <div className="flex space-x-0.5">
                          <span className="w-1 h-1 rounded-full animate-bounce bg-accent-yellow" style={{ animationDelay: '0ms' }} />
                          <span className="w-1 h-1 rounded-full animate-bounce bg-accent-yellow" style={{ animationDelay: '100ms' }} />
                          <span className="w-1 h-1 rounded-full animate-bounce bg-accent-yellow" style={{ animationDelay: '200ms' }} />
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-text-tertiary">
                      {activity.status === 'running' 
                        ? meta.description
                        : activity.error 
                          ? activity.error
                          : getActivitySummary(activity)
                      }
                    </div>
                  </div>
                  
                  {/* Status & Duration */}
                  <div className="flex items-center gap-2">
                    {duration && (
                      <div className="flex items-center gap-1 text-xs text-text-tertiary">
                        <Clock className="w-3 h-3" />
                        {duration}s
                      </div>
                    )}
                    
                    {activity.status === 'running' && (
                      <Loader2 className="w-4 h-4 animate-spin text-accent-yellow" />
                    )}
                    {activity.status === 'complete' && (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    )}
                    {activity.status === 'error' && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    {activity.status === 'queued' && (
                      <Circle className="w-4 h-4 text-text-tertiary" />
                    )}
                    
                    {activity.output && (
                      isActivityExpanded ? (
                        <ChevronDown className="w-4 h-4 text-text-tertiary" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-text-tertiary" />
                      )
                    )}
                  </div>
                </button>
                
                {/* Expanded output details */}
                {isActivityExpanded && activity.output && (
                  <div className="px-3 pb-3 border-t border-outline-light mt-2 pt-2">
                    <AgentOutputPreview agent={activity.agent} output={activity.output} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Get a brief summary of agent activity
 */
function getActivitySummary(activity: AgentActivity): string {
  const output = activity.output;
  if (!output) return 'Completed';
  
  switch (activity.agent) {
    case 'intent-engine':
      return output.category 
        ? `${output.category} app, ${output.entities || 0} entities`
        : 'Intent analyzed';
    case 'schema-designer':
      return output.fieldCount 
        ? `${output.fieldCount} fields in ${output.schemaName || 'schema'}`
        : 'Schema designed';
    case 'ui-designer':
      return output.layoutType 
        ? `${output.layoutType} layout`
        : 'Layout designed';
    case 'workflow-agent':
      return output.workflowCount !== undefined
        ? `${output.workflowCount} workflows, ${output.computedFieldCount || 0} computed`
        : 'Workflows analyzed';
    case 'code-generator':
      return output.generatedFiles 
        ? `${output.generatedFiles} files generated`
        : 'Code generated';
    default:
      return output.summary || 'Completed';
  }
}

/**
 * AgentOutputPreview - Detailed view of agent output
 */
function AgentOutputPreview({ 
  agent, 
  output 
}: { 
  agent: PipelineAgent; 
  output: AgentOutput;
}) {
  switch (agent) {
    case 'intent-engine':
      return (
        <div className="space-y-2 text-xs">
          {output.category && (
            <div className="flex justify-between">
              <span className="text-text-tertiary">App Category</span>
              <span className="text-text-primary font-medium capitalize">{output.category}</span>
            </div>
          )}
          {output.entities !== undefined && (
            <div className="flex justify-between">
              <span className="text-text-tertiary">Detected Entities</span>
              <span className="text-text-primary font-medium">{output.entities}</span>
            </div>
          )}
          {output.referenceApps && output.referenceApps.length > 0 && (
            <div className="flex justify-between">
              <span className="text-text-tertiary">Reference Apps</span>
              <span className="text-text-primary font-medium">{output.referenceApps.join(', ')}</span>
            </div>
          )}
          {output.confidence !== undefined && (
            <div className="flex justify-between">
              <span className="text-text-tertiary">Complexity Score</span>
              <span className="text-text-primary font-medium">{output.confidence}/10</span>
            </div>
          )}
        </div>
      );
    
    case 'schema-designer':
      return (
        <div className="space-y-2 text-xs">
          {output.schemaName && (
            <div className="flex justify-between">
              <span className="text-text-tertiary">Schema Name</span>
              <span className="text-text-primary font-medium">{output.schemaName}</span>
            </div>
          )}
          {output.fieldCount !== undefined && (
            <div className="flex justify-between">
              <span className="text-text-tertiary">Fields</span>
              <span className="text-text-primary font-medium">{output.fieldCount}</span>
            </div>
          )}
        </div>
      );
    
    case 'ui-designer':
      return (
        <div className="space-y-2 text-xs">
          {output.layoutType && (
            <div className="flex justify-between">
              <span className="text-text-tertiary">Layout Type</span>
              <span className="text-text-primary font-medium capitalize">{output.layoutType}</span>
            </div>
          )}
          {output.componentCount !== undefined && (
            <div className="flex justify-between">
              <span className="text-text-tertiary">Components</span>
              <span className="text-text-primary font-medium">{output.componentCount}</span>
            </div>
          )}
        </div>
      );
    
    case 'workflow-agent':
      return (
        <div className="space-y-2 text-xs">
          {output.workflowCount !== undefined && (
            <div className="flex justify-between">
              <span className="text-text-tertiary">Workflows</span>
              <span className="text-text-primary font-medium">{output.workflowCount}</span>
            </div>
          )}
          {output.computedFieldCount !== undefined && (
            <div className="flex justify-between">
              <span className="text-text-tertiary">Computed Fields</span>
              <span className="text-text-primary font-medium">{output.computedFieldCount}</span>
            </div>
          )}
        </div>
      );
    
    case 'code-generator':
      return (
        <div className="space-y-2 text-xs">
          {output.generatedFiles !== undefined && (
            <div className="flex justify-between">
              <span className="text-text-tertiary">Files Generated</span>
              <span className="text-text-primary font-medium">{output.generatedFiles}</span>
            </div>
          )}
          {output.componentNames && output.componentNames.length > 0 && (
            <div>
              <span className="text-text-tertiary block mb-1">Components</span>
              <div className="flex flex-wrap gap-1">
                {output.componentNames.map((name, i) => (
                  <span 
                    key={i}
                    className="px-2 py-0.5 bg-surface-layer rounded text-text-secondary"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    
    default:
      return output.summary ? (
        <div className="text-xs text-text-secondary">{output.summary}</div>
      ) : null;
  }
}

export default AgentTimeline;
