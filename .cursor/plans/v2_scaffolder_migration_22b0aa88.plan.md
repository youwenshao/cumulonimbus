---
name: V2 Scaffolder Migration
overview: Migrate the entire Cumulonimbus system from V1 to V2 Scaffolder, complete missing integrations (workflow agent), implement auto-migration for existing V1 apps/conversations, update all documentation and configuration files, and deprecate V1 code.
todos:
  - id: workflow-integration
    content: Complete Automator integration in API route (executeParallelPipeline function)
    status: completed
  - id: intent-integration
    content: Add Advisor integration to extract and store enhanced intent
    status: completed
  - id: migration-core
    content: Create migration core logic (src/lib/migration/v1-to-v2.ts)
    status: completed
  - id: migration-api
    content: Create migration API endpoint (src/app/api/migration/v1-to-v2/route.ts)
    status: completed
  - id: migration-script
    content: Create CLI migration script (scripts/migrate-to-v2.js)
    status: completed
  - id: env-update
    content: Update .env.example to default to V2
    status: completed
  - id: package-json
    content: Add migration script to package.json
    status: completed
  - id: create-page
    content: Update create page to default to V2, remove mode selector
    status: completed
  - id: readme-update
    content: Update README.md to reflect V2 as primary scaffolder
    status: completed
  - id: migration-guide
    content: Create comprehensive migration guide (docs/migration-guide.md)
    status: completed
  - id: prisma-schema
    content: Update Prisma schema defaults to v2 and add indexes
    status: completed
  - id: deprecation-notices
    content: Add @deprecated comments to V1 code
    status: completed
  - id: testing
    content: Test migration on sample data, verify V2 features work end-to-end
    status: completed
isProject: false
---

# V2 Scaffolder Migration Plan

## Overview

Fully migrate Cumulonimbus from V1 to V2 Scaffolder, completing the workflow integration, implementing auto-migration utilities, updating all documentation and configuration to default to V2, and deprecating V1 code.

---

## Current State Analysis

### ✅ What's Complete in V2

The V2 Scaffolder is **extensively implemented** with:

- **Core Agents:** All major agents are fully functional
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - [`Architect`](src/lib/scaffolder-v2/agents/adaptive-architect.ts): Coordinates parallel agent execution, decision graphs, readiness tracking
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - [`Coordinator`](src/lib/scaffolder-v2/agents/schema-designer.ts): Generates data schemas from natural language
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - [`Designer`](src/lib/scaffolder-v2/agents/ui-designer.ts): Creates layouts and component arrangements
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - [`Coder`](src/lib/scaffolder-v2/agents/code-generator.ts): Generates modular React components
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - [`Advisor`](src/lib/scaffolder-v2/agents/intent-engine.ts): Deep understanding with reference app detection
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - [`Automator`](src/lib/scaffolder-v2/agents/workflow-agent.ts): Handles automations and state machines

- **Supporting Systems:**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - [`ProposalEngine`](src/lib/scaffolder-v2/proposals/engine.ts): Multi-proposal generation with scoring
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - [`State Management`](src/lib/scaffolder-v2/state.ts): Full serialization/deserialization
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - [`Feature Flags`](src/lib/scaffolder-v2/feature-flags.ts): Gradual rollout system
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - [`FeedbackLoop`](src/lib/scaffolder-v2/feedback-loop.ts): Error handling and component fixing
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - [`QualityControl`](src/lib/scaffolder-v2/quality-control.ts): Code verification
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - [`MockupGenerator`](src/lib/scaffolder-v2/mockup/generator.ts): Visual mockups

- **API Routes:** V2 routes fully implemented at [`src/app/api/scaffolder-v2/route.ts`](src/app/api/scaffolder-v2/route.ts)

- **Frontend:** V2 UI components exist in [`src/components/scaffolder-v2/`](src/components/scaffolder-v2/)

### ⚠️ What Needs Completion

1. **Automator Integration**: Implemented but not called in the API route (line 790-792 in [`route.ts`](src/app/api/scaffolder-v2/route.ts) shows placeholder)
2. **Default Configuration**: `.env.example` defaults to V1
3. **Documentation**: README treats V2 as "optional/advanced"
4. **Create Page**: Shows mode selector instead of defaulting to V2
5. **V1 Migration**: No utilities exist to convert V1 apps/conversations to V2

---

## Implementation Tasks

