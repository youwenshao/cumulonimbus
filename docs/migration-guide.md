# V1 to V2 Migration Guide

This guide covers migrating from Cumulonimbus V1 Scaffolder to the V2 agent-based architecture.

## Overview

The V2 Scaffolder represents a significant upgrade to the app generation system, featuring a multi-agent architecture that provides:

- **Parallel Processing**: Multiple agents work simultaneously for faster generation
- **Intelligent Coordination**: The Architect agent orchestrates the entire pipeline
- **Better Understanding**: The Advisor agent deeply understands references and intent
- **Automated Workflows**: The Automator agent handles state machines and triggers
- **Higher Quality Code**: The Coder agent generates modular, TypeScript-compliant components

## V2 Agent Architecture

The V2 Scaffolder uses six specialized agents:

| Agent | Role | Description |
|-------|------|-------------|
| **Architect** | Coordinator | Orchestrates parallel agent execution, manages decision graphs and readiness tracking |
| **Coordinator** | Schema Design | Generates data schemas from natural language descriptions |
| **Designer** | UI Layout | Creates responsive layouts and component arrangements |
| **Coder** | Code Generation | Produces modular React components with TypeScript types |
| **Advisor** | Intent Analysis | Deep understanding with reference app detection (e.g., "like Trello") |
| **Automator** | Workflows | Handles automations, state machines, computed fields, and triggers |

## Prerequisites

Before migrating:

1. **Backup your database**:
   ```bash
   # PostgreSQL
   pg_dump your_database > backup_$(date +%Y%m%d).sql
   
   # SQLite
   cp prisma/dev.db prisma/dev.db.backup
   ```

2. **Update dependencies**:
   ```bash
   npm install
   ```

3. **Verify current installation**:
   ```bash
   npm run dev
   # Ensure the app starts without errors
   ```

## Migration Steps

### Step 1: Update Environment Variables

Edit your `.env` file to enable V2:

```env
# Change from v1 to v2
SCAFFOLDER_VERSION=v2
NEXT_PUBLIC_SCAFFOLDER_VERSION=v2

# Ensure these are enabled
LIVE_PREVIEW_ENABLED=true
MULTI_ENTITY_ENABLED=true
ADVANCED_LAYOUTS_ENABLED=true
```

### Step 2: Run the Migration Script

The migration script converts all V1 conversations and apps to V2 format:

```bash
# Preview migration (no changes made)
npm run migrate:v2 -- --dry-run

# Run the actual migration
npm run migrate:v2
```

#### Migration Script Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Preview changes without applying them |
| `--force` | Re-migrate already migrated items |
| `--help` | Show help message |

### Step 3: Verify Migration

After migration:

1. **Check the logs** for any errors
2. **Verify app counts** match before and after
3. **Test a few apps** to ensure they work correctly
4. **Create a new app** using V2 to verify the new system works

## What Gets Migrated

### Conversations

- Message history is preserved
- State is converted to V2 `DynamicConversationState` format
- Schemas are upgraded with proper field definitions
- Layouts are converted to the V2 `LayoutNode` tree structure
- Readiness scores are calculated based on content

### Apps

- App metadata is preserved (name, subdomain, description)
- Spec is converted to V2 format with schema and layout
- Component code is preserved
- Data is unchanged

## Migration Details

### Schema Conversion

V1 schemas are enhanced with:
- Proper field type mapping
- Required ID and createdAt fields
- Computed fields preservation
- Relationship definitions

### Layout Conversion

V1 layouts are converted to V2 `LayoutNode` format:
- Primitive-based layouts become component-based
- Responsive configurations are added
- Container hierarchies are established

### Phase Mapping

| V1 Phase | V2 Phase |
|----------|----------|
| parse | intent |
| probe | design |
| picture | design |
| plan | design |
| build | finalize |
| complete | finalize |

## Troubleshooting

### Migration Errors

If you see errors during migration:

