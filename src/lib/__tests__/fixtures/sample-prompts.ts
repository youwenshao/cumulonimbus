/**
 * Sample User Prompts for Testing
 * Various user input examples for intent parsing
 */

/**
 * Clear expense tracker prompts
 */
export const expensePrompts = [
  'I want to track my daily expenses',
  'Help me manage my spending and see where my money goes',
  'Build an app to track expenses by category',
  'I need to monitor my budget and spending habits',
  'Track my daily costs and purchases',
];

/**
 * Clear habit tracker prompts
 */
export const habitPrompts = [
  'I want to track my daily habits',
  'Help me build a routine tracker',
  'Track my morning workout habit',
  'Monitor my meditation practice daily',
  'Keep track of my reading habit',
];

/**
 * Clear project tracker prompts
 */
export const projectPrompts = [
  'I need a task management app',
  'Help me track my projects and deadlines',
  'Manage my work assignments',
  'Track todos and project progress',
  'Organize my tasks and projects',
];

/**
 * Clear health tracker prompts
 */
export const healthPrompts = [
  'Track my daily calories and nutrition',
  'Monitor my weight loss journey',
  'Log my daily water intake',
  'Track my sleep hours',
  'Monitor my fitness and exercise',
];

/**
 * Ambiguous prompts (could be multiple categories)
 */
export const ambiguousPrompts = [
  'I want to track things',
  'Help me organize my stuff',
  'Make an app for me',
  'I need to keep records',
  'Track daily activities',
];

/**
 * Complex prompts with multiple features
 */
export const complexPrompts = [
  'I want to track my expenses by category and see charts showing my spending patterns over time, with filters for different date ranges',
  'Build a habit tracker that shows my streaks, sends reminders, and has beautiful visualizations of my progress',
  'Create a project management app with tasks, subtasks, priorities, due dates, and team member assignments',
];

/**
 * Edge case prompts
 */
export const edgeCasePrompts = {
  empty: '',
  whitespace: '   \n  \t  ',
  veryShort: 'track',
  veryLong: 'I '.repeat(5000) + 'want to track expenses',
  specialChars: 'Track my $pending & expenses! (daily) #budget @home',
  unicode: 'Track my expenses 💰 and visualize 📊 spending patterns 🎯',
  numbers: '123 456 track 789',
  url: 'Track expenses like https://example.com/app',
  html: '<script>alert("test")</script> track expenses',
  sql: "'; DROP TABLE users; -- track expenses",
};

/**
 * Reference app prompts
 */
export const referenceAppPrompts = [
  'Build something like Trello',
  'I want an app similar to Notion',
  'Make a clone of Todoist',
  'Something like Google Keep',
  'Build a simple Airtable alternative',
];

/**
 * Category-specific detailed prompts
 */
export const categoryDetailedPrompts = {
  expense: 'I want to track my monthly expenses including rent, groceries, utilities, transportation, and entertainment. Show me visualizations of spending by category and over time.',
  
  habit: 'Track my morning routine: meditation, exercise, breakfast, and journaling. Show my completion streaks and weekly progress.',
  
  project: 'Manage my freelance projects with client names, project descriptions, deadlines, hourly rates, and time tracking.',
  
  health: 'Log my daily meals with calorie counts, track my weight, water intake, and exercise sessions.',
  
  learning: 'Track my online courses, study sessions, progress percentages, and notes for each topic.',
  
  inventory: 'Manage my home inventory with item names, quantities, locations, and purchase dates.',
  
  time: 'Log my work hours by project, client, and activity type with start and end times.',
  
  custom: 'Track my book collection with titles, authors, genres, read dates, and ratings.',
};

/**
 * Multi-language prompts (non-English)
 */
export const multiLanguagePrompts = [
  'Rastrear mis gastos diarios', // Spanish
  'Suivre mes dépenses quotidiennes', // French
  '毎日の支出を追跡する', // Japanese
  'Verfolgen Sie meine täglichen Ausgaben', // German
];

/**
 * Conversational style prompts
 */
export const conversationalPrompts = [
  "Hey, can you help me track how much I'm spending each day?",
  "I'm trying to build better habits. Can you make something for that?",
  "So I need to keep track of my projects at work, you know?",
  "Basically, I just want to log my workouts and stuff",
];

/**
 * Technical/specific prompts
 */
export const technicalPrompts = [
  'Create a CRUD app for expense tracking with PostgreSQL backend',
  'Build a REST API for habit tracking with JWT authentication',
  'Design a real-time collaborative task board with WebSocket support',
];

/**
 * Vague/unclear prompts
 */
export const vaguePrompts = [
  'Make an app',
  'I need help',
  'Something useful',
  'You know what I mean',
  'Just do it',
];
