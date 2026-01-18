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
- **AI**: Smart LLM routing (Local Ollama/LM Studio + OpenRouter fallback)
  - **Local Models**: Ollama (Qwen3-coder:30b, Qwen3:4b) or LM Studio (any model)
  - **Cloud Fallback**: Qwen API via OpenRouter (free tier)
- **Auth**: NextAuth.js
- **Styling**: Tailwind CSS
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- **AI Options** (choose one or more):
  - **Local AI - Ollama**: Ollama (recommended for privacy and offline use)
  - **Local AI - LM Studio**: LM Studio (alternative local option with any model)
  - **Cloud AI**: Qwen API key from OpenRouter (free tier available)

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

3. **Set up AI providers** (choose your preferred option):

   **Option A: Local AI with Ollama (Recommended)**
   ```bash
   # Install Ollama (macOS)
   brew install ollama

   # Install Ollama (Linux)
   curl -fsSL https://ollama.ai/install.sh | sh

   # Start Ollama service
   ollama serve

   # Pull recommended models (in another terminal)
   ollama pull qwen3-coder:30b  # Main model for code generation
   ollama pull qwen3:4b         # Smaller model for faster tasks
   ```

   **Option B: Cloud AI with OpenRouter**
   - Visit [OpenRouter.ai](https://openrouter.ai)
   - Sign up for a free account
   - Create an API key
   - Copy the key for environment setup

   **Option C: LM Studio (alternative local AI)**
   ```bash
   # Download and install LM Studio from https://lmstudio.ai/
   # Start LM Studio and download your preferred models
   # Start the local server (default port 1234)
   ```

   **Option D: Multiple providers (recommended for maximum reliability)**
   - Set up Ollama, LM Studio, and/or OpenRouter for automatic fallback

4. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

   Then edit `.env` with your values (see [Environment Variables](#environment-variables) section below)

5. Set up the database:
   ```bash
   npm run db:setup
   # or manually:
   npx prisma db push
   npx prisma generate
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000)

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

**Note**: Configure your AI providers in `.env`:
- For Ollama: Install Ollama and run `ollama pull qwen3-coder:30b` and `ollama pull qwen3:4b`
- For LM Studio: Download from lmstudio.ai and load your preferred models
- For OpenRouter: Get an API key from openrouter.ai

**Note**: The setup script will configure environment variables for Ollama, LM Studio, and OpenRouter. Make sure to:
- Install and start Ollama if using Ollama
- Install and start LM Studio if using LM Studio
- Add your OpenRouter API key if using cloud AI

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

### AI Architecture

Cumulonimbus uses a smart LLM routing system that automatically selects the best available AI provider:

- **Local Priority**: Prefers local providers (Ollama → LM Studio) for privacy, speed, and offline capability
- **Cloud Fallback**: Falls back to OpenRouter (Qwen API) when local providers are unavailable
- **Health Monitoring**: Continuously monitors provider availability and switches automatically
- **Streaming Support**: Real-time code generation with live progress updates

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

# AI/LLM Configuration - Choose your provider(s)
LLM_PROVIDER="deepseek"  # "auto", "ollama", "openrouter", "lmstudio", or "deepseek"
LLM_FALLBACK_ENABLED="true"  # Enable automatic fallback between providers

# Ollama Configuration (Local AI)
OLLAMA_ENABLED="true"  # Set to false to disable local AI
OLLAMA_API_URL="http://localhost:11434"  # Ollama server URL
OLLAMA_MODEL="qwen3-coder:30b"  # Main model for complex tasks
OLLAMA_SMALL_MODEL="qwen3:4b"  # Smaller model for simple tasks

# LM Studio Configuration (Local AI - Alternative to Ollama)
LMSTUDIO_ENABLED="false"  # Set to true to enable LM Studio
LMSTUDIO_API_URL="http://localhost:1234"  # LM Studio server URL
LMSTUDIO_MODEL="local-model"  # Model name (will be auto-discovered)

# OpenRouter Configuration (Cloud AI - Fallback)
OPENROUTER_API_KEY="your-openrouter-api-key"  # Get from https://openrouter.ai
OPENROUTER_API_URL="https://openrouter.ai/api/v1"  # OpenRouter API endpoint
OPENROUTER_MODEL="qwen/qwen-2.5-coder-32b-instruct"  # Cloud model

# DeepSeek Configuration (Cloud AI)
DEEPSEEK_API_KEY="your-deepseek-api-key"
DEEPSEEK_API_URL="https://api.deepseek.com"
DEEPSEEK_MODEL="deepseek-chat"
```

### Production Environment Variables

For production deployment, set these in your hosting platform:

```env
DATABASE_URL=           # Your production PostgreSQL URL
NEXTAUTH_SECRET=        # Generate with: openssl rand -base64 32
NEXTAUTH_URL=           # Your production URL (e.g., https://yourdomain.com)
OLLAMA_ENABLED=         # true/false - Enable Ollama
OLLAMA_API_URL=         # http://localhost:11434
OLLAMA_MODEL=           # qwen3-coder:30b
OLLAMA_SMALL_MODEL=     # qwen3:4b
LMSTUDIO_ENABLED=       # true/false - Enable LM Studio
LMSTUDIO_API_URL=       # http://localhost:1234
LMSTUDIO_MODEL=         # local-model
OPENROUTER_API_KEY=     # Your OpenRouter API key
OPENROUTER_API_URL=     # https://openrouter.ai/api/v1
OPENROUTER_MODEL=       # qwen/qwen-2.5-coder-32b-instruct
DEEPSEEK_API_KEY=       # Your DeepSeek API key
DEEPSEEK_API_URL=       # https://api.deepseek.com
DEEPSEEK_MODEL=         # deepseek-chat
LLM_PROVIDER=           # auto/ollama/lmstudio/openrouter/deepseek
LLM_FALLBACK_ENABLED=   # true/false
```

### Getting an OpenRouter API Key

1. Visit [OpenRouter.ai](https://openrouter.ai)
2. Sign up for a free account
3. Navigate to Keys section
4. Create a new API key
5. Copy the key to your `.env` file

### Ollama Setup and Management

#### Installing Ollama

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Windows:**
Download from [ollama.ai](https://ollama.ai/download)

#### Starting Ollama and Installing Models

```bash
# Start the Ollama service
ollama serve

# In another terminal, pull the recommended models
ollama pull qwen3-coder:30b  # Main model for complex code generation
ollama pull qwen3:4b         # Smaller model for faster tasks
```

#### Managing Models

```bash
# List installed models
ollama list

# Remove unused models
ollama rm model_name

# Check running models
ollama ps
```

#### Troubleshooting Ollama

- **Service won't start**: Make sure port 11434 is available
- **Models not downloading**: Check your internet connection and available disk space
- **Connection errors**: Verify Ollama is running with `ollama serve`
- **Memory issues**: Try the smaller `qwen3:4b` model for resource-constrained systems

### LM Studio Setup and Management

#### Installing LM Studio

1. Visit [LM Studio website](https://lmstudio.ai/)
2. Download and install the application for your platform (macOS, Windows, Linux)
3. Launch LM Studio

#### Starting LM Studio and Loading Models

```bash
# LM Studio GUI Steps:
# 1. Open LM Studio
# 2. Go to "My Models" tab
# 3. Search and download your preferred models
# 4. Go to "Chat" or "Local Server" tab
# 5. Load a model
# 6. Start the local server (default port 1234)
```

#### LM Studio Local Server

LM Studio provides an OpenAI-compatible API server that runs on `http://localhost:1234` by default. Cumulonimbus will automatically discover available models when you load them in LM Studio.

#### Troubleshooting LM Studio

- **Server won't start**: Make sure port 1234 is available
- **Models not loading**: Ensure you have sufficient RAM/VRAM for the selected model
- **Connection errors**: Verify LM Studio server is running and accessible
- **Performance issues**: Try smaller models or adjust context length

### AI Provider Configuration

Cumulonimbus automatically selects the best available AI provider based on your configuration:

#### Configuration Options

- **`LLM_PROVIDER="auto"`** (Local-first): Automatically prefers local providers (Ollama → LM Studio), then hosted providers
- **`LLM_PROVIDER="deepseek"`** (Default): Forces use of cloud DeepSeek models only
- **`LLM_PROVIDER="ollama"`**: Forces use of local Ollama models only
- **`LLM_PROVIDER="lmstudio"`**: Forces use of local LM Studio models only
- **`LLM_PROVIDER="openrouter"`**: Forces use of cloud OpenRouter models only

#### Provider Priority Logic

1. **Health Check**: System checks if Ollama, LM Studio, OpenRouter, and DeepSeek are available
2. **Auto Mode**: If `LLM_PROVIDER="auto"` → prefers Ollama, then LM Studio, then hosted providers
3. **Fallback**: If primary provider fails and `LLM_FALLBACK_ENABLED="true"` → try other providers in priority order
4. **Error**: If no providers available → show error message

#### Model Selection

- **Complex tasks** (code generation): Uses main model (`qwen3-coder:30b` or cloud equivalent)
- **Simple tasks** (validation, parsing): Uses small model (`qwen3:4b` or cloud equivalent)

#### Privacy and Performance

- **Local AI (Ollama)**: Maximum privacy, no API costs, works offline, Qwen models optimized
- **Local AI (LM Studio)**: Maximum privacy, no API costs, works offline, supports any model
- **Cloud AI (OpenRouter)**: Hosted models via OpenRouter, API costs apply
- **Cloud AI (DeepSeek)**: High-quality hosted models via DeepSeek API, API costs apply
- **Hybrid**: Best of both worlds with automatic failover between all providers

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
