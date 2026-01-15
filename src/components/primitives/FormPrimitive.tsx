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

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map(field => (
          <div key={field.name}>
            <label
              htmlFor={field.name}
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              {field.label}
              {field.required && <span className="text-accent-yellow ml-1">*</span>}
            </label>

            {renderField(field, values[field.name], handleChange)}

            {errors[field.name] && (
              <p className="text-sm text-accent-yellow mt-1">{errors[field.name]}</p>
            )}
          </div>
        ))}

        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 px-4 bg-accent-yellow text-text-primary rounded-xl font-medium",
              "hover:bg-accent-yellow/90 transition-all duration-200 shadow-lg shadow-accent-yellow/25 hover:shadow-xl hover:shadow-accent-yellow/30",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent-yellow"
            )}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                {submitLabel}
              </>
            )}
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
    "w-full px-4 py-3 rounded-xl border border-outline-light bg-surface-light text-text-primary placeholder-text-tertiary",
    "focus:outline-none focus:ring-2 focus:ring-accent-yellow/50 focus:border-accent-yellow",
    "transition-all duration-200"
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
            className="w-5 h-5 rounded border-outline-light bg-surface-light text-accent-yellow focus:ring-accent-yellow/50"
          />
          <span className="text-text-secondary">Yes</span>
        </label>
      );

    case 'select':
      return (
        <select
          id={field.name}
          value={(value as string) || ''}
          onChange={(e) => onChange(field.name, e.target.value)}
          className={cn(baseInputClass, "appearance-none bg-surface-light")}
        >
          <option value="" className="bg-surface-light text-text-tertiary">Select {field.label}</option>
          {field.options?.map(opt => (
            <option key={opt} value={opt} className="bg-surface-light text-text-primary">{opt}</option>
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
