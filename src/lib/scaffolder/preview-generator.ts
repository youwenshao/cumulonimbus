/**
 * Preview data generator for app specifications
 * Generates realistic mock data and preview configurations
 */

import type { ProjectSpec } from './types';

export interface DataRecord {
  id: string;
  [key: string]: string | number | boolean | Date | null;
  createdAt: string;
}

export interface PreviewData {
  spec: ProjectSpec;
  mockData: DataRecord[];
  viewMode: 'mobile' | 'tablet' | 'desktop';
  timestamp: string;
}

// Sample data generators by field type
const SAMPLE_DATA: Record<string, () => string | number | boolean> = {
  text: () => ['Meeting notes', 'Weekly review', 'Project update', 'Quick task'][Math.floor(Math.random() * 4)],
  textarea: () => ['Completed the main feature implementation.', 'Need to follow up on client feedback.', 'Discussed roadmap priorities.'][Math.floor(Math.random() * 3)],
  number: () => Math.floor(Math.random() * 1000) / 10,
  date: () => {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    return date.toISOString().split('T')[0];
  },
  time: () => `${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
  checkbox: () => Math.random() > 0.5,
  email: () => ['john@example.com', 'jane@company.org', 'user@test.io'][Math.floor(Math.random() * 3)],
  url: () => ['https://example.com', 'https://company.org', 'https://project.io'][Math.floor(Math.random() * 3)],
};

// Category-specific mock data
const CATEGORY_MOCK_DATA: Record<string, Record<string, () => string | number | boolean>> = {
  expense: {
    amount: () => [12.99, 45.50, 89.00, 156.25, 23.75, 67.80][Math.floor(Math.random() * 6)],
    category: () => ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Other'][Math.floor(Math.random() * 6)],
    description: () => ['Grocery shopping', 'Gas', 'New shoes', 'Electric bill', 'Movie tickets', 'Coffee'][Math.floor(Math.random() * 6)],
    paymentMethod: () => ['Cash', 'Credit Card', 'Debit Card', 'PayPal'][Math.floor(Math.random() * 4)],
  },
  habit: {
    habitName: () => ['Morning meditation', 'Exercise', 'Read 30 mins', 'Drink water', 'Journal'][Math.floor(Math.random() * 5)],
    completed: () => Math.random() > 0.3,
    streak: () => Math.floor(Math.random() * 30),
    notes: () => ['Felt great!', 'Skipped today', 'Made progress', ''][Math.floor(Math.random() * 4)],
  },
  project: {
    taskName: () => ['Design review', 'Code implementation', 'Testing', 'Documentation', 'Deployment'][Math.floor(Math.random() * 5)],
    status: () => ['To Do', 'In Progress', 'Done', 'Blocked'][Math.floor(Math.random() * 4)],
    priority: () => ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
    assignee: () => ['John', 'Jane', 'Mike', 'Sarah'][Math.floor(Math.random() * 4)],
  },
  health: {
    metric: () => ['Weight', 'Steps', 'Sleep hours', 'Water intake', 'Heart rate'][Math.floor(Math.random() * 5)],
    value: () => [72.5, 8500, 7.5, 8, 72][Math.floor(Math.random() * 5)],
    unit: () => ['kg', 'steps', 'hours', 'glasses', 'bpm'][Math.floor(Math.random() * 5)],
  },
  time: {
    activity: () => ['Development', 'Meeting', 'Review', 'Planning', 'Research'][Math.floor(Math.random() * 5)],
    duration: () => [30, 60, 90, 120, 45][Math.floor(Math.random() * 5)],
    category: () => ['Work', 'Personal', 'Learning', 'Admin'][Math.floor(Math.random() * 4)],
  },
};

/**
 * Generate a single mock data record based on field definitions
 */
function generateMockRecord(
  spec: ProjectSpec,
  index: number
): DataRecord {
  const record: DataRecord = {
    id: `mock-${index + 1}`,
    createdAt: new Date(Date.now() - index * 86400000).toISOString(),
  };

  const categoryData = CATEGORY_MOCK_DATA[spec.category || 'custom'] || {};

  for (const field of spec.dataStore.fields) {
    // First check if we have category-specific data for this field name
    const fieldNameLower = field.name.toLowerCase();
    const categoryGenerator = Object.entries(categoryData).find(
      ([key]) => fieldNameLower.includes(key.toLowerCase())
    );

    if (categoryGenerator) {
      record[field.name] = categoryGenerator[1]();
    } else if (field.type === 'select' && field.options && field.options.length > 0) {
      // For select fields, pick from options
      record[field.name] = field.options[Math.floor(Math.random() * field.options.length)];
    } else if (field.defaultValue !== undefined) {
      // Use default value if available
      record[field.name] = field.defaultValue;
    } else {
      // Use type-based generator
      const generator = SAMPLE_DATA[field.type];
      record[field.name] = generator ? generator() : `Sample ${field.label}`;
    }
  }

  return record;
}

/**
 * Generate preview data for a project specification
 */
export function generatePreviewData(
  spec: ProjectSpec,
  recordCount = 5,
  viewMode: 'mobile' | 'tablet' | 'desktop' = 'desktop'
): PreviewData {
  const mockData: DataRecord[] = [];

  for (let i = 0; i < recordCount; i++) {
    mockData.push(generateMockRecord(spec, i));
  }

  return {
    spec,
    mockData,
    viewMode,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate chart-specific mock data
 */
export function generateChartData(
  spec: ProjectSpec,
  chartConfig: { yAxis: string; xAxis?: string; groupBy?: string }
): { labels: string[]; data: number[] } {
  const preview = generatePreviewData(spec, 7);
  
  // Extract labels and data based on chart config
  const labels = preview.mockData.map((record, i) => {
    if (chartConfig.xAxis && record[chartConfig.xAxis]) {
      return String(record[chartConfig.xAxis]);
    }
    if (chartConfig.groupBy && record[chartConfig.groupBy]) {
      return String(record[chartConfig.groupBy]);
    }
    return `Day ${i + 1}`;
  });

  const data = preview.mockData.map(record => {
    const value = record[chartConfig.yAxis];
    return typeof value === 'number' ? value : Math.random() * 100;
  });

  return { labels, data };
}

/**
 * Get aggregated data for pie charts
 */
export function generatePieChartData(
  spec: ProjectSpec,
  groupByField: string,
  valueField: string
): { labels: string[]; data: number[] } {
  const preview = generatePreviewData(spec, 10);
  
  // Group and aggregate
  const groups = new Map<string, number>();
  
  for (const record of preview.mockData) {
    const groupKey = String(record[groupByField] || 'Other');
    const value = typeof record[valueField] === 'number' ? record[valueField] : 1;
    groups.set(groupKey, (groups.get(groupKey) || 0) + value);
  }

  return {
    labels: Array.from(groups.keys()),
    data: Array.from(groups.values()),
  };
}
