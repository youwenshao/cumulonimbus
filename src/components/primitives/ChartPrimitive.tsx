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
import { Card } from '@/components/ui';
import type { DataRecord, ChartPrimitiveConfig } from '@/lib/primitives/types';

interface ChartPrimitiveProps {
  data: DataRecord[];
  config: ChartPrimitiveConfig;
  title?: string;
}

const COLORS = [
  '#FF3B30', // accent-red
  'rgba(107, 177, 224, 0.8)', // pastel-blue
  'rgba(139, 219, 177, 0.8)', // pastel-green
  'rgba(240, 216, 144, 0.8)', // pastel-yellow
  'rgba(200, 176, 240, 0.8)', // pastel-purple
  'rgba(255, 59, 48, 0.6)', // accent-red with opacity
  'rgba(107, 177, 224, 0.6)', // pastel-blue with opacity
  'rgba(139, 219, 177, 0.6)', // pastel-green with opacity
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
      <Card variant="outlined" padding="lg">
        {title && (
          <h3 className="text-lg font-semibold text-white mb-4">
            {title}
          </h3>
        )}
        <div className="h-64 flex items-center justify-center text-text-tertiary">
          No data to display
        </div>
      </Card>
    );
  }

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
              <XAxis dataKey="name" tick={{ fill: '#cccccc' }} />
              <YAxis tick={{ fill: '#cccccc' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #2d2d2d',
                  borderRadius: '12px',
                  color: '#ffffff',
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
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
              <XAxis dataKey="name" tick={{ fill: '#cccccc' }} />
              <YAxis tick={{ fill: '#cccccc' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #2d2d2d',
                  borderRadius: '12px',
                  color: '#ffffff',
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
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
              <XAxis dataKey="name" tick={{ fill: '#cccccc' }} />
              <YAxis tick={{ fill: '#cccccc' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #2d2d2d',
                  borderRadius: '12px',
                  color: '#ffffff',
                }}
              />
              <Legend />
              {uniqueGroups.map((group, index) => (
                <Area
                  key={group}
                  type="monotone"
                  dataKey={group}
                  fill={COLORS[index % COLORS.length]}
                  fillOpacity={0.4}
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
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #2d2d2d',
                  borderRadius: '12px',
                  color: '#ffffff',
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
    <Card variant="outlined" padding="lg">
      {title && (
        <h3 className="text-lg font-semibold text-white mb-4">
          {title}
        </h3>
      )}
      {renderChart()}
    </Card>
  );
}
