'use client';

import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Pencil, Trash2, Search } from 'lucide-react';
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
    <div className="glass rounded-2xl overflow-hidden">
      {/* Search bar */}
      <div className="p-4 border-b border-surface-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
          <input
            type="text"
            placeholder="Search entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-50">
              {config.columns.map(column => (
                <th
                  key={column.field}
                  className="px-4 py-3 text-left text-sm font-semibold text-surface-700"
                >
                  <div className="flex items-center gap-2">
                    {column.sortable ? (
                      <button
                        onClick={() => handleSort(column.field)}
                        className="flex items-center gap-1 hover:text-primary-600 transition-colors"
                      >
                        {column.label}
                        {sortField === column.field ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-4 h-4" />
                          ) : (
                            <ArrowDown className="w-4 h-4" />
                          )
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-50" />
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
                        className="ml-2 text-xs px-2 py-1 rounded border border-surface-200 bg-white"
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
              {(onEdit || onDelete) && (
                <th className="px-4 py-3 text-right text-sm font-semibold text-surface-700">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={config.columns.length + (onEdit || onDelete ? 1 : 0)}
                  className="px-4 py-12 text-center text-surface-500"
                >
                  No entries found
                </td>
              </tr>
            ) : (
              filteredAndSortedData.map((record, index) => (
                <tr
                  key={record.id}
                  className={cn(
                    "border-t border-surface-100 hover:bg-surface-50 transition-colors",
                    index % 2 === 0 ? "bg-white" : "bg-surface-50/50"
                  )}
                >
                  {config.columns.map(column => (
                    <td
                      key={column.field}
                      className="px-4 py-3 text-sm text-surface-700"
                    >
                      {formatValue(record[column.field])}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(record)}
                            className="p-1.5 hover:bg-surface-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4 text-surface-500" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(record.id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with count */}
      <div className="px-4 py-3 border-t border-surface-200 text-sm text-surface-500">
        {filteredAndSortedData.length} of {data.length} entries
      </div>
    </div>
  );
}
