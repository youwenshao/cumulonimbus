'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { DataRecord, ChartPrimitiveConfig } from '@/lib/primitives/types';

interface ChartPrimitiveProps {
  data: DataRecord[];
  config: ChartPrimitiveConfig;
  title?: string;
}

const COLORS = [
  '#22c55e', // primary-500
  '#d946ef', // accent-500
  '#3b82f6', // blue-500
  '#f97316', // orange-500
  '#eab308', // yellow-500
  '#14b8a6', // teal-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
];

export function ChartPrimitive({ data, config, title }: ChartPrimitiveProps) {
  const { chartType, xAxis, yAxis, groupBy, aggregation = 'sum' } = config;

  const chartData = useMemo(() => {
    if (data.length === 0) return [];

    if (groupBy) {
      // Group and aggregate data
      const groups = new Map<string, Map<string, number>>();
      
      data.forEach(record => {
        const xValue = String(record[xAxis] || 'Unknown');
        const groupValue = String(record[groupBy] || 'Other');
        const yValue = Number(record[yAxis]) || 0;

        if (!groups.has(xValue)) {
          groups.set(xValue, new Map());
        }
        
        const xGroup = groups.get(xValue)!;
        const current = xGroup.get(groupValue) || 0;
        
        switch (aggregation) {
          case 'sum':
            xGroup.set(groupValue, current + yValue);
            break;
          case 'count':
            xGroup.set(groupValue, current + 1);
            break;
          case 'average':
            // For average, store sum and count, compute later
            xGroup.set(groupValue, current + yValue);
            break;
        }
      });

      // Convert to chart format
      return Array.from(groups.entries()).map(([xValue, groupData]) => {
        const result: Record<string, unknown> = { name: xValue };
        groupData.forEach((value, group) => {
          result[group] = value;
        });
        return result;
      });
    } else {
      // Simple aggregation by xAxis
      const aggregated = new Map<string, { sum: number; count: number }>();

      data.forEach(record => {
        const xValue = String(record[xAxis] || 'Unknown');
        const yValue = Number(record[yAxis]) || 0;

        const current = aggregated.get(xValue) || { sum: 0, count: 0 };
        aggregated.set(xValue, {
          sum: current.sum + yValue,
          count: current.count + 1,
        });
      });

      return Array.from(aggregated.entries()).map(([name, { sum, count }]) => ({
        name,
        value: aggregation === 'average' ? sum / count : aggregation === 'count' ? count : sum,
      }));
    }
  }, [data, xAxis, yAxis, groupBy, aggregation]);

  const uniqueGroups = useMemo(() => {
    if (!groupBy || data.length === 0) return ['value'];
    const groups = new Set(data.map(record => String(record[groupBy] || 'Other')));
    return Array.from(groups);
  }, [data, groupBy]);

  if (data.length === 0) {
    return (
      <div className="glass rounded-2xl p-6">
        {title && (
          <h3 className="text-lg font-semibold font-display text-surface-900 mb-4">
            {title}
          </h3>
        )}
        <div className="h-64 flex items-center justify-center text-surface-500">
          No data to display
        </div>
      </div>
    );
  }

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fill: '#64748b' }} />
              <YAxis tick={{ fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                }}
              />
              <Legend />
              {uniqueGroups.map((group, index) => (
                <Bar
                  key={group}
                  dataKey={group}
                  fill={COLORS[index % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fill: '#64748b' }} />
              <YAxis tick={{ fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                }}
              />
              <Legend />
              {uniqueGroups.map((group, index) => (
                <Line
                  key={group}
                  type="monotone"
                  dataKey={group}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: COLORS[index % COLORS.length] }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fill: '#64748b' }} />
              <YAxis tick={{ fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                }}
              />
              <Legend />
              {uniqueGroups.map((group, index) => (
                <Area
                  key={group}
                  type="monotone"
                  dataKey={group}
                  fill={COLORS[index % COLORS.length]}
                  fillOpacity={0.3}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="glass rounded-2xl p-6">
      {title && (
        <h3 className="text-lg font-semibold font-display text-surface-900 mb-4">
          {title}
        </h3>
      )}
      {renderChart()}
    </div>
  );
}
