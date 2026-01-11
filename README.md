# Cumulonimbus

Transform natural language descriptions into working web applications through AI-powered conversational scaffolding.

## Overview

Cumulonimbus is an intent-to-application platform that allows non-technical users to describe their tracking needs in plain English and receive a fully functional, personalized web application.

## Key Features

### Core Functionality

- **Natural Language Input**: Describe what you want to track in plain English
- **Conversational Scaffolder**: AI-powered multi-phase dialogue that clarifies requirements
  - **Parse Phase**: AI analyzes your intent and extracts entities, actions, and relationships
  - **Probe Phase**: Interactive multiple-choice questions to refine your requirements
  - **Picture Phase**: Preview of your app structure before generation
  - **Plan Phase**: Detailed implementation plan with architecture overview
  - **Build Phase**: Real-time code generation with live status updates
- **Dual Generation Modes**: 
  - Primitive-based apps using reusable components
  - Custom code generation with full React components
- **Three Core Primitives**: 
  - **FormPrimitive**: Dynamic forms with validation (text, number, date, boolean, select, textarea)
  - **TablePrimitive**: Sortable, filterable data tables with delete functionality
  - **ChartPrimitive**: Interactive charts (line, bar, pie, area) with grouping and aggregation
- **Full CRUD Operations**: Create, read, update, and delete data entries
- **Personal Dashboard**: Manage all your generated apps with search and sorting
- **Real-time Status Updates**: Server-Sent Events (SSE) for live progress tracking
- **Live Preview**: Review generated apps before accepting
- **Issue Reporting & Regeneration**: Report issues and regenerate apps with feedback
- **Code Streaming**: Watch code being generated in real-time
- **User Authentication**: Secure email/password authentication with NextAuth.js

### Advanced Features

- **Scaffolder V2** (In Development): Agent-based architecture with orchestrator pattern
  - Schema design proposals
  - Layout design proposals
  - Refinement history tracking
  - Feature flags for gradual rollout
- **Multiple View Modes**: Toggle between table, chart, or both views
- **Data Visualization**: Advanced charting with grouping, aggregation, and multiple chart types
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark Theme UI**: Modern, accessible interface with custom color palette

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (via Prisma ORM)
- **AI**: Qwen API (via OpenRouter - free tier)
- **Auth**: NextAuth.js
- **Styling**: Tailwind CSS
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Qwen API key (from OpenRouter)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/cumulonimbus.git
   cd cumulonimbus
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` with your values (see [Environment Variables](#environment-variables) section below)

4. Set up the database:
   ```bash
   npm run db:setup
   # or manually:
   npx prisma db push
   npx prisma generate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

### Quick Setup Script

For a faster setup, you can use the setup script:
```bash
npm run setup
```

