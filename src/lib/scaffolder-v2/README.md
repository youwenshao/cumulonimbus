# Scaffolder V2 - Dynamic AI Pipeline

A next-generation AI app builder with dynamic schema generation, conversational refinement, flexible layouts, live preview, and multi-model architecture.

## Architecture

The V2 system uses a multi-agent architecture where specialized agents handle different aspects of app creation:

```
User Message
    ↓
Architect Agent (coordinates flow)
    ↓
┌──────────────────┬─────────────────┬──────────────────┐
│ Schema Designer  │  UI Designer    │  Code Generator  │
│     Agent        │     Agent       │      Agent       │
└──────────────────┴─────────────────┴──────────────────┘
    ↓
Live Preview Runtime
    ↓
Generated App
```

## Key Features

### 1. Dynamic Schema Generation
- No templates required - AI generates custom schemas from natural language
- Iterative refinement through conversation
- Support for computed fields and relationships

### 2. Flexible Layout System
- Layout DSL (Domain Specific Language) for describing UI structure
- Pre-built layout templates (dashboard, sidebar, kanban)
- Responsive behavior configuration

### 3. Live Preview
- Real-time preview updates as components are generated
- SSE streaming for status and preview updates
- Sandbox iframe rendering for safety

### 4. Modular Code Generation
- Generates separate component files (not monolithic)
- TypeScript types and Zod validators
- API client and React hooks

## Directory Structure

```
src/lib/scaffolder-v2/
├── agents/
│   ├── base-agent.ts      # Base class for all agents
│   ├── architect.ts    # Coordinates agent flow
│   ├── schema-designer.ts # Generates data schemas
│   ├── ui-designer.ts     # Creates layouts
│   └── code-generator.ts  # Generates React components
├── layout/
│   └── dsl.ts            # Layout DSL utilities
├── preview/
│   └── runtime.ts        # Preview rendering
├── feature-flags.ts      # V2 feature flag system
├── state.ts              # Conversation state management
├── types.ts              # TypeScript type definitions
└── index.ts              # Main exports
```

## Usage

### Enabling V2

V2 can be enabled in several ways:

1. **Query Parameter**: Add `?v2=true` to the create page URL
2. **Environment Variable**: Set `NEXT_PUBLIC_SCAFFOLDER_VERSION=v2`
3. **Feature Flag**: Enable per-user via `V2_BETA_EMAILS`

### Environment Variables

```env
# Enable V2 for all users
SCAFFOLDER_VERSION=v2

# Enable V2 for specific beta users (comma-separated emails)
V2_BETA_EMAILS=user1@example.com,user2@example.com

# Gradual rollout percentage (0-100)
V2_ROLLOUT_PERCENTAGE=10

# Enable live preview
LIVE_PREVIEW_ENABLED=true

# Enable multi-entity schemas
MULTI_ENTITY_ENABLED=true
```

### API Endpoints

- `POST /api/scaffolder-v2` - Main chat endpoint
  - Actions: `chat`, `finalize`, `undo`
- `GET /api/scaffolder-v2` - Get conversation state
- `GET /api/scaffolder-v2/status/[conversationId]` - SSE status stream
- `GET /api/scaffolder-v2/preview/[conversationId]` - SSE preview stream

## Agent Flow

### 1. Architect Agent
Classifies user intent and routes to appropriate agent:
- `INITIAL_REQUEST` → Schema Designer
- `REFINEMENT` → Responsible agent (schema/ui/code)
- `APPROVAL` → Next phase
- `QUESTION` → Current agent clarifies
- `FINALIZE` → Code Generator

### 2. Schema Designer Agent
Generates and refines data schemas:
- Proposes fields with types and validations
- Supports iterative refinement
- Handles computed fields and relationships

### 3. UI Designer Agent
Creates layouts from natural language:
- Generates layout tree structure
- Proposes responsive behavior
- Selects component variants

### 4. Code Generator Agent
Generates modular React components:
- TypeScript types and validators
- Form, Table, Chart components
- API routes and React hooks

## Database Schema

V2 adds these fields to existing models:

```prisma
model Conversation {
  // ... existing fields ...
  
  // V2 fields
  version           String?  @default("v1")
  agentState        Json?
  schemaDesigns     Json?    @default("[]")
  layoutDesigns     Json?    @default("[]")
  refinementHistory Json?    @default("[]")
}

model App {
  // ... existing fields ...
  
  // V2 fields
  version          String?  @default("v1")
  componentFiles   Json?
  layoutDefinition Json?
}
```

## Migration from V1

V2 runs in parallel with V1. Users can be gradually migrated:

1. **Phase 1**: Enable for internal testing
2. **Phase 2**: Opt-in beta via query param
3. **Phase 3**: Gradual rollout (10%, 25%, 50%, 100%)
4. **Phase 4**: V2 default for new conversations

## Success Metrics

Track these metrics to compare V1 vs V2:

- **Completion Rate**: % of conversations resulting in generated app
- **Time to Completion**: Average time from start to finalized app
- **Refinement Count**: Number of refinements per conversation
- **User Satisfaction**: Post-generation rating
- **Error Rate**: % of conversations with critical errors
