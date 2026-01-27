# V3 Scaffolder Documentation

## Overview

The V3 Scaffolder is a tool-based code generation system adapted from [Dyad](https://github.com/dyad-sh/dyad) for the Cumulonimbus platform. It provides an iterative, conversational approach to building React applications using Vite + Shadcn/UI.

## Architecture

### Key Differences from V2

| Feature | V2 Scaffolder | V3 Scaffolder |
|---------|--------------|---------------|
| Approach | Multi-agent parallel generation | Single agent with tools |
| File Handling | Monolithic code generation | Incremental file operations |
| Scaffold | Custom React template | Vite + Shadcn/UI |
| Streaming | Code blocks streamed | XML tags streamed |
| Editing | Full file replacement | Diff-style edits |

### Components

```
src/lib/scaffolder-v3/
├── agent.ts                 # Main agent orchestrator
├── feature-flags.ts         # Feature toggles
├── index.ts                 # Module exports
├── prompts/
│   ├── index.ts
│   └── system-prompt.ts     # LLM system prompts
└── tools/
    ├── add_dependency.ts    # Package management
    ├── code_search.ts       # Semantic code search
    ├── delete_file.ts       # File deletion
    ├── edit_file.ts         # Incremental edits
    ├── grep.ts              # Pattern search
    ├── index.ts             # Tool exports
    ├── list_files.ts        # Directory listing
    ├── read_file.ts         # File reading
    ├── rename_file.ts       # File renaming
    ├── set_chat_summary.ts  # Conversation titles
    ├── types.ts             # Type definitions
    ├── update_todos.ts      # Task tracking
    └── write_file.ts        # File creation
```

## Available Tools

### File Operations

#### `write_file`
Creates or completely overwrites a file.

```typescript
// Arguments
{
  path: string;      // File path (e.g., "src/components/Button.tsx")
  content: string;   // Complete file content
  description?: string;
}
```

#### `edit_file`
Performs incremental edits to existing files using diff markers.

```typescript
// Arguments
{
  path: string;
  content: string;   // Uses "// ... existing code ..." markers
  description?: string;
}
```

**Edit Format Example:**
```typescript
// ... existing code ...
const App = () => {
  // ... existing code ...
  return <div>Updated content</div>;
};
// ... existing code ...
```

#### `delete_file`
Removes a file from the codebase.

#### `rename_file`
Renames or moves a file, updating import statements.

### Code Analysis

#### `read_file`
Reads file contents with optional line range.

#### `list_files`
Lists files in the codebase with optional directory filtering.

#### `grep`
Searches for patterns using regular expressions.

#### `code_search`
Semantic search for functions, components, hooks, etc.

### Dependency Management

#### `add_dependency`
Adds npm packages to the project.

```typescript
// Arguments
{
  packages: string;  // Space-separated package names
  dev?: boolean;     // Install as devDependency
}
```

## Scaffold Structure

V3 apps use the Vite + React + Shadcn/UI scaffold:

```
src/
├── App.tsx              # Main app with routes
├── main.tsx             # Entry point
├── globals.css          # Global styles (Tailwind)
├── components/
│   ├── ui/              # Pre-installed Shadcn components
│   └── [Custom]/        # User components
├── pages/
│   ├── Index.tsx        # Main page
│   └── [Custom]/        # User pages
├── lib/
│   ├── utils.ts         # cn() helper
│   └── nebula-client.ts # Data persistence API
└── hooks/
    └── [Custom]/        # Custom hooks
```

## Data Persistence

V3 apps use the Nebula data API for persistence:

```typescript
import { useNebulaData, generateId } from '@/lib/nebula-client';

function TodoList() {
  const { data, isLoading, create, update, remove } = useNebulaData<Todo>();

  const addTodo = async (text: string) => {
    await create({ id: generateId(), text, completed: false });
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    await update(id, { completed });
  };

  return (/* ... */);
}
```

## API Endpoints

### POST /api/scaffolder-v3
Main chat endpoint.

```typescript
// Request
{
  conversationId?: string;
  message: string;
  action?: 'chat' | 'create' | 'finalize';
  appId?: string;
}

// Response
{
  conversationId: string;
  appId: string;
  success: boolean;
  message?: string;
  error?: string;
}
```

### GET /api/scaffolder-v3/stream/[conversationId]
SSE endpoint for streaming responses.

Events:
- `connected` - Connection established
- `chunk` - Text chunk received
- `complete` - Generation complete
- `error` - Error occurred

### GET/POST/DELETE /api/scaffolder-v3/files/[appId]
Direct file operations.

## Database Schema

V3 adds the following fields to the App model:

```prisma
model App {
  // ... existing fields
  scaffoldVersion    String?  // "v3"
  scaffoldId         String?  // "vite-react-shadcn"
  viteComponentFiles String?  // JSON Record<string, string>
  vitePackageJson    String?  // JSON package.json
  viteScaffoldConfig String?  // JSON scaffold config
}

model Conversation {
  // ... existing fields
  agentToolHistory    String?  // Tool execution log
  componentFilesCache String?  // Cached file state
}
```

## Feature Flags

Configure V3 in `src/lib/scaffolder-v3/feature-flags.ts`:

```typescript
export const V3_FEATURES = {
  enabled: true,          // Enable V3 globally
  defaultMode: false,     // Make V3 the default
  allowedUsers: [],       // Beta user IDs (empty = all)
  tools: {
    writeFile: true,
    editFile: true,
    // ... other tools
  }
};
```

## Hosting with Nebula

V3 apps are bundled and served by the Nebula runner:

1. Files are loaded from `App.viteComponentFiles`
2. esbuild bundles all files with the Vite scaffold
3. External dependencies loaded via ESM import maps
4. App served as static HTML with embedded JS

### Import Maps

The following packages are available via ESM:

- React 18, React DOM, React Router
- @tanstack/react-query
- All Radix UI components
- Tailwind utilities (clsx, tailwind-merge, cva)
- Lucide React icons
- Recharts, date-fns, zod, react-hook-form

## Migration from V2

### Converting Existing Apps

V1/V2 apps continue to work without changes. To convert:

1. Create a new V3 app
2. Copy business logic to new components
3. Use Shadcn/UI components for UI
4. Replace data hooks with `useNebulaData`

### Key Differences

- **File Structure**: V3 uses a standard Vite project layout
- **Styling**: Tailwind CSS with Shadcn/UI design system
- **Data**: Same Nebula data API, different hook syntax
- **Routing**: React Router (not Next.js file-based routing)

## Usage

Access V3 via:
- URL: `/create?mode=v3`
- Mode selector: Click "V3 Builder"

## Success Criteria

- [ ] Create a simple app (todo list)
- [ ] Edit existing files (change colors, text)
- [ ] Generated apps run in Nebula
- [ ] All Shadcn components available
- [ ] File explorer shows project structure
- [ ] Real-time streaming works
- [ ] Database storage persists
- [ ] Apps accessible via subdomain

## Troubleshooting

### "File not found" errors
- Check file paths start with `src/`
- Verify file exists with `list_files`

### Build failures
- Check console for esbuild errors
- Verify imports use `@/` alias

### Slow generation
- Large files may take longer
- Check LLM provider status

## Future Enhancements

- Hot module replacement (HMR)
- Supabase integration
- TypeScript type checking
- More scaffold templates
- Collaborative editing
