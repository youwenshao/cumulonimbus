/**
 * V3 Scaffolder Tools Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { 
  writeFileTool, 
  editFileTool, 
  deleteFileTool, 
  renameFileTool,
  readFileTool,
  listFilesTool,
  grepTool,
  addDependencyTool,
  type AgentContext,
  type AgentTodo,
} from '../tools';

// Mock agent context
function createMockContext(componentFiles: Record<string, string> = {}): AgentContext {
  return {
    appId: 'test-app-id',
    userId: 'test-user-id',
    conversationId: 'test-conversation-id',
    componentFiles: { ...componentFiles },
    packageJson: { name: 'test-app', dependencies: {}, devDependencies: {} },
    isSharedModulesChanged: false,
    todos: [] as AgentTodo[],
    onXmlStream: jest.fn(),
    onXmlComplete: jest.fn(),
    requireConsent: jest.fn().mockResolvedValue(true),
    appendUserMessage: jest.fn(),
    onUpdateTodos: jest.fn(),
  };
}

describe('V3 Scaffolder Tools', () => {
  describe('write_file', () => {
    it('should create a new file', async () => {
      const ctx = createMockContext();
      
      const result = await writeFileTool.execute({
        path: 'src/components/Button.tsx',
        content: 'export const Button = () => <button>Click</button>;',
        description: 'A button component',
      }, ctx);
      
      expect(result).toContain('Successfully wrote');
      expect(ctx.componentFiles['src/components/Button.tsx']).toBeDefined();
      expect(ctx.onXmlComplete).toHaveBeenCalled();
    });

    it('should overwrite an existing file', async () => {
      const ctx = createMockContext({
        'src/App.tsx': 'old content',
      });
      
      await writeFileTool.execute({
        path: 'src/App.tsx',
        content: 'new content',
      }, ctx);
      
      expect(ctx.componentFiles['src/App.tsx']).toBe('new content');
    });

    it('should reject paths outside src/', async () => {
      const ctx = createMockContext();
      
      await expect(writeFileTool.execute({
        path: '../secret.txt',
        content: 'malicious',
      }, ctx)).rejects.toThrow('Path traversal');
    });
  });

  describe('edit_file', () => {
    it('should edit an existing file', async () => {
      const ctx = createMockContext({
        'src/App.tsx': `
const App = () => {
  return <div>Hello</div>;
};

export default App;
`,
      });
      
      const result = await editFileTool.execute({
        path: 'src/App.tsx',
        content: `// ... existing code ...
const App = () => {
  return <div>Hello World</div>;
};
// ... existing code ...`,
      }, ctx);
      
      expect(result).toContain('Successfully edited');
      expect(ctx.componentFiles['src/App.tsx']).toContain('Hello World');
    });

    it('should throw if file does not exist', async () => {
      const ctx = createMockContext();
      
      await expect(editFileTool.execute({
        path: 'src/NonExistent.tsx',
        content: 'new content',
      }, ctx)).rejects.toThrow('does not exist');
    });
  });

  describe('delete_file', () => {
    it('should delete an existing file', async () => {
      const ctx = createMockContext({
        'src/ToDelete.tsx': 'content',
      });
      
      const result = await deleteFileTool.execute({
        path: 'src/ToDelete.tsx',
      }, ctx);
      
      expect(result).toContain('Successfully deleted');
      expect(ctx.componentFiles['src/ToDelete.tsx']).toBeUndefined();
    });

    it('should throw if file does not exist', async () => {
      const ctx = createMockContext();
      
      await expect(deleteFileTool.execute({
        path: 'src/NonExistent.tsx',
      }, ctx)).rejects.toThrow('does not exist');
    });
  });

  describe('rename_file', () => {
    it('should rename a file', async () => {
      const ctx = createMockContext({
        'src/OldName.tsx': 'content',
      });
      
      const result = await renameFileTool.execute({
        from: 'src/OldName.tsx',
        to: 'src/NewName.tsx',
      }, ctx);
      
      expect(result).toContain('Successfully renamed');
      expect(ctx.componentFiles['src/OldName.tsx']).toBeUndefined();
      expect(ctx.componentFiles['src/NewName.tsx']).toBe('content');
    });
  });

  describe('read_file', () => {
    it('should read an existing file', async () => {
      const ctx = createMockContext({
        'src/App.tsx': 'line1\nline2\nline3',
      });
      
      const result = await readFileTool.execute({
        path: 'src/App.tsx',
      }, ctx);
      
      expect(result).toContain('line1');
      expect(result).toContain('line2');
    });

    it('should return not found for missing files', async () => {
      const ctx = createMockContext();
      
      const result = await readFileTool.execute({
        path: 'src/Missing.tsx',
      }, ctx);
      
      expect(result).toContain('not found');
    });
  });

  describe('list_files', () => {
    it('should list all files', async () => {
      const ctx = createMockContext({
        'src/App.tsx': 'content',
        'src/components/Button.tsx': 'content',
        'src/lib/utils.ts': 'content',
      });
      
      const result = await listFilesTool.execute({ recursive: true } as any, ctx);
      
      expect(result).toContain('src/App.tsx');
      expect(result).toContain('src/components/Button.tsx');
      expect(result).toContain('src/lib/utils.ts');
    });

    it('should filter by directory', async () => {
      const ctx = createMockContext({
        'src/App.tsx': 'content',
        'src/components/Button.tsx': 'content',
      });
      
      const result = await listFilesTool.execute({
        directory: 'src/components',
        recursive: true,
      } as any, ctx);
      
      expect(result).toContain('Button.tsx');
      expect(result).not.toContain('App.tsx');
    });
  });

  describe('grep', () => {
    it('should search for patterns', async () => {
      const ctx = createMockContext({
        'src/App.tsx': 'const App = () => <div>Hello</div>;',
        'src/Button.tsx': 'const Button = () => <button>Click</button>;',
      });
      
      const result = await grepTool.execute({
        pattern: 'button',
        caseInsensitive: true,
        maxResults: 50,
      } as any, ctx);
      
      expect(result).toContain('Button.tsx');
    });
  });

  describe('add_dependency', () => {
    it('should add dependencies', async () => {
      const ctx = createMockContext();
      
      const result = await addDependencyTool.execute({
        packages: 'axios lodash',
        dev: false,
      } as any, ctx);
      
      expect(result).toContain('Added packages');
      expect(ctx.packageJson.dependencies).toHaveProperty('axios');
      expect(ctx.packageJson.dependencies).toHaveProperty('lodash');
    });

    it('should recognize pre-installed packages', async () => {
      const ctx = createMockContext();
      
      const result = await addDependencyTool.execute({
        packages: 'react lucide-react',
        dev: false,
      } as any, ctx);
      
      expect(result).toContain('Already installed');
    });
  });
});
