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

// Theme-based colors for charts
const getChartColors = () => {
  // Check if we're in dark mode
  const isDark = document.documentElement.classList.contains('dark');

  return [
    'rgb(252, 173, 0)', // accent-yellow (same in both themes)
    'rgb(107, 177, 224)', // pastel-blue
    'rgb(139, 219, 177)', // pastel-green
    'rgb(240, 216, 144)', // pastel-yellow
    'rgb(200, 176, 240)', // pastel-purple
    isDark ? 'rgba(252, 173, 0, 0.6)' : 'rgba(252, 173, 0, 0.6)', // accent-yellow with opacity
    'rgba(107, 177, 224, 0.6)', // pastel-blue with opacity
    'rgba(139, 219, 177, 0.6)', // pastel-green with opacity
  ];
};

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
          <h3 className="text-lg font-semibold text-text-primary mb-4">
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
    const isDark = document.documentElement.classList.contains('dark');
    const colors = getChartColors();

    // Theme-aware colors
    const gridColor = isDark ? '#2d2d2d' : '#cbd5e1';
    const textColor = isDark ? '#cccccc' : '#475569';
    const tooltipBg = isDark ? '#1a1a1a' : '#ffffff';
    const tooltipBorder = isDark ? '#2d2d2d' : '#cbd5e1';
    const tooltipText = isDark ? '#ffffff' : '#0f172a';

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" tick={{ fill: textColor }} />
              <YAxis tick={{ fill: textColor }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: '12px',
                  color: tooltipText,
                }}
              />
              <Legend />
              {uniqueGroups.map((group, index) => (
                <Bar
                  key={group}
                  dataKey={group}
                  fill={colors[index % colors.length]}
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
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" tick={{ fill: textColor }} />
              <YAxis tick={{ fill: textColor }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: '12px',
                  color: tooltipText,
                }}
              />
              <Legend />
              {uniqueGroups.map((group, index) => (
                <Line
                  key={group}
                  type="monotone"
                  dataKey={group}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={{ fill: colors[index % colors.length] }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" tick={{ fill: textColor }} />
              <YAxis tick={{ fill: textColor }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: '12px',
                  color: tooltipText,
                }}
              />
              <Legend />
              {uniqueGroups.map((group, index) => (
                <Area
                  key={group}
                  type="monotone"
                  dataKey={group}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.4}
                  stroke={colors[index % colors.length]}
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
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: '12px',
                  color: tooltipText,
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
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          {title}
        </h3>
      )}
      {renderChart()}
    </Card>
  );
}
