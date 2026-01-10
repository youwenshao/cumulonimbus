---
name: Intent-to-App MVP Build
overview: Build a cloud-native web application that converts natural language descriptions of personal tracking needs into deployed, working web apps through conversational AI scaffolding.
todos:
  - id: setup-project
    content: Initialize Next.js project with TypeScript, Prisma, and core dependencies
    status: completed
  - id: setup-auth
    content: Configure NextAuth.js with email/password authentication
    status: completed
    dependencies:
      - setup-project
  - id: setup-database
    content: Create Prisma schema and set up PostgreSQL connection
    status: completed
    dependencies:
      - setup-project
  - id: build-scaffolder-api
    content: Implement conversational scaffolder with Qwen API streaming
    status: completed
    dependencies:
      - setup-database
  - id: build-primitives
    content: Create three core primitive components (Form, Table, Chart)
    status: completed
    dependencies:
      - setup-database
  - id: build-generator
    content: Build template-based code generator for app configuration
    status: completed
    dependencies:
      - build-primitives
      - build-scaffolder-api
  - id: build-runtime
    content: Implement dynamic app runtime at /apps/[appId]
    status: completed
    dependencies:
      - build-generator
  - id: build-dashboard
    content: Create Living App Dashboard and conversation UI
    status: completed
    dependencies:
      - setup-auth
      - build-runtime
  - id: deploy-mvp
    content: Deploy to Vercel and configure environment variables
    status: completed
    dependencies:
      - build-dashboard
---

# Intent-to-App Platform MVP

## Architecture Overview

```mermaid
graph TB
    User[User] -->|Describes Problem| ConvUI[Conversation UI]
    ConvUI -->|Sends Messages| Scaffolder[Conversational Scaffolder]
    Scaffolder -->|Calls| LLM[Qwen API]
    Scaffolder -->|Updates| SpecDB[(Project Spec Store)]
    Scaffolder -->|Generates| Preview[Static Wireframe Preview]
    
    SpecDB -->|Final Spec| Generator[Code Generator]
    Generator -->|Creates| AppCode[Generated App Components]
    AppCode -->|Stores| Runtime[Dynamic App Runtime]
    Runtime -->|Serves| AppURL[/apps/:appId]
    
    User -->|Accesses| Dashboard[Living App Dashboard]
    Dashboard -->|Lists| Runtime
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (via Vercel Postgres or Supabase)
- **AI**: Qwen API (via OpenRouter or Puter.js - OpenAI-compatible)
- **Auth**: NextAuth.js (email/password)
- **Styling**: Tailwind CSS
- **Hosting**: Vercel
- **ORM**: Prisma

## Database Schema

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // hashed
  apps      App[]
  createdAt DateTime @default(now())
}

model App {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  name        String
  description String
  spec        Json     // Project Specification
  config      Json     // Primitive configuration
  data        Json     // App-specific data store
  status      String   // draft, generating, active
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Conversation {
  id        String   @id @default(cuid())
  userId    String
  appId     String?
  messages  Json[]   // Array of {role, content, metadata}
  phase     String   // parse, probe, picture, plan
  createdAt DateTime @default(now())
}
```

## Core Components

### 1. Conversational Scaffolder (`/lib/scaffolder/`)

**Flow**: Parse → Probe → Picture → Plan

**Implementation**:

- **Intent Parser** (`parser.ts`): Analyzes initial prompt using Qwen API with structured output
- **Question Generator** (`probe.ts`): Generates targeted multiple-choice questions for Data, Logic, UI needs
- **Blueprint Builder** (`blueprint.ts`): Creates JSON representation of app structure
- **Spec Compiler** (`compiler.ts`): Converts dialogue into formal Project Spec

**Pattern Library** (`/lib/primitives/patterns.ts`):

```typescript
{
  "expense-tracker": {
    dataStores: [{type: "table", schema: {...}}],
    inputs: [{type: "form", fields: [...]}],
    views: [{type: "table"}, {type: "chart"}]
  },
  "habit-tracker": {...},
  "project-tracker": {...}
}
```

### 2. Primitive System (`/lib/primitives/`)

**Three Core Primitives for MVP**:

1. **`data-store`**: Configurable JSON-based storage with schema

   - Fields: name, type (text, number, date, boolean), required

2. **`input-mechanism`**: Form generator

   - Auto-generates forms from data-store schema
   - Validation rules

3. **`view-layer`**: Data presentation

   - Table view (with sorting, filtering)
   - Chart view (line, bar, pie)

**Primitive Registry** (`primitives.ts`):

```typescript
interface Primitive {
  id: string;
  type: 'data-store' | 'input-mechanism' | 'view-layer';
  config: Record<string, any>;
  render: (config: any, data: any) => React.ReactNode;
}
```

### 3. Code Generator (`/lib/generator/`)

**Generates**:

- React components for primitives
- API route handlers for data operations
- Configuration files

**Approach**: Template-based generation with variable substitution

- Templates in `/lib/generator/templates/`
- Uses Handlebars or similar for dynamic content

### 4. Dynamic App Runtime (`/app/apps/[appId]/`)

**Structure**:

```
/apps/[appId]/
  page.tsx        # Main app entry point
  layout.tsx      # App-specific layout
  api/
    data/
      route.ts    # CRUD operations
```

**Runtime Logic**:

1. Load app config from database by appId
2. Instantiate primitives based on config
3. Wire up data flow between primitives
4. Render UI

