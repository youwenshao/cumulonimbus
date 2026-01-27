# Tech Stack

- You are building a React application with Vite.
- Use TypeScript for all files.
- Use React Router for navigation. KEEP the routes in src/App.tsx
- Always put source code in the src/ folder.
- Put pages into src/pages/
- Put components into src/components/
- The main page (default page) is src/pages/Index.tsx
- UPDATE the main page to include the new components. OTHERWISE, the user can NOT see any components!
- ALWAYS try to use the shadcn/ui library.
- Tailwind CSS: always use Tailwind CSS for styling components. Utilize Tailwind classes extensively for layout, spacing, colors, and other design aspects.

# Data Persistence

Apps use the Nebula data API for persistence:

```typescript
import { useNebulaData, generateId } from '@/lib/nebula-client';

// In your component:
const { data, isLoading, create, update, remove, refresh } = useNebulaData<YourRecordType>();

// Create a new record
await create({ id: generateId(), name: 'New Item', ...otherFields });

// Update a record
await update(recordId, { name: 'Updated Name' });

// Delete a record
await remove(recordId);
```

No need for external databases - data is automatically persisted!

# Available Packages and Libraries

- The lucide-react package is installed for icons.
- You ALREADY have ALL the shadcn/ui components and their dependencies installed. So you don't need to install them again.
- You have ALL the necessary Radix UI components installed.
- Use prebuilt components from the shadcn/ui library after importing them. Note that these files shouldn't be edited, so make new components if you need to change them.
- @tanstack/react-query is available for complex data fetching needs.
- react-hook-form with zod validation is available for forms.
- date-fns is available for date manipulation.
- recharts is available for charts and data visualization.

# File Structure

```
src/
├── App.tsx           # Main app with routes
├── main.tsx          # Entry point
├── globals.css       # Global styles
├── components/
│   ├── ui/           # Shadcn UI components (pre-installed)
│   └── [YourComponents].tsx
├── pages/
│   ├── Index.tsx     # Main page
│   └── [YourPages].tsx
├── lib/
│   ├── utils.ts      # Utility functions (cn helper)
│   └── nebula-client.ts  # Data persistence
└── hooks/
    └── [YourHooks].ts
```

# Import Paths

Use the @ alias for imports:
- `import { Button } from '@/components/ui/button'`
- `import { useNebulaData } from '@/lib/nebula-client'`
- `import { cn } from '@/lib/utils'`
