'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { PreviewMockup } from './PreviewMockup';
import { generatePreviewData, type DataRecord } from '@/lib/scaffolder/preview-generator';
import type { ProjectSpec } from '@/lib/scaffolder/types';

interface AppPreviewProps {
  spec: ProjectSpec;
  onConfirm?: () => void;
  onEdit?: () => void;
  className?: string;
}

export function AppPreview({ spec, onConfirm, onEdit, className }: AppPreviewProps) {
  const [viewMode, setViewMode] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [activeTab, setActiveTab] = useState<'form' | 'data'>('form');

  // Generate mock data
  const previewData = useMemo(() => generatePreviewData(spec, 5, viewMode), [spec, viewMode]);

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Preview Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-white mb-2">
          Preview: {spec.name}
        </h3>
        <p className="text-text-secondary text-sm max-w-md mx-auto">
          {spec.description}
        </p>
      </div>

      {/* Device Preview */}
      <PreviewMockup
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        className="animate-slide-up"
      >
        <PreviewContent
          spec={spec}
          mockData={previewData.mockData}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </PreviewMockup>

      {/* Spec Summary */}
      <div className="bg-surface-light border border-outline-light rounded-xl p-4">
        <h4 className="text-sm font-semibold text-white mb-3">App Features</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <FeatureTag
            icon="📝"
            label={`${spec.dataStore.fields.length} Fields`}
            sublabel={spec.dataStore.fields.filter(f => f.required).length + ' required'}
          />
          <FeatureTag
            icon="👁️"
            label={`${spec.views.length} Views`}
            sublabel={spec.views.map(v => v.type).join(', ')}
          />
          <FeatureTag
            icon="📊"
            label="Category"
            sublabel={spec.category || 'Custom'}
          />
        </div>
      </div>

      {/* Action Buttons */}
      {(onConfirm || onEdit) && (
        <div className="flex gap-3 justify-center">
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-6 py-3 bg-surface-light border border-outline-light rounded-xl text-white hover:bg-surface-dark transition-colors"
            >
              ← Make Changes
            </button>
          )}
          {onConfirm && (
            <button
              onClick={onConfirm}
              className="px-8 py-3 bg-accent-red text-white rounded-xl font-semibold hover:bg-accent-red/90 transition-colors flex items-center gap-2"
            >
              <span>⚡</span> Build This App
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface PreviewContentProps {
  spec: ProjectSpec;
  mockData: DataRecord[];
  activeTab: 'form' | 'data';
  onTabChange: (tab: 'form' | 'data') => void;
}

function PreviewContent({ spec, mockData, activeTab, onTabChange }: PreviewContentProps) {
  return (
    <div className="h-full flex flex-col bg-black">
      {/* App Header */}
      <header className="bg-surface-dark border-b border-outline-mid px-4 py-3">
        <h1 className="text-lg font-bold text-white truncate">{spec.name}</h1>
        <p className="text-xs text-text-secondary truncate">{spec.description}</p>
      </header>

      {/* Tab Navigation */}
      <div className="flex border-b border-outline-mid bg-surface-dark">
        <button
          onClick={() => onTabChange('form')}
          className={cn(
            'flex-1 px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'form'
              ? 'text-accent-red border-b-2 border-accent-red'
              : 'text-text-secondary hover:text-white'
          )}
        >
          Add New
        </button>
        <button
          onClick={() => onTabChange('data')}
          className={cn(
            'flex-1 px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'data'
              ? 'text-accent-red border-b-2 border-accent-red'
              : 'text-text-secondary hover:text-white'
          )}
        >
          View Data ({mockData.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'form' ? (
          <PreviewForm spec={spec} />
        ) : (
          <PreviewDataView spec={spec} mockData={mockData} />
        )}
      </div>
    </div>
  );
}

interface PreviewFormProps {
  spec: ProjectSpec;
}

function PreviewForm({ spec }: PreviewFormProps) {
  return (
    <form className="space-y-4">
      {spec.dataStore.fields.map((field) => (
        <div key={field.name} className="space-y-1">
          <label className="text-sm font-medium text-white flex items-center gap-1">
            {field.label}
            {field.required && <span className="text-accent-red">*</span>}
          </label>
          <FormFieldPreview field={field} />
        </div>
      ))}
      <button
        type="button"
        className="w-full py-3 bg-accent-red text-white rounded-xl font-semibold mt-4"
      >
        Add Entry
      </button>
    </form>
  );
}

interface FormFieldPreviewProps {
  field: ProjectSpec['dataStore']['fields'][0];
}

function FormFieldPreview({ field }: FormFieldPreviewProps) {
  const baseClass = 'w-full px-3 py-2 bg-surface-light border border-outline-light rounded-lg text-white placeholder:text-text-secondary focus:outline-none focus:border-accent-red';

  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
          className={cn(baseClass, 'min-h-[80px] resize-none')}
          disabled
        />
      );

    case 'select':
      return (
        <select className={baseClass} disabled>
          <option value="">Select {field.label.toLowerCase()}...</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );

    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            className="w-5 h-5 rounded border-outline-light bg-surface-light"
            disabled
          />
          <span className="text-sm text-text-secondary">Check to enable</span>
        </div>
      );

    case 'date':
      return (
        <input
          type="date"
          className={baseClass}
          disabled
        />
      );

    case 'time':
      return (
        <input
          type="time"
          className={baseClass}
          disabled
        />
      );

    case 'number':
      return (
        <input
          type="number"
          placeholder={field.placeholder || '0'}
          className={baseClass}
          disabled
        />
      );

    case 'email':
      return (
        <input
          type="email"
          placeholder={field.placeholder || 'email@example.com'}
          className={baseClass}
          disabled
        />
      );

    case 'url':
      return (
        <input
          type="url"
          placeholder={field.placeholder || 'https://...'}
          className={baseClass}
          disabled
        />
      );

    default:
      return (
        <input
          type="text"
          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
          className={baseClass}
          disabled
        />
      );
  }
}

interface PreviewDataViewProps {
  spec: ProjectSpec;
  mockData: DataRecord[];
}

function PreviewDataView({ spec, mockData }: PreviewDataViewProps) {
  const mainView = spec.views[0];

  if (!mainView) {
    return (
      <div className="text-center text-text-secondary py-8">
        No views configured
      </div>
    );
  }

  switch (mainView.type) {
    case 'table':
      return <PreviewTable spec={spec} mockData={mockData} />;
    case 'cards':
      return <PreviewCards spec={spec} mockData={mockData} />;
    case 'chart':
      return <PreviewChart spec={spec} mockData={mockData} />;
    default:
      return <PreviewTable spec={spec} mockData={mockData} />;
  }
}

function PreviewTable({ spec, mockData }: PreviewDataViewProps) {
  // Show first 3 fields in the table
  const visibleFields = spec.dataStore.fields.slice(0, 3);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-outline-light">
            {visibleFields.map((field) => (
              <th
                key={field.name}
                className="text-left text-xs font-semibold text-text-secondary px-2 py-2"
              >
                {field.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mockData.map((record) => (
            <tr key={record.id} className="border-b border-outline-light/50">
              {visibleFields.map((field) => (
                <td key={field.name} className="text-sm text-white px-2 py-2 truncate max-w-[100px]">
                  {formatValue(record[field.name], field.type)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PreviewCards({ spec, mockData }: PreviewDataViewProps) {
  const titleField = spec.dataStore.fields[0];
  const subtitleField = spec.dataStore.fields[1];

  return (
    <div className="space-y-3">
      {mockData.slice(0, 4).map((record) => (
        <div
          key={record.id}
          className="bg-surface-light border border-outline-light rounded-lg p-3"
        >
          <div className="font-medium text-white text-sm truncate">
            {String(record[titleField?.name || 'id'] || 'Untitled')}
          </div>
          {subtitleField && (
            <div className="text-xs text-text-secondary truncate mt-1">
              {formatValue(record[subtitleField.name], subtitleField.type)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PreviewChart({ spec, mockData }: PreviewDataViewProps) {
  // Simple bar chart visualization
  const numericField = spec.dataStore.fields.find(f => f.type === 'number');
  const labelField = spec.dataStore.fields[0];

  if (!numericField) {
    return (
      <div className="text-center text-text-secondary py-8">
        Add a numeric field to see charts
      </div>
    );
  }

  const maxValue = Math.max(...mockData.map(r => Number(r[numericField.name]) || 0));

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-white mb-4">
        {numericField.label} by {labelField?.label || 'Entry'}
      </h4>
      {mockData.slice(0, 5).map((record) => {
        const value = Number(record[numericField.name]) || 0;
        const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
        
        return (
          <div key={record.id} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary truncate max-w-[120px]">
                {String(record[labelField?.name || 'id'] || 'Entry')}
              </span>
              <span className="text-white font-medium">
                {formatValue(value, 'number')}
              </span>
            </div>
            <div className="h-3 bg-surface-dark rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent-red to-pastel-purple rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FeatureTag({ icon, label, sublabel }: { icon: string; label: string; sublabel: string }) {
  return (
    <div className="flex items-center gap-2 bg-surface-dark rounded-lg px-3 py-2">
      <span className="text-lg">{icon}</span>
      <div>
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="text-xs text-text-secondary">{sublabel}</div>
      </div>
    </div>
  );
}

function formatValue(value: unknown, type: string): string {
  if (value === null || value === undefined) return '-';
  
  if (type === 'checkbox') {
    return value ? '✓' : '✗';
  }
  
  if (type === 'number' && typeof value === 'number') {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  
  if (type === 'date' && typeof value === 'string') {
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return String(value);
    }
  }
  
  return String(value);
}

export default AppPreview;