### Phase 1: Complete Automator Integration

**Goal:** Fully integrate the Automator into the V2 pipeline

**Files to Modify:**

- [`src/app/api/scaffolder-v2/route.ts`](src/app/api/scaffolder-v2/route.ts)

**Changes:**

1. In the `executeParallelPipeline` function (line 732), complete the workflow agent case:
```typescript
case 'workflow':
  result = await automator.process(userMessage, updatedState);
  if (result.success && result.data) {
    const workflowData = result.data as { workflows: WorkflowDefinition[] };
    updatedState = updateConversationState(updatedState, {
      workflows: workflowData.workflows,
    }) as DynamicConversationState;
    
    // Update readiness
    updatedState = updateReadiness(updatedState, {
      workflow: Math.min((updatedState.readiness.workflow || 0) + 40, 100),
      overall: Math.min((updatedState.readiness.overall || 0) + 10, 100)
    });
  }
  break;
```

2. Ensure Advisor integration extracts enhanced intent and updates state:
```typescript
case 'intent':
  result = await advisor.process(userMessage, updatedState);
  if (result.success && result.data) {
    const intentData = result.data as { intent: EnhancedIntent; suggestions: ProactiveSuggestion[] };
    updatedState = setEnhancedIntent(updatedState, intentData.intent);
    updatedState = setSuggestions(updatedState, intentData.suggestions);
  }
  break;
```


---

### Phase 2: Create Migration Utilities

**Goal:** Build utilities to auto-migrate V1 apps and conversations to V2 format

**New Files to Create:**

#### 1. Migration Core Logic

**File:** `src/lib/migration/v1-to-v2.ts`

```typescript
import type { App, Conversation } from '@prisma/client';
import type { 
  DynamicConversationState, 
  Schema, 
  LayoutNode, 
  EnhancedIntent 
} from '@/lib/scaffolder-v2/types';
import { createDynamicConversationState } from '@/lib/scaffolder-v2/state';
import { generateId } from '@/lib/utils';

export interface MigrationResult {
  success: boolean;
  conversationId?: string;
  appId?: string;
  errors?: string[];
}

/**
 * Convert V1 conversation to V2 format
 */
export function migrateConversation(v1Conversation: Conversation): DynamicConversationState {
  // Extract V1 state
  const v1State = v1Conversation.agentState as any;
  
  // Create base V2 state
  const v2State = createDynamicConversationState();
  v2State.id = v1Conversation.id;
  v2State.messages = v1Conversation.messages as any;
  
  // Convert V1 schemas to V2 format
  if (v1State?.schemas) {
    v2State.schemas = convertV1SchemasToV2(v1State.schemas);
  }
  
  // Convert V1 layout to V2 format
  if (v1State?.layout) {
    v2State.layout = convertV1LayoutToV2(v1State.layout);
  }
  
  // Infer readiness from state
  v2State.readiness = inferReadiness(v2State);
  
  // Set phase based on readiness
  v2State.phase = getPhaseFromReadiness(v2State.readiness);
  
  return v2State;
}

/**
 * Convert V1 app to V2 format
 */
export function migrateApp(v1App: App): Partial<App> {
  const v1Spec = v1App.spec as any;
  
  // Convert schema and layout
  const v2Schema = v1Spec?.schema ? convertV1SchemasToV2([v1Spec.schema])[0] : null;
  const v2Layout = v1Spec?.layout ? convertV1LayoutToV2(v1Spec.layout) : null;
  
  return {
    version: 'v2',
    spec: {
      schema: v2Schema,
      layout: v2Layout,
      components: v1Spec?.components || {},
    } as any,
  };
}

// Helper functions (implement these based on V1 schema structure)
function convertV1SchemasToV2(v1Schemas: any[]): Schema[] {
  // Convert V1 schema format to V2 Schema type
  return v1Schemas.map(v1Schema => ({
    name: v1Schema.name || v1Schema.entity || 'item',
    label: v1Schema.label || v1Schema.name || 'Item',
    description: v1Schema.description,
    fields: (v1Schema.fields || []).map((field: any) => ({
      name: field.name,
      label: field.label || field.name,
      type: field.type || 'string',
      required: field.required ?? false,
      options: field.options,
      validation: field.validation,
      generated: field.generated,
      primaryKey: field.primaryKey,
    })),
    computedFields: v1Schema.computedFields || [],
    relationships: v1Schema.relationships || [],
  }));
}

function convertV1LayoutToV2(v1Layout: any): LayoutNode {
  // Convert V1 layout to V2 LayoutNode format
  // Handle different V1 layout structures
  if (!v1Layout) {
    return createDefaultLayout();
  }
  
  // If already in V2 format, return as-is
  if (v1Layout.type && (v1Layout.container || v1Layout.component)) {
    return v1Layout;
  }
  
  // Convert primitive-based layout to component-based
  return {
    id: generateId(),
    type: 'container',
    container: {
      direction: 'column',
      gap: '1.5rem',
      padding: '1.5rem',
      children: [
        {
          id: generateId(),
          type: 'component',
          component: { type: 'form', props: {} },
        },
        {
          id: generateId(),
          type: 'component',
          component: { type: 'table', props: {} },
        },
      ],
    },
  };
}

function createDefaultLayout(): LayoutNode {
  return {
    id: generateId(),
    type: 'container',
    container: {
      direction: 'column',
      gap: '1.5rem',
      padding: '1.5rem',
      children: [],
    },
  };
}

function inferReadiness(state: DynamicConversationState): {
  schema: number;
  ui: number;
  workflow: number;
  overall: number;
} {
  let schema = 0;
  let ui = 0;
  let workflow = 50; // Default workflow readiness
  
  // Calculate schema readiness
  if (state.schemas.length > 0) {
    const fieldCount = state.schemas[0].fields.filter(f => !f.generated).length;
    schema = Math.min(30 + (fieldCount * 15), 100);
  }
  
  // Calculate UI readiness
  if (state.layout) {
    ui = 70; // Has layout
  }
  
  const overall = Math.round(schema * 0.4 + ui * 0.4 + workflow * 0.2);
  
  return { schema, ui, workflow, overall };
}

function getPhaseFromReadiness(readiness: any) {
  if (readiness.overall >= 80) return 'finalize';
  if (readiness.overall >= 60) return 'refine';
  if (readiness.overall >= 30) return 'design';
  return 'intent';
}
```