1. **Check the specific error message** in the console
2. **Verify the conversation/app** still exists in the database
3. **Try re-running with `--force`** to re-migrate failed items
4. **Check the database directly** using Prisma Studio:
   ```bash
   npm run db:studio
   ```

### Common Issues

#### "Cannot read property 'x' of undefined"

This usually means a V1 state had missing or malformed data. The migration will create a default state in these cases.

#### "Database connection failed"

Ensure your database is running:
```bash
# PostgreSQL
pg_isready

# SQLite - ensure the file exists
ls -la prisma/*.db
```

#### "Invalid schema format"

The V1 schema may have been in an unexpected format. Check the original conversation state using Prisma Studio.

### Rolling Back

If you need to rollback:

1. **Restore your database backup**:
   ```bash
   # PostgreSQL
   psql your_database < backup.sql
   
   # SQLite
   cp prisma/dev.db.backup prisma/dev.db
   ```

2. **Revert environment variables**:
   ```env
   SCAFFOLDER_VERSION=v1
   NEXT_PUBLIC_SCAFFOLDER_VERSION=v1
   ```

3. **Restart the application**:
   ```bash
   npm run dev
   ```

## Post-Migration

After successful migration:

### 1. Update Your Workflow

V2 provides a more streamlined experience:
- No more separate "Freeform" vs "Guided" - just describe your app
- The Architect automatically coordinates the best approach
- Real-time readiness tracking shows progress toward build-ready

### 2. Explore New Features

- **Multi-proposal system**: See 2-3 design alternatives
- **Reference understanding**: Say "like Trello" and the Advisor knows what you mean
- **Workflow automation**: The Automator detects and implements state machines
- **Quality control**: Automated code verification with scoring

### 3. Clean Up (Optional)

After confirming everything works:

1. **Remove V1 beta flags** from `.env`:
   ```env
   # These are no longer needed
   # V2_BETA_EMAILS=
   # V2_ROLLOUT_PERCENTAGE=
   ```

2. **Clear old conversation caches** if any exist

## API Changes

If you're using the API directly:

### Endpoint Changes

| V1 Endpoint | V2 Endpoint | Notes |
|-------------|-------------|-------|
| `/api/scaffolder` | `/api/scaffolder-v2` | Main chat endpoint |
| `/api/scaffolder/stream` | `/api/scaffolder-v2/status/[id]` | SSE status |
| `/api/scaffolder/code-stream` | `/api/scaffolder-v2/preview/[id]` | Code preview |

### Request/Response Format

V2 uses enhanced request format:

```typescript
// V2 Request
{
  conversationId?: string;
  message: string;
  action: 'chat' | 'finalize' | 'undo' | 'select_proposal' | 'fix_component' | 'resolve_feedback';
  componentCode?: string;  // For fix_component
  errorLog?: string;       // For fix_component
}

// V2 Response
{
  conversationId: string;
  messages: Message[];
  state: {
    phase: string;
    schemas: Schema[];
    layout: LayoutNode;
    suggestedAppName: string;
    readiness: ReadinessScores;
    currentProposals?: ProposalSet;
    suggestions?: ProactiveSuggestion[];
  };
  requiresUserInput: boolean;
  suggestedActions: string[];
  isReadyToBuild: boolean;
  canFinalize: boolean;
}
```

## Getting Help

If you encounter issues:

1. **Check the logs** for detailed error messages
2. **Run with `--dry-run`** first to preview changes
3. **Create a backup** before any migration
4. **Open an issue** on GitHub with:
   - Error message
   - Steps to reproduce
   - Database type (PostgreSQL/SQLite)
   - Node.js version

## Summary

The V2 migration:

1. Upgrades your scaffolder to the multi-agent architecture
2. Preserves all existing conversations and apps
3. Enables new features like proposals, workflows, and quality control
4. Is reversible with a database backup

After migration, enjoy the improved app generation experience with smarter agents, faster processing, and higher quality output!
