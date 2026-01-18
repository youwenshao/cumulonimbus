/**
 * Sample ProjectSpec Fixtures for Testing
 * Provides valid and invalid spec examples
 */

import type { ProjectSpec } from '@/lib/scaffolder/types';

/**
 * Valid expense tracker spec
 */
export const validExpenseSpec: ProjectSpec = {
  name: 'Expense Tracker',
  description: 'Track daily expenses and visualize spending patterns',
  category: 'expense',
  dataStore: {
    name: 'expenses',
    label: 'Expenses',
    fields: [
      {
        name: 'amount',
        label: 'Amount',
        type: 'number',
        required: true,
        validation: { min: 0 },
      },
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        required: true,
        options: ['Food', 'Transport', 'Entertainment', 'Bills', 'Shopping', 'Other'],
      },
      {
        name: 'description',
        label: 'Description',
        type: 'text',
        required: false,
      },
      {
        name: 'date',
        label: 'Date',
        type: 'date',
        required: true,
      },
      {
        name: 'paymentMethod',
        label: 'Payment Method',
        type: 'select',
        required: false,
        options: ['Cash', 'Credit Card', 'Debit Card', 'Digital Wallet'],
      },
    ],
  },
  views: [
    {
      type: 'table',
      title: 'All Expenses',
      config: {
        columns: ['amount', 'category', 'description', 'date'],
        sortBy: 'date',
        sortOrder: 'desc',
      },
    },
    {
      type: 'chart',
      title: 'Spending by Category',
      config: {
        chartType: 'pie',
        xAxis: 'category',
        yAxis: 'amount',
        groupBy: 'category',
        aggregation: 'sum',
      },
    },
    {
      type: 'chart',
      title: 'Spending Over Time',
      config: {
        chartType: 'line',
        xAxis: 'date',
        yAxis: 'amount',
        aggregation: 'sum',
      },
    },
  ],
  features: {
    allowEdit: true,
    allowDelete: true,
    allowExport: true,
  },
};

/**
 * Valid habit tracker spec
 */
export const validHabitSpec: ProjectSpec = {
  name: 'Habit Tracker',
  description: 'Track daily habits and build consistency',
  category: 'habit',
  dataStore: {
    name: 'habits',
    label: 'Habits',
    fields: [
      {
        name: 'habitName',
        label: 'Habit Name',
        type: 'text',
        required: true,
      },
      {
        name: 'completed',
        label: 'Completed',
        type: 'boolean',
        required: true,
        defaultValue: false,
      },
      {
        name: 'date',
        label: 'Date',
        type: 'date',
        required: true,
      },
      {
        name: 'notes',
        label: 'Notes',
        type: 'textarea',
        required: false,
      },
    ],
  },
  views: [
    {
      type: 'table',
      title: 'Habit Log',
      config: {
        columns: ['habitName', 'completed', 'date', 'notes'],
        sortBy: 'date',
        sortOrder: 'desc',
      },
    },
    {
      type: 'chart',
      title: 'Completion Rate',
      config: {
        chartType: 'bar',
        xAxis: 'habitName',
        yAxis: 'completed',
        aggregation: 'count',
      },
    },
  ],
  features: {
    allowEdit: true,
    allowDelete: true,
    allowExport: false,
  },
};

/**
 * Minimal valid spec (edge case)
 */
export const minimalValidSpec: ProjectSpec = {
  name: 'Minimal App',
  description: 'A minimal app',
  category: 'custom',
  dataStore: {
    name: 'items',
    label: 'Items',
    fields: [
      {
        name: 'name',
        label: 'Name',
        type: 'text',
        required: true,
      },
    ],
  },
  views: [
    {
      type: 'table',
      title: 'All Items',
      config: {
        columns: ['name'],
      },
    },
  ],
  features: {
    allowEdit: false,
    allowDelete: false,
    allowExport: false,
  },
};

/**
 * Invalid spec - missing name
 */
export const invalidSpecNoName: Partial<ProjectSpec> = {
  name: '',
  description: 'A test app',
  category: 'custom',
  dataStore: {
    name: 'items',
    label: 'Items',
    fields: [
      {
        name: 'name',
        label: 'Name',
        type: 'text',
        required: true,
      },
    ],
  },
  views: [],
  features: {
    allowEdit: false,
    allowDelete: false,
    allowExport: false,
  },
};

/**
 * Invalid spec - no fields
 */
export const invalidSpecNoFields: Partial<ProjectSpec> = {
  name: 'Invalid App',
  description: 'Missing fields',
  category: 'custom',
  dataStore: {
    name: 'items',
    label: 'Items',
    fields: [],
  },
  views: [
    {
      type: 'table',
      title: 'All Items',
      config: {},
    },
  ],
  features: {
    allowEdit: false,
    allowDelete: false,
    allowExport: false,
  },
};

/**
 * Invalid spec - duplicate field names
 */
export const invalidSpecDuplicateFields: Partial<ProjectSpec> = {
  name: 'Duplicate Fields App',
  description: 'Has duplicate field names',
  category: 'custom',
  dataStore: {
    name: 'items',
    label: 'Items',
    fields: [
      {
        name: 'title',
        label: 'Title',
        type: 'text',
        required: true,
      },
      {
        name: 'title', // Duplicate
        label: 'Another Title',
        type: 'text',
        required: false,
      },
    ],
  },
  views: [
    {
      type: 'table',
      title: 'All Items',
      config: {
        columns: ['title'],
      },
    },
  ],
  features: {
    allowEdit: false,
    allowDelete: false,
    allowExport: false,
  },
};

/**
 * Invalid spec - select field without options
 */
export const invalidSpecSelectNoOptions: Partial<ProjectSpec> = {
  name: 'Invalid Select App',
  description: 'Select field with no options',
  category: 'custom',
  dataStore: {
    name: 'items',
    label: 'Items',
    fields: [
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: [], // Empty options
      },
    ],
  },
  views: [
    {
      type: 'table',
      title: 'All Items',
      config: {
        columns: ['status'],
      },
    },
  ],
  features: {
    allowEdit: false,
    allowDelete: false,
    allowExport: false,
  },
};

/**
 * Invalid spec - chart with non-existent field
 */
export const invalidSpecChartBadField: Partial<ProjectSpec> = {
  name: 'Invalid Chart App',
  description: 'Chart references non-existent field',
  category: 'custom',
  dataStore: {
    name: 'items',
    label: 'Items',
    fields: [
      {
        name: 'title',
        label: 'Title',
        type: 'text',
        required: true,
      },
    ],
  },
  views: [
    {
      type: 'chart',
      title: 'Invalid Chart',
      config: {
        chartType: 'bar',
        xAxis: 'title',
        yAxis: 'nonExistent', // Field doesn't exist
        aggregation: 'sum',
      },
    },
  ],
  features: {
    allowEdit: false,
    allowDelete: false,
    allowExport: false,
  },
};