#### 2. Migration API Endpoint

**File:** `src/app/api/migration/v1-to-v2/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { migrateConversation, migrateApp } from '@/lib/migration/v1-to-v2';
import { serializeDynamicState } from '@/lib/scaffolder-v2/state';

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { target, force } = await request.json();
  const userId = session.user.id;
  
  try {
    let migratedCount = 0;
    const errors: string[] = [];
    
    // Migrate conversations
    if (target === 'conversations' || target === 'all') {
      const v1Conversations = await prisma.conversation.findMany({
        where: {
          userId,
          version: { not: 'v2' },
        },
      });
      
      for (const conv of v1Conversations) {
        try {
          const v2State = migrateConversation(conv);
          const serialized = serializeDynamicState(v2State);
          
          await prisma.conversation.update({
            where: { id: conv.id },
            data: {
              version: 'v2',
              agentState: serialized as any,
            },
          });
          
          migratedCount++;
        } catch (error) {
          errors.push(`Conversation ${conv.id}: ${error}`);
        }
      }
    }
    
    // Migrate apps
    if (target === 'apps' || target === 'all') {
      const v1Apps = await prisma.app.findMany({
        where: {
          userId,
          version: { not: 'v2' },
        },
      });
      
      for (const app of v1Apps) {
        try {
          const v2Data = migrateApp(app);
          
          await prisma.app.update({
            where: { id: app.id },
            data: v2Data,
          });
          
          migratedCount++;
        } catch (error) {
          errors.push(`App ${app.id}: ${error}`);
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      migratedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: String(error) },
      { status: 500 }
    );
  }
}
```

#### 3. Migration CLI Script

**File:** `scripts/migrate-to-v2.js`

