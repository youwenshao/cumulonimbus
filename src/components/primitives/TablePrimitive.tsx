'use client';

import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Trash2, Search } from 'lucide-react';
import { Card } from '@/components/ui';
import type { DataRecord, TablePrimitiveConfig } from '@/lib/primitives/types';
import { cn } from '@/lib/utils';

interface TablePrimitiveProps {
  data: DataRecord[];
  config: TablePrimitiveConfig;
  onEdit?: (record: DataRecord) => void;
  onDelete?: (id: string) => void;
}

export function TablePrimitive({ data, config, onEdit, onDelete }: TablePrimitiveProps) {
  const [sortField, setSortField] = useState(config.defaultSort?.field || '');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    config.defaultSort?.direction || 'desc'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(record =>
        Object.values(record).some(val =>
          String(val).toLowerCase().includes(term)
        )
      );
    }

    // Apply column filters
    Object.entries(filterValues).forEach(([field, value]) => {
      if (value) {
        result = result.filter(record => String(record[field]) === value);
      }
    });

    // Apply sorting
    if (sortField) {
      result.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];

        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        const comparison = aVal < bVal ? -1 : 1;
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, searchTerm, filterValues, sortField, sortDirection]);

  // Get unique values for filterable columns
  const getUniqueValues = (field: string): string[] => {
    const values = new Set(data.map(record => String(record[field])));
    return Array.from(values).filter(v => v !== 'undefined' && v !== 'null');
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? '✓' : '✗';
    if (typeof value === 'number') return value.toLocaleString();
    return String(value);
  };

  return (
    <Card variant="outlined" padding="none" className="overflow-hidden">
      {/* Search bar */}
      <div className="p-4 border-b border-outline-light">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-outline-light bg-surface-dark text-white placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-red/50 focus:border-accent-red transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-mid">
              {config.columns.map(column => (
                <th
                  key={column.field}
                  className="px-4 py-3 text-left text-sm font-semibold text-white"
                >
                  <div className="flex items-center gap-2">
                    {column.sortable ? (
                      <button
                        onClick={() => handleSort(column.field)}
                        className="flex items-center gap-1 hover:text-accent-red transition-colors"
                      >
                        {column.label}
                        {sortField === column.field ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-4 h-4 text-accent-red" />
                          ) : (
                            <ArrowDown className="w-4 h-4 text-accent-red" />
                          )
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-50 text-text-tertiary" />
                        )}
                      </button>
                    ) : (
                      column.label
                    )}

                    {column.filterable && (
                      <select
                        value={filterValues[column.field] || ''}
                        onChange={(e) => setFilterValues(prev => ({
                          ...prev,
                          [column.field]: e.target.value,
                        }))}
                        className="ml-2 text-xs px-2 py-1 rounded border border-outline-light bg-surface-dark text-white"
                      >
                        <option value="">All</option>
                        {getUniqueValues(column.field).map(val => (
                          <option key={val} value={val}>{val}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </th>
              ))}
              {onDelete && (
                <th className="px-4 py-3 text-right text-sm font-semibold text-white">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={config.columns.length + (onDelete ? 1 : 0)}
                  className="px-4 py-12 text-center text-text-tertiary"
                >
                  No entries found
                </td>
              </tr>
            ) : (
              filteredAndSortedData.map((record, index) => (
                <tr
                  key={record.id}
                  className={cn(
                    "border-t border-outline-light hover:bg-surface-light/50 transition-colors",
                    index % 2 === 0 ? "bg-surface-dark" : "bg-surface-mid/30"
                  )}
                >
                  {config.columns.map(column => (
                    <td
                      key={column.field}
                      className="px-4 py-3 text-sm text-text-secondary"
                    >
                      {formatValue(record[column.field])}
                    </td>
                  ))}
                  {onDelete && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onDelete(record.id)}
                        className="p-2 hover:bg-accent-red/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-accent-red" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with count */}
      <div className="px-4 py-3 border-t border-outline-light text-sm text-text-tertiary">
        {filteredAndSortedData.length} of {data.length} entries
      </div>
    </Card>
  );
}