### 5. User Interface

**Main Pages**:

1. **Landing** (`/`): Marketing page with "Describe your app" CTA
2. **Auth** (`/auth`): Email/password login/signup
3. **Conversation** (`/create`): Conversational scaffolder interface

   - Chat interface with streaming responses
   - Static wireframe preview panel (updates after each phase)
   - Progress indicator (Parse → Probe → Picture → Plan)

4. **Dashboard** (`/dashboard`): List of user's apps with status
5. **Generated Apps** (`/apps/[appId]`): The actual running applications

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Setup & Infrastructure**:

- Initialize Next.js project with TypeScript
- Set up Prisma with PostgreSQL
- Configure NextAuth.js for authentication
- Create basic UI layouts with Tailwind

**Deliverable**: Authenticated app skeleton with database

### Phase 2: Conversational Scaffolder (Week 3-4)

**Build**:

- Qwen API integration with streaming (OpenRouter or Puter.js)
- Intent parser (initial prompt analysis)
- Question generator for "Personal Trackers" domain
- Conversation state management
- Static preview generator (JSON → HTML mockup)

**Deliverable**: Working conversation flow that produces Project Spec

### Phase 3: Primitive System (Week 5-6)

**Build**:

- Three core primitive definitions
- Primitive registry and configuration system
- React components for each primitive:
  - FormPrimitive
  - TablePrimitive
  - ChartPrimitive
- Data operation handlers (CRUD)

**Deliverable**: Reusable primitive components

### Phase 4: Code Generation & Runtime (Week 7-9)

**Build**:

- Template system for app generation
- Generator that converts Project Spec → app config
- Dynamic app runtime that loads and renders primitives
- App data storage and retrieval

**Deliverable**: End-to-end "prompt → running app" flow

### Phase 5: Dashboard & Polish (Week 10-12)

**Build**:

- Living App Dashboard
- App status tracking (draft, generating, active)
- Basic error handling and loading states
- Responsive design refinements
- Deploy to Vercel

**Deliverable**: Production-ready MVP

## Qwen API Integration

**Provider Options**:

1. **OpenRouter** (Recommended for MVP):

   - Free access to Qwen3 Coder model
   - OpenAI-compatible API endpoint
   - Simple authentication with API key
   - Base URL: `https://openrouter.ai/api/v1/chat`
   - Model: `qwen/qwen-2.5-coder` or `qwen/qwen-2.5-72b-instruct`

2. **Puter.js**:

   - Direct, free, and unlimited Qwen API
   - Supports coding and analysis tasks
   - May require different endpoint configuration

**Implementation Approach**:

- Use OpenAI SDK with custom base URL for OpenRouter compatibility
- Abstract provider logic in `/lib/qwen/client.ts` to support multiple providers
- Implement streaming support for real-time conversation updates
- Handle rate limits and error responses gracefully

## Key Technical Decisions

**Why Qwen API (instead of OpenAI)**:

- Free access through OpenRouter and Puter.js providers
- Cost-effective for MVP development and testing
- OpenAI-compatible API makes switching providers easy
- Qwen models are well-suited for code generation and structured output tasks

**Why Same-Origin Deployment**:

- Simplifies authentication (shared session)
- No DNS/proxy configuration needed
- Easy data isolation (appId in URL + DB filter)
- Fast iteration for MVP

**Why Template-Based Generation (not LLM code gen)**:

- Predictable, testable output
- Faster generation (no LLM latency)
- Full control over code quality
- Can add LLM-generated logic in Phase 2+

**Why JSON Data Store (not dynamic tables)**:

- Simplifies schema flexibility
- No migrations needed for user apps
- PostgreSQL JSON querying is powerful
- Can migrate to dedicated tables later

**Why Static Preview (not interactive)**:

- Faster to build (HTML generation)
- Validates user understanding without complexity
- Interactive can be added later

## File Structure

```
cumulonimbus/
├── app/
│   ├── (auth)/
│   │   └── auth/
│   ├── (main)/
│   │   ├── dashboard/
│   │   └── create/
│   ├── apps/
│   │   └── [appId]/
│   ├── api/
│   │   ├── scaffolder/
│   │   └── apps/
│   └── layout.tsx
├── components/
│   ├── primitives/
│   ├── scaffolder/
│   └── ui/
├── lib/
│   ├── scaffolder/
│   ├── primitives/
│   ├── generator/
│   ├── db/
│   └── qwen/
├── prisma/
│   └── schema.prisma
└── public/
```

## Environment Variables

```env
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
QWEN_API_KEY=
QWEN_API_URL=  # OpenRouter: https://openrouter.ai/api/v1/chat or Puter.js endpoint
QWEN_MODEL=     # e.g., "qwen/qwen-2.5-coder" for OpenRouter or model name for Puter.js
QWEN_PROVIDER=  # "openrouter" or "puter"
```

## Success Metrics for MVP

1. User can describe a tracking need in natural language
2. System asks 3-5 clarifying questions
3. User sees a static preview of their app
4. Generated app is accessible at `/apps/:id` within 10 seconds
5. App supports basic CRUD operations
6. User can create multiple apps from dashboard

## Next Steps After MVP

- Add "Remix" functionality (clone and modify apps)
- Implement logic-unit primitive with expression builder
- Add more view types (calendar, kanban, timeline)
- Introduce Logic Sandbox for custom scripts
- Enable app sharing/permissions