```javascript
#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const { migrateConversation, migrateApp } = require('../dist/lib/migration/v1-to-v2.js');
const { serializeDynamicState } = require('../dist/lib/scaffolder-v2/state.js');

const prisma = new PrismaClient();

async function migrate() {
  console.log('🚀 Starting V1 to V2 migration...\n');
  
  try {
    // Migrate conversations
    const v1Conversations = await prisma.conversation.findMany({
      where: { version: { not: 'v2' } },
    });
    
    console.log(`Found ${v1Conversations.length} V1 conversations to migrate`);
    
    for (const conv of v1Conversations) {
      try {
        const v2State = migrateConversation(conv);
        const serialized = serializeDynamicState(v2State);
        
        await prisma.conversation.update({
          where: { id: conv.id },
          data: {
            version: 'v2',
            agentState: serialized,
          },
        });
        
        console.log(`✅ Migrated conversation ${conv.id}`);
      } catch (error) {
        console.error(`❌ Failed to migrate conversation ${conv.id}:`, error);
      }
    }
    
    // Migrate apps
    const v1Apps = await prisma.app.findMany({
      where: { version: { not: 'v2' } },
    });
    
    console.log(`\nFound ${v1Apps.length} V1 apps to migrate`);
    
    for (const app of v1Apps) {
      try {
        const v2Data = migrateApp(app);
        
        await prisma.app.update({
          where: { id: app.id },
          data: v2Data,
        });
        
        console.log(`✅ Migrated app ${app.id} (${app.name})`);
      } catch (error) {
        console.error(`❌ Failed to migrate app ${app.id}:`, error);
      }
    }
    
    console.log('\n✅ Migration complete!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
```

---

### Phase 3: Update Configuration & Environment

**Goal:** Update all config files to default to V2

#### 1. Update `.env.example`

```env
# Scaffolder Configuration
SCAFFOLDER_VERSION="v2"  # "v2" - V2 agent-based scaffolding (default)
NEXT_PUBLIC_SCAFFOLDER_VERSION="v2"  # Expose to frontend
LIVE_PREVIEW_ENABLED="true"  # Enable real-time preview during app generation
MULTI_ENTITY_ENABLED="true"  # Enable multi-entity schema generation
ADVANCED_LAYOUTS_ENABLED="true"  # Enable advanced layout templates

# Legacy V1 Support (deprecated - will be removed in future versions)
# V1_FALLBACK_ENABLED="false"  # Enable V1 fallback for backward compatibility
```

#### 2. Update `package.json` scripts

Add migration script:

```json
{
  "scripts": {
    "migrate:v2": "node scripts/migrate-to-v2.js",
    "db:migrate:v2": "npm run migrate:v2"
  }
}
```

---

### Phase 4: Update Create Page

**Goal:** Make V2 the default experience, remove mode selector

**File:** [`src/app/(main)/create/page.tsx`](src/app/\\\\\(main)/create/page.tsx)

**Changes:**

Replace the mode selector logic with V2-first approach:

```typescript
function CreateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // V2 is the default now
  const conversationId = searchParams.get('conversationId');
  const appId = searchParams.get('appId');
  
  // Use V2 scaffolder (ConversationalScaffolderV2)
  return (
    <ConversationalScaffolderV2 
      initialConversationId={conversationId || undefined}
      initialAppId={appId || undefined}
      onComplete={(id, subdomain) => {
        if (subdomain) {
          const host = window.location.host;
          window.location.href = getAppUrl(subdomain, host);
        } else {
          router.push(`/apps/${id}`);
        }
      }}
      onCancel={() => router.push('/dashboard')}
    />
  );
}
```

**Note:** Keep the old Freeform mode as a fallback accessible via `?mode=freeform` for backward compatibility during transition.

---

### Phase 5: Update Documentation

**Goal:** Update all documentation to reflect V2 as the primary scaffolder

#### 1. Update README.md

**File:** [`README.md`](README.md)

**Changes:**

1. **Line 42-49:** Update "Advanced Features" section to "Core V2 Features"
```markdown
### Core Features

- **Scaffolder V2**: Advanced agent-based architecture (Default)
  - **Multi-Agent System**: Specialized agents for coordination, design, and code generation
  - **Architect**: Coordinates parallel agent execution with smart decision making
  - **Dynamic Schema Generation**: AI generates custom data schemas from natural language
  - **Flexible Layout System**: Layout DSL with responsive templates (dashboard, sidebar, kanban)
  - **Live Preview**: Real-time preview updates during app generation with SSE streaming
  - **Iterative Refinement**: Conversational refinement with history tracking and undo support
  - **Multi-Proposal System**: Compare 2-3 design alternatives before committing
  - **Modular Code Generation**: Separate component files with TypeScript types and validators
  - **Quality Control**: Automated code verification with scoring
```

2. **Line 160-184:** Update "Enabling V2 Features" to "Configuration"
````markdown
### Configuration

