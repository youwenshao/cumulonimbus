
import React, { useState } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, MessageSquare, Code, Terminal } from 'lucide-react';
import { Button, CodeBlock } from '@/components/ui';
import { ErrorAnalyzer, AnalyzedError } from '@/lib/scaffolder-v2/error-analyzer';

interface DebugPanelProps {
  code: string;
  errorLog?: string | null;
  onFix: (instruction?: string) => void;
  onApprove: () => void;
  isFixing?: boolean;
}

export function DebugPanel({ 
  code, 
  errorLog, 
  onFix, 
  onApprove,
  isFixing = false 
}: DebugPanelProps) {
  const [activeTab, setActiveTab] = useState<'error' | 'code'>('error');
  const [customInstruction, setCustomInstruction] = useState('');
  
  const analyzedError: AnalyzedError | null = errorLog 
    ? ErrorAnalyzer.analyze(errorLog) 
    : null;

  if (!errorLog) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800 w-96 shadow-xl">
      <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center space-x-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <h3 className="font-semibold">Debug Panel</h3>
        </div>
        <div className="text-xs text-gray-500 px-2 py-1 bg-gray-800 rounded">
          {analyzedError?.category.toUpperCase() || 'ERROR'}
        </div>
      </div>

      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('error')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'error' 
              ? 'text-white border-b-2 border-red-500 bg-gray-800/50' 
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Terminal className="w-4 h-4" />
            <span>Analysis</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'code' 
              ? 'text-white border-b-2 border-blue-500 bg-gray-800/50' 
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Code className="w-4 h-4" />
            <span>Code</span>
          </div>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'error' && analyzedError ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Root Cause</label>
              <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-red-200 text-sm">
                {analyzedError.rootCause}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Suggestion</label>
              <div className="p-3 bg-blue-950/30 border border-blue-900/50 rounded-lg text-blue-200 text-sm flex items-start space-x-2">
                <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{analyzedError.suggestion}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Raw Log</label>
              <pre className="p-3 bg-black rounded-lg text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap font-mono border border-gray-800">
                {errorLog}
              </pre>
            </div>
          </div>
        ) : (
          <div className="h-full">
            <CodeBlock 
              code={code} 
              language="typescript" 
            />
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-800 bg-gray-900 space-y-4">
        <div className="space-y-2">
          <label className="text-xs text-gray-400">Additional Instructions (Optional)</label>
          <textarea
            value={customInstruction}
            onChange={(e) => setCustomInstruction(e.target.value)}
            placeholder="e.g., Use a different library, fix the import..."
            className="w-full h-20 bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex space-x-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onApprove}
            disabled={isFixing}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Ignore
          </Button>
          <Button
            variant="primary"
            className="flex-1 bg-red-600 hover:bg-red-700"
            onClick={() => onFix(customInstruction)}
            loading={isFixing}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Auto Fix
          </Button>
        </div>
      </div>
    </div>
  );
}
