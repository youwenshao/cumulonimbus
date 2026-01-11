'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { 
  PATTERN_LIBRARY, 
  getCategories,
  applyCustomizations,
  type AppTemplate,
  type TrackerCategory 
} from '@/lib/scaffolder/pattern-library';
import type { ProjectSpec } from '@/lib/scaffolder/types';

interface TemplateGalleryProps {
  onSelectTemplate: (spec: ProjectSpec, template: AppTemplate) => void;
  onBack?: () => void;
  className?: string;
}

export function TemplateGallery({ onSelectTemplate, onBack, className }: TemplateGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<TrackerCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<AppTemplate | null>(null);
  const [customizations, setCustomizations] = useState<Record<string, string | string[]>>({});

  const categories = useMemo(() => getCategories(), []);

  const filteredTemplates = useMemo(() => {
    let templates = PATTERN_LIBRARY;
    
    if (selectedCategory !== 'all') {
      templates = templates.filter(t => t.category === selectedCategory);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.includes(query))
      );
    }
    
    return templates;
  }, [selectedCategory, searchQuery]);

  const handleSelectTemplate = (template: AppTemplate) => {
    setSelectedTemplate(template);
    // Initialize customizations with defaults
    const defaults: Record<string, string | string[]> = {};
    for (const point of template.customizationPoints) {
      defaults[point.id] = point.defaultValue;
    }
    setCustomizations(defaults);
  };

  const handleConfirmTemplate = () => {
    if (!selectedTemplate) return;
    const spec = applyCustomizations(selectedTemplate, customizations);
    onSelectTemplate(spec, selectedTemplate);
  };

  const handleUpdateCustomization = (pointId: string, value: string | string[]) => {
    setCustomizations(prev => ({ ...prev, [pointId]: value }));
  };

  // Template customization view
  if (selectedTemplate) {
    return (
      <TemplateCustomizer
        template={selectedTemplate}
        customizations={customizations}
        onUpdateCustomization={handleUpdateCustomization}
        onConfirm={handleConfirmTemplate}
        onBack={() => setSelectedTemplate(null)}
        className={className}
      />
    );
  }

  // Gallery view
  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Start with a Template</h2>
        <p className="text-text-secondary">Choose a template and customize it to fit your needs</p>
      </div>

      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="self-start text-text-secondary hover:text-white transition-colors flex items-center gap-2"
        >
          ← Back to conversation
        </button>
      )}

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 bg-surface-light border border-outline-light rounded-xl text-white placeholder:text-text-secondary focus:outline-none focus:border-accent-red"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary">🔍</span>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        <CategoryButton
          active={selectedCategory === 'all'}
          onClick={() => setSelectedCategory('all')}
          icon="🎯"
          label="All"
          count={PATTERN_LIBRARY.length}
        />
        {categories.filter(c => c.count > 0).map(cat => (
          <CategoryButton
            key={cat.category}
            active={selectedCategory === cat.category}
            onClick={() => setSelectedCategory(cat.category)}
            icon={cat.icon}
            label={cat.label}
            count={cat.count}
          />
        ))}
      </div>

      {/* Template Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12 text-text-secondary">
          <div className="text-4xl mb-4">🔍</div>
          <p>No templates found. Try a different search or category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={() => handleSelectTemplate(template)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CategoryButtonProps {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  count: number;
}

function CategoryButton({ active, onClick, icon, label, count }: CategoryButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-2 rounded-lg flex items-center gap-2 transition-all',
        active
          ? 'bg-accent-red text-white'
          : 'bg-surface-light border border-outline-light text-text-secondary hover:text-white hover:border-outline-mid'
      )}
    >
      <span>{icon}</span>
      <span className="font-medium">{label}</span>
      <span className={cn(
        'text-xs px-1.5 py-0.5 rounded-full',
        active ? 'bg-white/20' : 'bg-surface-dark'
      )}>
        {count}
      </span>
    </button>
  );
}

interface TemplateCardProps {
  template: AppTemplate;
  onSelect: () => void;
}

function TemplateCard({ template, onSelect }: TemplateCardProps) {
  return (
    <button
      onClick={onSelect}
      className="group bg-surface-light border border-outline-light rounded-xl p-4 text-left hover:border-accent-red/50 transition-all"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ backgroundColor: `${template.color}20` }}
        >
          {template.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white group-hover:text-accent-red transition-colors truncate">
            {template.name}
          </h3>
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span className="capitalize">{template.category}</span>
            <span>•</span>
            <span className="capitalize">{template.difficulty}</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-text-secondary mb-3 line-clamp-2">
        {template.description}
      </p>

      {/* Features */}
      <div className="flex flex-wrap gap-1">
        <FeatureChip label={`${template.spec.dataStore.fields.length} fields`} />
        <FeatureChip label={`${template.spec.views.length} views`} />
        {template.spec.views.some(v => v.type === 'chart') && (
          <FeatureChip label="Charts" />
        )}
      </div>

      {/* Use Cases */}
      <div className="mt-3 pt-3 border-t border-outline-light">
        <div className="text-xs text-text-secondary">
          {template.useCases.slice(0, 2).join(' • ')}
        </div>
      </div>
    </button>
  );
}

