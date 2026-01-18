/**
 * Pattern Library - Pre-built app templates
 * Rich template system with complete specifications and customization points
 */

import type { ProjectSpec } from './types';

export type TrackerCategory = 'expense' | 'habit' | 'project' | 'health' | 'learning' | 'inventory' | 'time' | 'custom';

export interface DataRecord {
  id: string;
  [key: string]: string | number | boolean | null;
  createdAt: string;
}

export interface CustomizationOption {
  id: string;
  label: string;
  description?: string;
}

export interface CustomizationPoint {
  id: string;
  label: string;
  description: string;
  type: 'field-selection' | 'view-type' | 'validation-rules' | 'feature-toggle' | 'text-input';
  options?: CustomizationOption[];
  defaultValue: string | string[];
  required?: boolean;
}

export interface AppTemplate {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  category: TrackerCategory;
  icon: string;
  color: string;
  preview: {
    demoData: DataRecord[];
  };
  spec: ProjectSpec;
  customizationPoints: CustomizationPoint[];
  useCases: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}

/**
 * The Pattern Library - Collection of pre-built app templates
 */
export const PATTERN_LIBRARY: AppTemplate[] = [
  // EXPENSE TRACKER
  {
    id: 'expense-tracker-basic',
    name: 'Expense Tracker',
    description: 'Track daily expenses with categories and spending analysis',
    longDescription: 'A comprehensive expense tracking app that helps you monitor your spending habits, categorize purchases, and visualize your budget over time.',
    category: 'expense',
    icon: '💰',
    color: '#8bd9b1', // pastel-green
    preview: {
      demoData: [
        { id: '1', amount: 45.99, category: 'Food', description: 'Grocery shopping', date: '2026-01-10', createdAt: new Date().toISOString() },
        { id: '2', amount: 12.50, category: 'Transport', description: 'Gas', date: '2026-01-10', createdAt: new Date().toISOString() },
        { id: '3', amount: 89.00, category: 'Shopping', description: 'New shoes', date: '2026-01-09', createdAt: new Date().toISOString() },
        { id: '4', amount: 15.00, category: 'Entertainment', description: 'Movie tickets', date: '2026-01-08', createdAt: new Date().toISOString() },
        { id: '5', amount: 120.00, category: 'Bills', description: 'Phone bill', date: '2026-01-07', createdAt: new Date().toISOString() },
      ],
    },
    spec: {
      name: 'My Expense Tracker',
      description: 'Track and categorize your daily expenses',
      category: 'expense',
      dataStore: {
        name: 'expenses',
        label: 'Expenses',
        fields: [
          { name: 'amount', label: 'Amount', type: 'number', required: true, placeholder: '0.00' },
          { name: 'category', label: 'Category', type: 'select', required: true, options: ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Other'] },
          { name: 'description', label: 'Description', type: 'text', required: false, placeholder: 'What was this expense for?' },
          { name: 'date', label: 'Date', type: 'date', required: true },
        ],
      },
      views: [
        { type: 'table', title: 'All Expenses', config: { columns: ['date', 'description', 'category', 'amount'], sortBy: 'date', sortOrder: 'desc' } },
        { type: 'chart', title: 'Spending by Category', config: { chartType: 'pie', yAxis: 'amount', xAxis: 'category', groupBy: 'category', aggregation: 'sum' } },
      ],
      features: { allowEdit: true, allowDelete: true, allowExport: false },
    },
    customizationPoints: [
      {
        id: 'categories',
        label: 'Expense Categories',
        description: 'Customize the categories for your expenses',
        type: 'field-selection',
        options: [
          { id: 'Food', label: 'Food & Dining' },
          { id: 'Transport', label: 'Transportation' },
          { id: 'Shopping', label: 'Shopping' },
          { id: 'Bills', label: 'Bills & Utilities' },
          { id: 'Entertainment', label: 'Entertainment' },
          { id: 'Health', label: 'Healthcare' },
          { id: 'Education', label: 'Education' },
          { id: 'Other', label: 'Other' },
        ],
        defaultValue: ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Other'],
      },
      {
        id: 'chartType',
        label: 'Visualization Style',
        description: 'Choose how to visualize your spending',
        type: 'view-type',
        options: [
          { id: 'pie', label: 'Pie Chart', description: 'See proportions of spending' },
          { id: 'bar', label: 'Bar Chart', description: 'Compare categories side by side' },
        ],
        defaultValue: 'pie',
      },
    ],
    useCases: ['Personal budgeting', 'Business expenses', 'Travel expense tracking', 'Shared household expenses'],
    difficulty: 'beginner',
    tags: ['finance', 'budgeting', 'money', 'spending'],
  },

  // HABIT TRACKER
  {
    id: 'habit-tracker-daily',
    name: 'Daily Habit Tracker',
    description: 'Build lasting habits with daily tracking and streaks',
    longDescription: 'Track your daily habits, build streaks, and visualize your progress. Perfect for morning routines, fitness goals, and personal development.',
    category: 'habit',
    icon: '✅',
    color: '#c8b0f0', // pastel-purple
    preview: {
      demoData: [
        { id: '1', habitName: 'Morning meditation', completed: true, date: '2026-01-10', streak: 15, notes: 'Felt peaceful', createdAt: new Date().toISOString() },
        { id: '2', habitName: 'Exercise', completed: true, date: '2026-01-10', streak: 8, notes: '30 min run', createdAt: new Date().toISOString() },
        { id: '3', habitName: 'Read 30 mins', completed: false, date: '2026-01-10', streak: 0, notes: '', createdAt: new Date().toISOString() },
        { id: '4', habitName: 'Drink 8 glasses', completed: true, date: '2026-01-10', streak: 22, notes: '', createdAt: new Date().toISOString() },
      ],
    },
    spec: {
      name: 'My Habit Tracker',
      description: 'Build and maintain positive daily habits',
      category: 'habit',
      dataStore: {
        name: 'habits',
        label: 'Habits',
        fields: [
          { name: 'habitName', label: 'Habit', type: 'text', required: true, placeholder: 'e.g., Morning meditation' },
          { name: 'completed', label: 'Completed', type: 'boolean', required: true },
          { name: 'date', label: 'Date', type: 'date', required: true },
          { name: 'streak', label: 'Current Streak', type: 'number', required: false },
          { name: 'notes', label: 'Notes', type: 'textarea', required: false, placeholder: 'How did it go?' },
        ],
      },
      views: [
        { type: 'table', title: 'Habit Log', config: { columns: ['date', 'habitName', 'completed', 'streak'], sortBy: 'date', sortOrder: 'desc' } },
        { type: 'chart', title: 'Completion Rate', config: { chartType: 'bar', yAxis: 'streak', xAxis: 'habitName', aggregation: 'average' } },
      ],
      features: { allowEdit: true, allowDelete: true, allowExport: false },
    },
    customizationPoints: [
      {
        id: 'defaultHabits',
        label: 'Starter Habits',
        description: 'Pre-fill with common habits to track',
        type: 'field-selection',
        options: [
          { id: 'meditation', label: 'Meditation', description: 'Daily mindfulness practice' },
          { id: 'exercise', label: 'Exercise', description: 'Physical activity' },
          { id: 'reading', label: 'Reading', description: 'Read for 30 minutes' },
          { id: 'water', label: 'Drink Water', description: '8 glasses a day' },
          { id: 'sleep', label: 'Sleep 8 hours', description: 'Quality rest' },
          { id: 'journal', label: 'Journaling', description: 'Daily reflection' },
        ],
        defaultValue: ['meditation', 'exercise', 'reading', 'water'],
      },
    ],
    useCases: ['Morning routines', 'Fitness tracking', 'Personal development', 'Breaking bad habits'],
    difficulty: 'beginner',
    tags: ['habits', 'productivity', 'wellness', 'routines'],
  },

  // PROJECT TRACKER
  {
    id: 'project-tracker-kanban',
    name: 'Project Task Manager',
    description: 'Organize tasks with status tracking and priorities',
    longDescription: 'A flexible task management system with status tracking, priority levels, and due dates. Perfect for personal projects or small team collaboration.',
    category: 'project',
    icon: '📋',
    color: '#f0d890', // pastel-yellow
    preview: {
      demoData: [
        { id: '1', taskName: 'Design homepage mockup', status: 'Done', priority: 'High', dueDate: '2026-01-08', assignee: 'Me', createdAt: new Date().toISOString() },
        { id: '2', taskName: 'Implement user auth', status: 'In Progress', priority: 'High', dueDate: '2026-01-12', assignee: 'Me', createdAt: new Date().toISOString() },
        { id: '3', taskName: 'Write documentation', status: 'To Do', priority: 'Medium', dueDate: '2026-01-15', assignee: 'Me', createdAt: new Date().toISOString() },
        { id: '4', taskName: 'Deploy to production', status: 'To Do', priority: 'Low', dueDate: '2026-01-20', assignee: 'Me', createdAt: new Date().toISOString() },
      ],
    },
    spec: {
      name: 'My Project Tracker',
      description: 'Manage tasks and track project progress',
      category: 'project',
      dataStore: {
        name: 'tasks',
        label: 'Tasks',
        fields: [
          { name: 'taskName', label: 'Task', type: 'text', required: true, placeholder: 'What needs to be done?' },
          { name: 'status', label: 'Status', type: 'select', required: true, options: ['To Do', 'In Progress', 'Done', 'Blocked'] },
          { name: 'priority', label: 'Priority', type: 'select', required: true, options: ['High', 'Medium', 'Low'] },
          { name: 'dueDate', label: 'Due Date', type: 'date', required: false },
          { name: 'assignee', label: 'Assignee', type: 'text', required: false, placeholder: 'Who is responsible?' },
          { name: 'notes', label: 'Notes', type: 'textarea', required: false },
        ],
      },
      views: [
        { type: 'table', title: 'All Tasks', config: { columns: ['taskName', 'status', 'priority', 'dueDate'], sortBy: 'dueDate', sortOrder: 'asc' } },
        { type: 'cards', title: 'Task Cards', config: { titleField: 'taskName', subtitleField: 'status', bodyFields: ['priority', 'dueDate'], layout: 'grid' } },
      ],
      features: { allowEdit: true, allowDelete: true, allowExport: false },
    },
    customizationPoints: [
      {
        id: 'statuses',
        label: 'Task Statuses',
        description: 'Customize your workflow stages',
        type: 'field-selection',
        options: [
          { id: 'To Do', label: 'To Do' },
          { id: 'In Progress', label: 'In Progress' },
          { id: 'Review', label: 'In Review' },
          { id: 'Done', label: 'Done' },
          { id: 'Blocked', label: 'Blocked' },
          { id: 'Archived', label: 'Archived' },
        ],
        defaultValue: ['To Do', 'In Progress', 'Done', 'Blocked'],
      },
    ],
    useCases: ['Personal projects', 'Side hustles', 'Freelance work', 'Team collaboration'],
    difficulty: 'beginner',
    tags: ['tasks', 'projects', 'productivity', 'kanban'],
  },

  // HEALTH TRACKER
  {
    id: 'health-tracker-wellness',
    name: 'Health & Wellness Log',
    description: 'Track health metrics like weight, sleep, and activity',
    longDescription: 'Monitor your overall health and wellness with daily metric tracking. Track weight, sleep quality, water intake, and more.',
    category: 'health',
    icon: '❤️',
    color: '#fca000', // accent-yellow (using accent as red alternative)
    preview: {
      demoData: [
        { id: '1', metric: 'Weight', value: 72.5, unit: 'kg', date: '2026-01-10', notes: 'Morning measurement', createdAt: new Date().toISOString() },
        { id: '2', metric: 'Sleep', value: 7.5, unit: 'hours', date: '2026-01-10', notes: 'Good quality', createdAt: new Date().toISOString() },
        { id: '3', metric: 'Water', value: 8, unit: 'glasses', date: '2026-01-10', notes: '', createdAt: new Date().toISOString() },
        { id: '4', metric: 'Steps', value: 8500, unit: 'steps', date: '2026-01-10', notes: 'Walked to work', createdAt: new Date().toISOString() },
      ],
    },
    spec: {
      name: 'My Health Log',
      description: 'Track and monitor your health metrics',
      category: 'health',
      dataStore: {
        name: 'health_entries',
        label: 'Health Entries',
        fields: [
          { name: 'metric', label: 'Metric', type: 'select', required: true, options: ['Weight', 'Sleep', 'Water', 'Steps', 'Blood Pressure', 'Heart Rate'] },
          { name: 'value', label: 'Value', type: 'number', required: true, placeholder: '0' },
          { name: 'unit', label: 'Unit', type: 'text', required: false, placeholder: 'e.g., kg, hours, steps' },
          { name: 'date', label: 'Date', type: 'date', required: true },
          { name: 'notes', label: 'Notes', type: 'textarea', required: false },
        ],
      },
      views: [
        { type: 'table', title: 'Health Log', config: { columns: ['date', 'metric', 'value', 'unit'], sortBy: 'date', sortOrder: 'desc' } },
        { type: 'chart', title: 'Trend Over Time', config: { chartType: 'line', yAxis: 'value', xAxis: 'date', groupBy: 'metric' } },
      ],
      features: { allowEdit: true, allowDelete: true, allowExport: false },
    },
    customizationPoints: [
      {
        id: 'metrics',
        label: 'Health Metrics',
        description: 'Choose which health metrics to track',
        type: 'field-selection',
        options: [
          { id: 'Weight', label: 'Weight' },
          { id: 'Sleep', label: 'Sleep Hours' },
          { id: 'Water', label: 'Water Intake' },
          { id: 'Steps', label: 'Steps' },
          { id: 'Blood Pressure', label: 'Blood Pressure' },
          { id: 'Heart Rate', label: 'Heart Rate' },
          { id: 'Calories', label: 'Calories' },
          { id: 'Mood', label: 'Mood' },
        ],
        defaultValue: ['Weight', 'Sleep', 'Water', 'Steps'],
      },
    ],
    useCases: ['Weight loss tracking', 'Sleep monitoring', 'Fitness progress', 'General wellness'],
    difficulty: 'beginner',
    tags: ['health', 'fitness', 'wellness', 'metrics'],
  },

  // TIME TRACKER
  {
    id: 'time-tracker-work',
    name: 'Time Tracker',
    description: 'Log hours spent on different activities and projects',
    longDescription: 'Track how you spend your time across different activities, projects, and clients. Perfect for freelancers or anyone wanting to understand their time usage.',
    category: 'time',
    icon: '⏱️',
    color: '#6bb1e0', // pastel-blue
    preview: {
      demoData: [
        { id: '1', activity: 'Client Project A', duration: 120, category: 'Work', date: '2026-01-10', notes: 'Feature development', createdAt: new Date().toISOString() },
        { id: '2', activity: 'Team Meeting', duration: 45, category: 'Work', date: '2026-01-10', notes: 'Sprint planning', createdAt: new Date().toISOString() },
        { id: '3', activity: 'Learning React', duration: 60, category: 'Learning', date: '2026-01-10', notes: 'Hooks tutorial', createdAt: new Date().toISOString() },
        { id: '4', activity: 'Admin Tasks', duration: 30, category: 'Admin', date: '2026-01-10', notes: 'Emails', createdAt: new Date().toISOString() },
      ],
    },
    spec: {
      name: 'My Time Tracker',
      description: 'Track time spent on activities and projects',
      category: 'time',
      dataStore: {
        name: 'time_entries',
        label: 'Time Entries',
        fields: [
          { name: 'activity', label: 'Activity', type: 'text', required: true, placeholder: 'What did you work on?' },
          { name: 'duration', label: 'Duration (minutes)', type: 'number', required: true, placeholder: '0' },
          { name: 'category', label: 'Category', type: 'select', required: true, options: ['Work', 'Learning', 'Personal', 'Admin', 'Other'] },
          { name: 'date', label: 'Date', type: 'date', required: true },
          { name: 'notes', label: 'Notes', type: 'textarea', required: false },
        ],
      },
      views: [
        { type: 'table', title: 'Time Log', config: { columns: ['date', 'activity', 'category', 'duration'], sortBy: 'date', sortOrder: 'desc' } },
        { type: 'chart', title: 'Time by Category', config: { chartType: 'pie', yAxis: 'duration', xAxis: 'category', groupBy: 'category', aggregation: 'sum' } },
      ],
      features: { allowEdit: true, allowDelete: true, allowExport: false },
    },
    customizationPoints: [
      {
        id: 'categories',
        label: 'Time Categories',
        description: 'Customize categories for your time entries',
        type: 'field-selection',
        options: [
          { id: 'Work', label: 'Work' },
          { id: 'Learning', label: 'Learning' },
          { id: 'Personal', label: 'Personal' },
          { id: 'Admin', label: 'Admin' },
          { id: 'Client A', label: 'Client A' },
          { id: 'Client B', label: 'Client B' },
          { id: 'Other', label: 'Other' },
        ],
        defaultValue: ['Work', 'Learning', 'Personal', 'Admin', 'Other'],
      },
    ],
    useCases: ['Freelance billing', 'Productivity analysis', 'Project estimation', 'Work-life balance'],
    difficulty: 'beginner',
    tags: ['time', 'productivity', 'freelance', 'work'],
  },

  // INVENTORY TRACKER
  {
    id: 'inventory-tracker-simple',
    name: 'Simple Inventory',
    description: 'Track items, quantities, and locations',
    longDescription: 'A simple inventory management system for tracking items, their quantities, and locations. Great for home inventory, collections, or small business stock.',
    category: 'inventory',
    icon: '📦',
    color: '#c8b0f0', // pastel-purple
    preview: {
      demoData: [
        { id: '1', itemName: 'USB Cables', quantity: 15, category: 'Electronics', location: 'Drawer A', createdAt: new Date().toISOString() },
        { id: '2', itemName: 'Notebooks', quantity: 8, category: 'Office', location: 'Shelf B', createdAt: new Date().toISOString() },
        { id: '3', itemName: 'Batteries AA', quantity: 24, category: 'Electronics', location: 'Cabinet', createdAt: new Date().toISOString() },
        { id: '4', itemName: 'Printer Paper', quantity: 3, category: 'Office', location: 'Closet', createdAt: new Date().toISOString() },
      ],
    },
    spec: {
      name: 'My Inventory',
      description: 'Track items and their quantities',
      category: 'inventory',
      dataStore: {
        name: 'inventory',
        label: 'Inventory Items',
        fields: [
          { name: 'itemName', label: 'Item Name', type: 'text', required: true, placeholder: 'What is the item?' },
          { name: 'quantity', label: 'Quantity', type: 'number', required: true, placeholder: '0' },
          { name: 'category', label: 'Category', type: 'select', required: true, options: ['Electronics', 'Office', 'Kitchen', 'Tools', 'Other'] },
          { name: 'location', label: 'Location', type: 'text', required: false, placeholder: 'Where is it stored?' },
        ],
      },
      views: [
        { type: 'table', title: 'All Items', config: { columns: ['itemName', 'quantity', 'category', 'location'], sortBy: 'itemName', sortOrder: 'asc' } },
        { type: 'cards', title: 'Item Cards', config: { titleField: 'itemName', subtitleField: 'quantity', bodyFields: ['category', 'location'], layout: 'grid' } },
      ],
      features: { allowEdit: true, allowDelete: true, allowExport: false },
    },
    customizationPoints: [
      {
        id: 'categories',
        label: 'Item Categories',
        description: 'Customize categories for your items',
        type: 'field-selection',
        options: [
          { id: 'Electronics', label: 'Electronics' },
          { id: 'Office', label: 'Office Supplies' },
          { id: 'Kitchen', label: 'Kitchen' },
          { id: 'Tools', label: 'Tools' },
          { id: 'Books', label: 'Books' },
          { id: 'Clothing', label: 'Clothing' },
          { id: 'Other', label: 'Other' },
        ],
        defaultValue: ['Electronics', 'Office', 'Kitchen', 'Tools', 'Other'],
      },
    ],
    useCases: ['Home inventory', 'Collections tracking', 'Small business stock', 'Moving checklist'],
    difficulty: 'beginner',
    tags: ['inventory', 'tracking', 'organization', 'stock'],
  },
];

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): AppTemplate | undefined {
  return PATTERN_LIBRARY.find(t => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TrackerCategory): AppTemplate[] {
  return PATTERN_LIBRARY.filter(t => t.category === category);
}

/**
 * Search templates by keyword
 */
export function searchTemplates(query: string): AppTemplate[] {
  const lowerQuery = query.toLowerCase();
  return PATTERN_LIBRARY.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.includes(lowerQuery)) ||
    t.useCases.some(uc => uc.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Apply customizations to a template spec
 */
export function applyCustomizations(
  template: AppTemplate,
  customizations: Record<string, string | string[]>
): ProjectSpec {
  const spec = JSON.parse(JSON.stringify(template.spec)) as ProjectSpec;

  for (const point of template.customizationPoints) {
    const customValue = customizations[point.id];
    if (!customValue) continue;

    // Apply customization based on type
    switch (point.type) {
      case 'field-selection':
        // Update select field options
        const selectField = spec.dataStore.fields.find(f => 
          f.type === 'select' && 
          point.id.toLowerCase().includes(f.name.toLowerCase().replace('category', ''))
        );
        if (selectField && Array.isArray(customValue)) {
          selectField.options = customValue;
        }
        break;

      case 'view-type':
        // Update chart type
        const chartView = spec.views.find(v => v.type === 'chart');
        if (chartView && typeof customValue === 'string') {
          (chartView.config as { chartType: string }).chartType = customValue;
        }
        break;

      case 'text-input':
        // Update app name or description
        if (point.id === 'appName' && typeof customValue === 'string') {
          spec.name = customValue;
        }
        if (point.id === 'appDescription' && typeof customValue === 'string') {
          spec.description = customValue;
        }
        break;
    }
  }

  return spec;
}

/**
 * Get template categories with counts
 */
export function getCategories(): Array<{ category: TrackerCategory; count: number; icon: string; label: string }> {
  const categoryInfo: Record<TrackerCategory, { icon: string; label: string }> = {
    expense: { icon: '💰', label: 'Expense' },
    habit: { icon: '✅', label: 'Habit' },
    project: { icon: '📋', label: 'Project' },
    health: { icon: '❤️', label: 'Health' },
    learning: { icon: '📚', label: 'Learning' },
    inventory: { icon: '📦', label: 'Inventory' },
    time: { icon: '⏱️', label: 'Time' },
    custom: { icon: '⚙️', label: 'Custom' },
  };

  const counts = new Map<TrackerCategory, number>();
  for (const template of PATTERN_LIBRARY) {
    counts.set(template.category, (counts.get(template.category) || 0) + 1);
  }

  return Object.entries(categoryInfo).map(([category, info]) => ({
    category: category as TrackerCategory,
    count: counts.get(category as TrackerCategory) || 0,
    ...info,
  }));
}
