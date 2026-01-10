# Cumulonimbus

Transform natural language descriptions into working web applications through AI-powered conversational scaffolding.

## Overview

Cumulonimbus is an intent-to-application platform that allows non-technical users to describe their tracking needs in plain English and receive a fully functional, personalized web application.

### Key Features

- **Natural Language Input**: Describe what you want to track in plain English
- **Conversational Scaffolder**: AI-powered dialogue that clarifies requirements
- **Instant App Generation**: Working apps generated in seconds
- **Three Core Primitives**: Form, Table, and Chart components
- **Full CRUD Operations**: Add, edit, delete, and view your data
- **Personal Dashboard**: Manage all your generated apps

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
   
   Then edit `.env` with your values:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/cumulonimbus"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   QWEN_API_KEY="your-openrouter-api-key"
   QWEN_API_URL="https://openrouter.ai/api/v1"
   QWEN_MODEL="qwen/qwen-2.5-coder-32b-instruct"
   QWEN_PROVIDER="openrouter"
   ```

4. Set up the database:
   ```bash
   npx prisma db push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
cumulonimbus/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Auth pages (signin, signup)
│   │   ├── (main)/            # Main app pages (dashboard, create)
│   │   ├── apps/[appId]/      # Dynamic app runtime
│   │   └── api/               # API routes
│   ├── components/
│   │   ├── primitives/        # Form, Table, Chart components
│   │   ├── providers/         # Context providers
│   │   └── ui/                # Shared UI components
│   └── lib/
│       ├── scaffolder/        # Conversational scaffolder logic
│       ├── primitives/        # Primitive type definitions
│       ├── generator/         # App configuration generator
│       ├── qwen/              # Qwen API client
│       └── db/                # Database client
└── prisma/
    └── schema.prisma          # Database schema
```

## How It Works

1. **Parse**: User describes their tracking need
2. **Probe**: AI asks clarifying questions about data, views, and features
3. **Picture**: Preview of the app is shown for confirmation
4. **Plan**: Final spec is compiled and app is generated

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

### Environment Variables for Production

```env
DATABASE_URL=           # Your production PostgreSQL URL
NEXTAUTH_SECRET=        # Generate with: openssl rand -base64 32
NEXTAUTH_URL=           # Your production URL
QWEN_API_KEY=           # Your OpenRouter API key
QWEN_API_URL=           # https://openrouter.ai/api/v1
QWEN_MODEL=             # qwen/qwen-2.5-coder-32b-instruct
QWEN_PROVIDER=          # openrouter
```

## Future Roadmap

- [ ] Remix functionality (clone and modify apps)
- [ ] Logic-unit primitive for calculations
- [ ] More view types (calendar, kanban, timeline)
- [ ] Logic Sandbox for custom scripts
- [ ] App sharing and permissions
- [ ] Export functionality

## License

MIT