function FeatureChip({ label }: { label: string }) {
  return (
    <span className="px-2 py-0.5 bg-surface-dark rounded text-xs text-text-secondary">
      {label}
    </span>
  );
}

interface TemplateCustomizerProps {
  template: AppTemplate;
  customizations: Record<string, string | string[]>;
  onUpdateCustomization: (pointId: string, value: string | string[]) => void;
  onConfirm: () => void;
  onBack: () => void;
  className?: string;
}

function TemplateCustomizer({
  template,
  customizations,
  onUpdateCustomization,
  onConfirm,
  onBack,
  className,
}: TemplateCustomizerProps) {
  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-surface-light border border-outline-light text-text-secondary hover:text-white transition-colors"
        >
          ←
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: `${template.color}20` }}
            >
              {template.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{template.name}</h2>
              <p className="text-sm text-text-secondary">{template.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Long Description */}
      {template.longDescription && (
        <p className="text-text-secondary bg-surface-light border border-outline-light rounded-xl p-4">
          {template.longDescription}
        </p>
      )}

      {/* Customization Points */}
      {template.customizationPoints.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Customize Your App</h3>
          
          {template.customizationPoints.map(point => (
            <CustomizationField
              key={point.id}
              point={point}
              value={customizations[point.id] || point.defaultValue}
              onChange={(value) => onUpdateCustomization(point.id, value)}
            />
          ))}
        </div>
      )}

      {/* Preview of what's included */}
      <div className="bg-surface-light border border-outline-light rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">What's Included</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📝</span>
            <div>
              <div className="text-sm font-medium text-white">{template.spec.dataStore.fields.length} Fields</div>
              <div className="text-xs text-text-secondary">
                {template.spec.dataStore.fields.map(f => f.label).slice(0, 3).join(', ')}
                {template.spec.dataStore.fields.length > 3 && '...'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">👁️</span>
            <div>
              <div className="text-sm font-medium text-white">{template.spec.views.length} Views</div>
              <div className="text-xs text-text-secondary">
                {template.spec.views.map(v => v.type).join(', ')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div className="flex flex-wrap gap-2">
        {template.useCases.map((useCase, i) => (
          <span
            key={i}
            className="px-3 py-1 bg-surface-dark rounded-full text-sm text-text-secondary"
          >
            {useCase}
          </span>
        ))}
      </div>

      {/* Confirm Button */}
      <button
        onClick={onConfirm}
        className="w-full py-4 bg-accent-red text-white rounded-xl font-semibold hover:bg-accent-red/90 transition-colors flex items-center justify-center gap-2"
      >
        <span>⚡</span> Create This App
      </button>
    </div>
  );
}

interface CustomizationFieldProps {
  point: AppTemplate['customizationPoints'][0];
  value: string | string[];
  onChange: (value: string | string[]) => void;
}

function CustomizationField({ point, value, onChange }: CustomizationFieldProps) {
  switch (point.type) {
    case 'field-selection':
      return (
        <div className="bg-surface-dark rounded-xl p-4">
          <label className="block text-sm font-medium text-white mb-2">
            {point.label}
            {point.required && <span className="text-accent-red ml-1">*</span>}
          </label>
          {point.description && (
            <p className="text-xs text-text-secondary mb-3">{point.description}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {point.options?.map(option => {
              const isSelected = Array.isArray(value) && value.includes(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => {
                    if (Array.isArray(value)) {
                      onChange(
                        isSelected
                          ? value.filter(v => v !== option.id)
                          : [...value, option.id]
                      );
                    }
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm transition-all',
                    isSelected
                      ? 'bg-accent-red text-white'
                      : 'bg-surface-light border border-outline-light text-text-secondary hover:text-white'
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      );

    case 'view-type':
      return (
        <div className="bg-surface-dark rounded-xl p-4">
          <label className="block text-sm font-medium text-white mb-2">
            {point.label}
          </label>
          {point.description && (
            <p className="text-xs text-text-secondary mb-3">{point.description}</p>
          )}
          <div className="flex gap-2">
            {point.options?.map(option => (
              <button
                key={option.id}
                onClick={() => onChange(option.id)}
                className={cn(
                  'flex-1 px-4 py-3 rounded-lg text-sm transition-all',
                  value === option.id
                    ? 'bg-accent-red text-white'
                    : 'bg-surface-light border border-outline-light text-text-secondary hover:text-white'
                )}
              >
                <div className="font-medium">{option.label}</div>
                {option.description && (
                  <div className="text-xs opacity-70">{option.description}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      );

    case 'text-input':
      return (
        <div className="bg-surface-dark rounded-xl p-4">
          <label className="block text-sm font-medium text-white mb-2">
            {point.label}
          </label>
          {point.description && (
            <p className="text-xs text-text-secondary mb-3">{point.description}</p>
          )}
          <input
            type="text"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={typeof point.defaultValue === 'string' ? point.defaultValue : ''}
            className="w-full px-4 py-2 bg-surface-light border border-outline-light rounded-lg text-white placeholder:text-text-secondary focus:outline-none focus:border-accent-red"
          />
        </div>
      );

    default:
      return null;
  }
}

export default TemplateGallery;