This will:
- Install dependencies
- Copy `.env.example` to `.env` (if it doesn't exist)
- Set up the database
- Generate Prisma client

## Project Structure

```
cumulonimbus/
├── src/
│   ├── app/                           # Next.js App Router pages
│   │   ├── (auth)/                   # Auth pages (signin, signup)
│   │   ├── (main)/                   # Main app pages (dashboard, create)
│   │   ├── apps/[appId]/             # Dynamic app runtime
│   │   │   ├── AppRuntime.tsx        # Primitive-based runtime
│   │   │   ├── GeneratedRuntime.tsx  # Code-generated runtime
│   │   │   └── V2Runtime.tsx          # V2 agent-based runtime
│   │   └── api/                      # API routes
│   │       ├── scaffolder/           # V1 scaffolder endpoints
│   │       ├── scaffolder-v2/        # V2 scaffolder endpoints
│   │       └── apps/[appId]/data/    # CRUD operations
│   ├── components/
│   │   ├── primitives/               # Form, Table, Chart components
│   │   ├── scaffolder/               # Scaffolder UI components
│   │   ├── scaffolder-v2/            # V2 scaffolder components
│   │   ├── providers/                # Context providers
│   │   └── ui/                       # Shared UI components
│   └── lib/
│       ├── scaffolder/               # V1 conversational scaffolder
│       │   ├── parser.ts            # Intent parsing
│       │   ├── probe.ts              # Question generation
│       │   ├── blueprint.ts          # State management
│       │   ├── compiler.ts           # Spec compilation
│       │   ├── code-generator.ts     # Code generation
│       │   └── validators/           # Validation logic
│       ├── scaffolder-v2/            # V2 agent-based scaffolder
│       │   ├── agents/               # AI agents (orchestrator, schema-designer, etc.)
│       │   ├── state.ts              # State management
│       │   └── types.ts              # Type definitions
│       ├── primitives/               # Primitive type definitions
│       ├── generator/                # App configuration generator
│       ├── qwen/                     # Qwen API client
│       ├── db/                       # Database client
│       └── error-handling/           # Error handling utilities
└── prisma/
    └── schema.prisma                 # Database schema
```

## How It Works

### User Journey

1. **Landing & Authentication**: Sign up or sign in to access the platform
2. **Dashboard**: View all your apps, search, sort, and create new ones
3. **App Creation Flow**:
   - **Parse**: Describe your intent in natural language (e.g., "track daily expenses")
   - **Probe**: Answer AI-generated clarifying questions via interactive cards
   - **Picture**: Review the generated app preview and specification
   - **Plan**: Examine the implementation plan with architecture details
   - **Build**: Watch your app being generated with real-time status updates
   - **Preview**: Review the live preview, report issues, or accept the app
4. **App Runtime**: Use your generated app with full CRUD functionality
   - Add entries via dynamic forms
   - View data in sortable, filterable tables
   - Visualize trends with interactive charts
   - Delete entries as needed

### Example Prompts

- "I want to track my daily expenses and see where my money goes each month"
- "Help me build a habit tracker to monitor my morning routine"
- "I need to manage my freelance projects and track hours worked"

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables
4. Deploy

## Environment Variables

### Required Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/cumulonimbus"

# Authentication
NEXTAUTH_SECRET="your-secret-key"  # Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"  # Your app URL

# AI/LLM Configuration
QWEN_API_KEY="your-openrouter-api-key"  # Get from https://openrouter.ai
QWEN_API_URL="https://openrouter.ai/api/v1"  # OpenRouter API endpoint
QWEN_MODEL="qwen/qwen-2.5-coder-32b-instruct"  # Model name
QWEN_PROVIDER="openrouter"  # Provider: "openrouter" or "puter"
```

### Production Environment Variables

For production deployment, set these in your hosting platform:

```env
DATABASE_URL=           # Your production PostgreSQL URL
NEXTAUTH_SECRET=        # Generate with: openssl rand -base64 32
NEXTAUTH_URL=           # Your production URL (e.g., https://yourdomain.com)
QWEN_API_KEY=           # Your OpenRouter API key
QWEN_API_URL=           # https://openrouter.ai/api/v1
QWEN_MODEL=             # qwen/qwen-2.5-coder-32b-instruct
QWEN_PROVIDER=          # openrouter
```

### Getting an OpenRouter API Key

1. Visit [OpenRouter.ai](https://openrouter.ai)
2. Sign up for a free account
3. Navigate to Keys section
4. Create a new API key
5. Copy the key to your `.env` file

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run setup` - Quick setup (install deps, create .env, setup DB)
- `npm run db:setup` - Set up database (push schema and generate client)
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push Prisma schema to database
- `npm run db:studio` - Open Prisma Studio (database GUI)

## Future Roadmap

- [ ] Remix functionality (clone and modify apps)
- [ ] Logic-unit primitive for calculations
- [ ] More view types (calendar, kanban, timeline)
- [ ] Logic Sandbox for custom scripts
- [ ] App sharing and permissions
- [ ] Export functionality (CSV, JSON, PDF)
- [ ] Real-time collaboration
- [ ] Custom themes and branding
- [ ] API access for generated apps
- [ ] Mobile app companion

## License

MIT