Cumulonimbus uses V2 Scaffolder by default. Configuration options:

1. **V2 Configuration** (in `.env`):
   ```env
   SCAFFOLDER_VERSION=v2  # Default
   LIVE_PREVIEW_ENABLED=true
   MULTI_ENTITY_ENABLED=true
   ADVANCED_LAYOUTS_ENABLED=true
   ```

2. **Migrate existing V1 apps** (one-time migration):
   ```bash
   npm run migrate:v2
   ```
   This will automatically convert all V1 conversations and apps to V2 format.

3. **Environment variables** are documented in [`.env.example`](.env.example)
````

3. Add migration section:
````markdown
## Migrating from V1

If you're upgrading from an earlier version of Cumulonimbus:

1. **Backup your database** (recommended):
   ```bash
   pg_dump your_database > backup.sql
   ```

2. **Run the migration**:
   ```bash
   npm run migrate:v2
   ```

3. **Update environment variables** in `.env`:
   ```env
   SCAFFOLDER_VERSION=v2
   ```

4. **Restart the application**:
   ```bash
   npm run dev
   ```

The migration script will:
- Convert all V1 conversations to V2 format
- Migrate all V1 apps to use V2 schemas and layouts
- Preserve all data and conversation history
- Log any migration errors for manual review
````


#### 2. Create Migration Guide

**File:** `docs/migration-guide.md`

Create a comprehensive guide for users migrating from V1 to V2.

---

### Phase 6: Deprecate V1 Code

**Goal:** Mark V1 code as deprecated, plan for eventual removal

#### Files to Mark as Deprecated:

1. **V1 Scaffolder Core:**

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - [`src/lib/scaffolder/`](src/lib/scaffolder/) - Add deprecation notices
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Keep for backward compatibility during transition period
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Add comments: `@deprecated Use scaffolder-v2 instead`

2. **V1 API Routes:**

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - [`src/app/api/scaffolder/`](src/app/api/scaffolder/) - Keep but add deprecation warnings

3. **V1 Components:**

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - [`src/components/scaffolder/`](src/components/scaffolder/) (except FreeformCreator which uses V2)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Add deprecation notices to components

#### Update Setup Script

**File:** [`scripts/setup.js`](scripts/setup.js)

Add migration prompt during setup for existing installations.

---

### Phase 7: Update Utility Files

**Goal:** Update database schema, types, and utilities

#### 1. Database Schema

**File:** `prisma/schema.prisma`

Ensure V2 fields are properly indexed and documented:

```prisma
model Conversation {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages  Json     @default("[]")
  
  // V2 Scaffolder fields (default)
  version          String?  @default("v2")
  agentState       Json?    // V2: DynamicConversationState
  schemaDesigns    Json?    @default("[]")
  layoutDesigns    Json?    @default("[]")
  refinementHistory Json?   @default("[]")
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId, version])
  @@index([userId, updatedAt])
}

model App {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String
  subdomain   String?  @unique
  description String   @default("")
  
  // V2 Scaffolder fields (default)
  version          String?  @default("v2")
  spec             Json     // V2: { schema, layout, components }
  componentFiles   Json?    // V2: Modular component files
  layoutDefinition Json?    // V2: Layout DSL definition
  
  config         Json     @default("{}")
  data           Json     @default("[]")
  generationLog  Json?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([userId, version])
  @@index([subdomain])
}
```

Push schema changes:

```bash
npx prisma db push
npx prisma generate
```

#### 2. Type Definitions

Update shared types to prioritize V2 types as defaults.

---

## Testing Strategy

### Pre-Migration Testing

1. **Backup Production Data:**
   ```bash
   pg_dump production_db > pre_migration_backup.sql
   ```

2. **Test Migration on Staging:**

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Create staging environment with copy of production data
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Run migration script
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Verify all apps and conversations work correctly
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Test creating new V2 apps
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Test editing migrated apps

3. **V2 Feature Testing:**

                                                                                                                                                                                                - Create new apps using V2
                                                                                                                                                                                                - Test all agent types (Coordinator, Designer, Automator)
                                                                                                                                                                                                - Test proposal selection
                                                                                                                                                                                                - Test iterative refinement
                                                                                                                                                                                                - Test code generation and quality control

### Post-Migration Validation

1. **Data Integrity:**

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Verify conversation count matches
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Verify app count matches
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Check for migration errors in logs

