'use client';

import { useState } from 'react';
import { FileText, Terminal, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextPanelProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const tabs = [
  {
    id: 'files',
    label: 'File Explorer',
    icon: FileText,
    content: <FileExplorerTab />,
  },
  {
    id: 'terminal',
    label: 'Live Output',
    icon: Terminal,
    content: <TerminalTab />,
  },
  {
    id: 'docs',
    label: 'Documentation',
    icon: Search,
    content: <DocumentationTab />,
  },
];

export function ContextPanel({ isOpen, onClose, className }: ContextPanelProps) {
  const [activeTab, setActiveTab] = useState('files');

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div
      className={cn(
        'fixed right-0 top-0 h-full bg-surface-mid border-l border-outline-mid transition-transform duration-300 ease-out z-40',
        'w-80 shadow-2xl',
        isOpen ? 'translate-x-0' : 'translate-x-full',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-outline-light">
        <h3 className="text-lg font-semibold text-white">Context Panel</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-surface-light rounded transition-colors"
          aria-label="Close panel"
        >
          <X className="w-5 h-5 text-text-secondary" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-light">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors flex-1',
                isActive
                  ? 'text-accent-red border-b-2 border-accent-red bg-surface-dark'
                  : 'text-text-secondary hover:text-white hover:bg-surface-light'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTabData?.content}
      </div>
    </div>
  );
}

// Tab Components
function FileExplorerTab() {
  return (
    <div className="p-4">
      <div className="text-sm text-text-secondary mb-4">Recent Files</div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-2 rounded hover:bg-surface-light cursor-pointer">
          <FileText className="w-4 h-4 text-text-tertiary" />
          <span className="text-sm text-text-secondary">app.tsx</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded hover:bg-surface-light cursor-pointer">
          <FileText className="w-4 h-4 text-text-tertiary" />
          <span className="text-sm text-text-secondary">config.json</span>
        </div>
        <div className="text-xs text-text-tertiary mt-4 p-2 bg-surface-dark rounded">
          File explorer functionality coming soon...
        </div>
      </div>
    </div>
  );
}

function TerminalTab() {
  return (
    <div className="p-4">
      <div className="text-sm text-text-secondary mb-4">Live Output</div>
      <div className="bg-black rounded p-3 font-mono text-sm">
        <div className="text-green-400">$ npm run build</div>
        <div className="text-text-secondary mt-2">
          Building application...
        </div>
        <div className="text-text-tertiary mt-1">
          Terminal output will appear here...
        </div>
      </div>
    </div>
  );
}

function DocumentationTab() {
  return (
    <div className="p-4">
      <div className="text-sm text-text-secondary mb-4">Search Documentation</div>
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Search docs..."
          className="w-full px-3 py-2 bg-surface-dark border border-outline-light rounded text-sm focus:border-accent-red focus:outline-none"
        />
        <div className="text-xs text-text-tertiary">
          Documentation search functionality coming soon...
        </div>
      </div>
    </div>
  );
}

export default ContextPanel;