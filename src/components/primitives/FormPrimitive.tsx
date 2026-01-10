'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { FieldDefinition } from '@/lib/scaffolder/types';
import { cn } from '@/lib/utils';

interface FormPrimitiveProps {
  fields: FieldDefinition[];
  submitLabel?: string;
  onSubmit: (values: Record<string, unknown>) => void;
  isLoading?: boolean;
}

export function FormPrimitive({ 
  fields, 
  submitLabel = 'Add Entry', 
  onSubmit,
  isLoading = false,
}: FormPrimitiveProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = (name: string, value: unknown) => {
    setValues(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    fields.forEach(field => {
      if (field.required && !values[field.name]) {
        newErrors[field.name] = `${field.label} is required`;
      }
      if (field.validation) {
        const value = values[field.name];
        if (typeof value === 'number') {
          if (field.validation.min !== undefined && value < field.validation.min) {
            newErrors[field.name] = `Minimum value is ${field.validation.min}`;
          }
          if (field.validation.max !== undefined && value > field.validation.max) {
            newErrors[field.name] = `Maximum value is ${field.validation.max}`;
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(values);
      setValues({});
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium hover:from-primary-600 hover:to-primary-700 transition-all shadow-md hover:shadow-lg"
      >
        <Plus className="w-5 h-5" />
        {submitLabel}
      </button>
    );
  }

  return (
    <div className="glass rounded-2xl p-6 animate-scale-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold font-display text-surface-900">
          {submitLabel}
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-surface-500" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map(field => (
          <div key={field.name}>
            <label 
              htmlFor={field.name}
              className="block text-sm font-medium text-surface-700 mb-1.5"
            >
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            
            {renderField(field, values[field.name], handleChange)}
            
            {errors[field.name] && (
              <p className="text-sm text-red-500 mt-1">{errors[field.name]}</p>
            )}
          </div>
        ))}

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "flex-1 py-2.5 px-4 bg-primary-500 text-white rounded-xl font-medium",
              "hover:bg-primary-600 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            ) : (
              submitLabel
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2.5 text-surface-600 hover:bg-surface-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function renderField(
  field: FieldDefinition,
  value: unknown,
  onChange: (name: string, value: unknown) => void
) {
  const baseInputClass = cn(
    "w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white",
    "focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500",
    "transition-all"
  );

  switch (field.type) {
    case 'text':
      return (
        <input
          id={field.name}
          type="text"
          value={(value as string) || ''}
          onChange={(e) => onChange(field.name, e.target.value)}
          placeholder={field.placeholder}
          className={baseInputClass}
        />
      );

    case 'number':
      return (
        <input
          id={field.name}
          type="number"
          value={(value as number) ?? ''}
          onChange={(e) => onChange(field.name, e.target.value ? parseFloat(e.target.value) : '')}
          placeholder={field.placeholder}
          min={field.validation?.min}
          max={field.validation?.max}
          className={baseInputClass}
        />
      );

    case 'date':
      return (
        <input
          id={field.name}
          type="date"
          value={(value as string) || ''}
          onChange={(e) => onChange(field.name, e.target.value)}
          className={baseInputClass}
        />
      );

    case 'boolean':
      return (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            id={field.name}
            type="checkbox"
            checked={(value as boolean) || false}
            onChange={(e) => onChange(field.name, e.target.checked)}
            className="w-5 h-5 rounded border-surface-300 text-primary-500 focus:ring-primary-500"
          />
          <span className="text-surface-600">Yes</span>
        </label>
      );

    case 'select':
      return (
        <select
          id={field.name}
          value={(value as string) || ''}
          onChange={(e) => onChange(field.name, e.target.value)}
          className={baseInputClass}
        >
          <option value="">Select {field.label}</option>
          {field.options?.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );

    case 'textarea':
      return (
        <textarea
          id={field.name}
          value={(value as string) || ''}
          onChange={(e) => onChange(field.name, e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={cn(baseInputClass, "resize-none")}
        />
      );

    default:
      return (
        <input
          id={field.name}
          type="text"
          value={(value as string) || ''}
          onChange={(e) => onChange(field.name, e.target.value)}
          className={baseInputClass}
        />
      );
  }
}
