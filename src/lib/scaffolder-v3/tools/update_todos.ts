/**
 * Update Todos Tool
 * Manages a task list for tracking progress during complex tasks
 */

import { z } from 'zod';
import {
  ToolDefinition,
  AgentContext,
  AgentTodo,
} from './types';

const todoStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'failed']);

const todoItemSchema = z.object({
  id: z.string().describe('Unique identifier for the todo item'),
  text: z.string().describe('Description of the task'),
  status: todoStatusSchema.describe('Current status of the task'),
});

const updateTodosSchema = z.object({
  todos: z.array(todoItemSchema).describe('List of todo items to set or update'),
});

type UpdateTodosArgs = z.infer<typeof updateTodosSchema>;

export const updateTodosTool: ToolDefinition<UpdateTodosArgs> = {
  name: 'update_todos',
  description: 'Manage a task list for tracking progress. Use this when working on complex tasks to show the user what steps you are taking.',
  inputSchema: updateTodosSchema,
  defaultConsent: 'always',
  modifiesState: false, // Doesn't modify files

  execute: async (args, ctx: AgentContext) => {
    // Update the todos in context
    const newTodos: AgentTodo[] = [];
    const existingIds = new Set(ctx.todos.map(t => t.id));
    
    // Process incoming todos
    for (const todo of args.todos) {
      const existing = ctx.todos.find(t => t.id === todo.id);
      if (existing) {
        // Update existing todo
        existing.text = todo.text;
        existing.status = todo.status;
      } else {
        // Add new todo
        newTodos.push({
          id: todo.id,
          text: todo.text,
          status: todo.status,
        });
      }
    }
    
    // Merge with existing todos
    ctx.todos = [...ctx.todos, ...newTodos];
    
    // Notify UI
    ctx.onUpdateTodos(ctx.todos);
    
    // Format response
    const statusEmoji = {
      pending: '⏳',
      in_progress: '🔄',
      completed: '✅',
      failed: '❌',
    };
    
    const summary = ctx.todos
      .map(t => `${statusEmoji[t.status]} ${t.text}`)
      .join('\n');
    
    return `Todo list updated:\n${summary}`;
  },
};

export default updateTodosTool;