2. **Functional Testing:**

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Test creating new apps
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Test editing existing apps
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Test conversation resume
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Test all V2 features

3. **Performance Testing:**

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Monitor API response times
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Check database query performance
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Verify memory usage

---

## Rollout Plan

### Phase 1: Development (Week 1)

- Complete workflow integration
- Build migration utilities
- Update documentation
- Test on development database

### Phase 2: Staging (Week 2)

- Deploy to staging environment
- Run migration on staging data
- Comprehensive testing
- Fix any migration issues

### Phase 3: Production Rollout (Week 3)

1. **Preparation:**

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Announce migration to users (if applicable)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Create backup of production database
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Schedule maintenance window

2. **Migration:**

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Deploy migration code
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Run migration script
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Monitor for errors
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Validate data integrity

3. **Monitoring:**

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Watch error logs for 48 hours
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Monitor user feedback
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Track V2 adoption metrics
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Be ready to rollback if critical issues arise

### Phase 4: V1 Deprecation (Month 2+)

- After 1 month of stable V2 operation
- Remove V1 code in next major version
- Archive V1 documentation

---

## Success Metrics

Track these metrics to measure migration success:

1. **Migration Metrics:**

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Conversations migrated: Target 100%
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Apps migrated: Target 100%
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Migration errors: Target <5%

2. **V2 Adoption:**

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - New apps created with V2: Target 100%
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - User satisfaction with V2: Target >80%
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Average app generation time: Target <3 minutes

3. **Quality Metrics:**

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Code quality score: Target >70/100
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - App runtime errors: Target <10%
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - User-reported issues: Track and resolve

---

## Rollback Plan

If critical issues arise:

1. **Immediate Rollback:**
   ```bash
   # Restore database from backup
   psql production_db < pre_migration_backup.sql
   
   # Revert code deployment
   git revert <migration-commit>
   
   # Update .env
   SCAFFOLDER_VERSION=v1
   ```

2. **Partial Rollback:**

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Keep V2 as option but default to V1
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Fix V2 issues
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Gradual re-rollout

---

## Key Files Summary

### New Files to Create

- `src/lib/migration/v1-to-v2.ts` - Core migration logic
- `src/app/api/migration/v1-to-v2/route.ts` - Migration API endpoint
- `scripts/migrate-to-v2.js` - CLI migration script
- `docs/migration-guide.md` - User migration documentation

### Files to Modify

- [`src/app/api/scaffolder-v2/route.ts`](src/app/api/scaffolder-v2/route.ts) - Complete workflow integration
- [`src/app/(main)/create/page.tsx`](src/app/\\\\\(main)/create/page.tsx) - Default to V2
- [`.env.example`](.env.example) - Update defaults to V2
- [`README.md`](README.md) - Update documentation
- [`package.json`](package.json) - Add migration script
- `prisma/schema.prisma` - Update default versions

### Files to Deprecate (Mark Only)

- [`src/lib/scaffolder/`](src/lib/scaffolder/) - Add @deprecated
- [`src/app/api/scaffolder/`](src/app/api/scaffolder/) - Add deprecation warnings
- Old V1 components - Mark as legacy

---

## Notes

- **Backward Compatibility:** V1 apps will continue to work after migration to V2 format
- **Data Safety:** Migration is non-destructive; original data is converted, not deleted
- **Incremental Approach:** Migration can be tested on subsets of data first
- **User Communication:** If this is a multi-user system, notify users of the migration
- **Documentation:** Keep V1 docs archived for reference

---

## Agent Naming Convention

The V2 Scaffolder uses intuitive, role-based names for its core agents:

- **Architect** (`adaptive-architect.ts`): Coordinates parallel agent execution, decision graphs, readiness tracking
- **Coordinator** (`schema-designer.ts`): Generates data schemas from natural language
- **Designer** (`ui-designer.ts`): Creates layouts and component arrangements
- **Coder** (`code-generator.ts`): Generates modular React components
- **Advisor** (`intent-engine.ts`): Deep understanding with reference app detection
- **Automator** (`workflow-agent.ts`): Handles automations and state machines

These names reflect each agent's primary responsibility in the app generation pipeline.

---

## Next Steps

After plan approval, begin with:

1. Automator integration completion (Phase 1)
2. Migration utilities development (Phase 2)
3. Staging environment testing
4. Production rollout