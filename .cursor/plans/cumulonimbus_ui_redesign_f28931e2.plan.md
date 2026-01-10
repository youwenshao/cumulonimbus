---
name: Cumulonimbus UI Redesign
overview: Transform Cumulonimbus with a cohesive, minimalist brand identity featuring a dark atmospheric aesthetic, bold red accents, and a "calm storm" philosophy—creating an interface that feels like the serene eye of a powerful creative storm.
todos: []
---

# Cumulonimbus UI Redesign

## Design Philosophy

**Calm Storm:** The interface is the serene "eye of the storm"—a controlled, focused space where immense generative power is harnessed effortlessly. Every element exists with purpose, using layers of transparent greys and bold red accents to create atmospheric depth.

## Color System Update

Update [`tailwind.config.ts`](tailwind.config.ts) with the new atmospheric color palette:

**Base Colors:**

- Base/Background: `#000000` or `#050505` (true black for maximum depth)
- Surface layers: `#0a0a0a`, `#111111`, `#1a1a1a` (atmospheric layers)
- Borders/Outlines: `#2d2d2d`, `#333333` (low emphasis structure)

**Text Hierarchy:**

- Primary: `#FFFFFF` (sharp clarity)
- Secondary: `#cccccc` (readable grey)
- Tertiary: `#888888` (placeholders, de-emphasized)

**Accent System:**

- **Bold Red:** `#FF3B30` (the singular focus point—buttons, actions, energy)
- Pastel Blue (10% opacity): User messages/info states
- Pastel Green (10% opacity): Success/execution blocks
- Pastel Yellow (10% opacity): Warnings/system messages
- Pastel Purple (5% opacity): AI/Architect elements (very subtle)

**Key Change:** Replace the current green (`primary`) and purple (`accent`) with true black bases and the singular red accent.

## Typography System

Update [`src/app/layout.tsx`](src/app/layout.tsx) to use Next.js Font Optimization:

**Font Stack:**

1. **Primary UI Sans-Serif:** `Inter` via `next/font/google`

   - Use for: All UI elements, body text, buttons, labels
   - Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

2. **Elegant Serif:** `Source Serif Pro` via `next/font/google`

   - Use for: Brand moments only (definition block on landing page, major section headers)
   - Weight: 400 (regular)

3. **Monospace:** `JetBrains Mono` via `next/font/google`

   - Use for: Code blocks, technical content
   - Weight: 400 (regular)

Apply fonts using CSS variables and update Tailwind config:

- `font-sans`: Inter
- `font-serif`: Source Serif Pro
- `font-mono`: JetBrains Mono

## Animation System

Add to [`tailwind.config.ts`](tailwind.config.ts):

**Timing:** Fast, confident transitions (200-300ms)

**Custom Bezier Curve:** `cubic-bezier(0.4, 0.0, 0.2, 1)` for sharp, confident feel

**Key Animations:**

- `fadeIn`: 200ms opacity transition
- `slideIn`: 250ms translate with ease
- `glow`: Subtle red pulse for loading states
- `panelSlide`: 300ms for right rail context panel

Update [`globals.css`](src/app/globals.css) with new base styles:

- Base background: true black
- Smooth scrollbar styling (dark theme)
- Focus states with red accent
- Backdrop blur utilities for layered depth

## Component Implementation

### 1. Landing Page Redesign

File: [`src/app/page.tsx`](src/app/page.tsx)

**Hero Layer (The Stratosphere):**

- Create new component: `<ParticleBackground />` 
  - Canvas-based animation with ultra-subtle, slow-moving cloud wisps on `#0a0a0a`
  - 50-100 particles, low opacity (0.05-0.1), slow drift animation
  - Particle color: `#ffffff` with very low alpha
- **Logo:** "Cumulonimbus" in Inter Bold with subtle red circle/dot accent on the "o" in "nimbus"
- **Tagline:** "Solving problems at the speed of thought." in Inter Regular
- **Definition Block:** Use Source Serif Pro:
```
**Cu·mu·lo·nim·bus** | /ˌkjuːmjəloʊˈnɪmbəs/
*noun* Meteorology
A dense, towering vertical cloud, associated with thunderstorms and atmospheric instability. It is capable of producing powerful, generative phenomena.
```

- **Primary CTA:** Pill-shaped button with `#FF3B30` background, "Enter the Atmosphere", red glow on hover

**Value Proposition Layer (The Cumulus Deck):**

- Background: `#1a1a1a` with gradient fade to `#0a0a0a`
- Three cards with `#2d2d2d` outlines:

  1. **The Architect:** Blueprint/building icon
  2. **The Cloud:** Layered cloud icon  
  3. **The Clarity:** Sparkling thought bubble icon

- Card style: Dark background (`#111`), subtle border, hover state with slight glow

**Social Proof Layer (The Cirrus):**

- Single-line divider in `#333`
- "Trusted by builders at" text
- Horizontal row of greyscale tech company logos (GitHub, Vercel, Stripe, Linear, etc.)
- Logos in SVG format, filtered to greyscale, opacity: 0.6, hover: 0.9

**Footer (The Earth):**

- Solid `#111` background
- Minimal links in `#888` (Blog, Terms, Privacy)
- Small cumulonimbus cloud icon/logomark

### 2. Main Application Chat Interface Redesign

File: [`src/app/(main)/create/page.tsx`](src/app/\\\(main)/create/page.tsx)

**Layout Architecture:**

**Left Rail (60px):**

- Create component: `<LeftNav />`
- True black background (`#000`)
- Vertical icon navigation:
  - Home (cloud icon)
  - Projects (folder icon)
  - Users (avatar icon)
  - Settings (cog icon)
- Icons: Inactive `#333`, Active/Hover `#FFF` or `#FF3B30`
- Positioned fixed left

**Center Panel (Chat - The "Nave"):**

- Base: `#050505` background (near-black for depth)
- Full-bleed width between left rail and right rail

**Message Styling:**

- **User Messages:**
  - Align right
  - Bubble background: Dark pastel blue (`#1a2a3a` at 20% opacity)
  - Text: `#e1e1e1`
  - Rounded corners: `border-radius: 1rem`

- **Architect Messages:**
  - Align left
  - **NO bubble background** (the Architect's voice IS the interface)
  - Text: `#ffffff`
  - Prefix with elegant "A" insignia in `#888888`
  - Appears directly on base background

- **Code Blocks within Architect Messages:**
  - Background: `#111`
  - **Border-left: 3px solid `#FF3B30`** (signature red accent)
  - Syntax highlighting using custom pastel palette:
    - Keywords: pastel blue (`#6bb1e0`)
    - Strings: pastel yellow (`#f0d890`)
    - Functions: pastel purple (`#c8b0f0`)
    - Comments: `#666`

- **AI Action/Execution Blocks:**
  - Non-interruptive event block appearance
  - Background: `#0f1a0f` (dark pastel green)
  - Outline: `#2d4a2d`
  - Text: "⚡ **Architect is executing the build plan...**"
  - Minimal progress bar with red fill

**Chat Input Bar (The Runway):**

- Position: Fixed to bottom of center panel
- Design: Long thin bar (`#1a1a1a`) with subtle inset shadow for depth
- Input field:
  - Full width
  - Background: transparent
  - Text: `#ccc`
  - Placeholder: "Describe, instruct, or question... (Shift+Enter for newline)"
  - Border: none (visual separation from bar background)

- **Send Button:**
  - **Bold red circle** (`#FF3B30`) positioned far right
  - Icon: Upward chevron or paper plane in white
  - Hover: Slightly brighter red (`#FF4B40`)

- **Thinking Indicator:**
  - When Architect is processing: animated red pulse emanating from send button
  - Subtle, continuous pulse animation

**Right Rail (Context Panel - Collapsible):**

- Create component: `<ContextPanel />`
- Default: Collapsed (hidden)
- Slides in as sheet over chat
- Background: `#111`
- Width when open: 400px
- **Tabs:** 
  - File Explorer (placeholder)
  - Live Output Terminal (placeholder)
  - Documentation Search (placeholder)
- Tab styling: Active tab has red underline (`#FF3B30`)
- Close button (X) in top-right corner

### 3. Dashboard Redesign

File: [`src/app/(main)/dashboard/page.tsx`](src/app/\\\(main)/dashboard/page.tsx)

**Header:**

- Background: `#0a0a0a` with subtle border-bottom `#2d2d2d`
- Logo: "Cumulonimbus" with subtle red accent
- User email and sign out link in `#888`

**Content:**

- Base background: `#000` or `#050505`
- App cards:
  - Background: `#111` with `#2d2d2d` border
  - Hover: Subtle red glow/shadow effect
  - Status badges:
    - Active: Green pastel background
    - Draft: Yellow pastel background
    - Generating: Blue pastel background
  - Open button: Red (`#FF3B30`) with white text

**Empty State:**

- Center-aligned
- Large subtle icon in `#2d2d2d`
- Text in `#cccccc`
- "Create Your First App" button in red

### 4. Generated App Runtime Redesign

File: [`src/app/apps/[appId]/AppRuntime.tsx`](src/app/apps/[appId]/AppRuntime.tsx)

**Layout:**

- Background: `#050505`
- Header: `#0a0a0a` with border-bottom

**Form Primitive:**

File: [`src/components/primitives/FormPrimitive.tsx`](src/components/primitives/FormPrimitive.tsx)

- Background: `#111` card
- Input fields: `#1a1a1a` background, `#2d2d2d` border, `#ccc` text
- Labels: `#888`
- Submit button: Red (`#FF3B30`)

**Table Primitive:**

File: [`src/components/primitives/TablePrimitive.tsx`](src/components/primitives/TablePrimitive.tsx)

- Background: `#111` card
- Header row: `#1a1a1a` with `#2d2d2d` bottom border
- Data rows: `#111`, alternate row hover: `#1a1a1a`
- Border color: `#2d2d2d`
- Text: `#ffffff` for data, `#cccccc` for headers
- Delete button: Red hover state

**Chart Primitive:**

File: [`src/components/primitives/ChartPrimitive.tsx`](src/components/primitives/ChartPrimitive.tsx)

- Background: `#111` card
- Chart colors: Custom pastel palette (blues, greens, yellows for data series)
- Axis labels: `#888`
- Grid lines: `#2d2d2d`

### 5. Auth Pages Redesign

Files: [`src/app/(auth)/auth/signin/page.tsx`](src/app/\\\(auth)/auth/signin/page.tsx), [`src/app/(auth)/auth/signup/page.tsx`](src/app/\\\(auth)/auth/signup/page.tsx)

**Layout:**

- Full-screen centered card on `#000` background
- Card: `#111` background with `#2d2d2d` border
- Form inputs: `#1a1a1a` background, `#2d2d2d` border
- Submit button: Red (`#FF3B30`)
- Links: `#888` with red hover
- Logo centered above card

## Component Breakdown

### New Components to Create:

1. **`<ParticleBackground />`** - Canvas-based particle animation

   - File: `src/components/ui/ParticleBackground.tsx`
   - Configurable particle count, speed, opacity
   - RequestAnimationFrame for smooth 60fps animation

2. **`<LeftNav />`** - Thin vertical navigation rail

   - File: `src/components/ui/LeftNav.tsx`
   - Icon-only navigation with tooltips
   - Active state management

3. **`<ContextPanel />`** - Collapsible right sidebar

   - File: `src/components/ui/ContextPanel.tsx`
   - Tab system with panel slide animation
   - Placeholder content for File Explorer, Terminal, Documentation

4. **`<ArchitectMessage />`** - Specialized message component

   - File: `src/components/ui/ArchitectMessage.tsx`
   - "A" insignia prefix
   - Code block rendering with red border-left
   - Action/execution block support

5. **`<ChatInputBar />`** - The "runway" input interface

   - File: `src/components/ui/ChatInputBar.tsx`
   - Multi-line support (Shift+Enter)
   - Red circle send button
   - Thinking pulse animation state

6. **`<SocialProofLogos />`** - Tech company logo grid

   - File: `src/components/ui/SocialProofLogos.tsx`
   - SVG logos for: GitHub, Vercel, Linear, Stripe, Supabase, Notion
   - Greyscale filter with hover effects

## Implementation Sequence

### Step 1: Foundation

- Update `tailwind.config.ts` with new color palette
- Set up Next.js fonts in `layout.tsx`
- Update `globals.css` with base styles and animations
- Create custom color variables and utilities

### Step 2: Shared Components

- Create `<ParticleBackground />`
- Create `<LeftNav />`
- Create `<ContextPanel />`
- Create `<ArchitectMessage />`
- Create `<ChatInputBar />`
- Create `<SocialProofLogos />`

### Step 3: Landing Page

- Redesign hero section with particle background
- Add definition block with Source Serif Pro
- Rebuild value proposition cards
- Add social proof section
- Update footer

### Step 4: Chat Interface

- Restructure create page with three-column layout
- Integrate `<LeftNav />` and `<ContextPanel />`
- Update message rendering with new styling
- Replace input area with `<ChatInputBar />`
- Add code block syntax highlighting
- Add AI action/execution blocks

### Step 5: Dashboard

- Update header with new dark theme
- Redesign app cards with dark aesthetic
- Update empty state
- Add red accent buttons

### Step 6: App Runtime & Primitives

- Update `<AppRuntime />` header and layout
- Redesign `<FormPrimitive />` with dark inputs
- Redesign `<TablePrimitive />` with dark theme
- Update `<ChartPrimitive />` with custom colors

### Step 7: Auth Pages

- Update signin page with dark centered card
- Update signup page with dark centered card

### Step 8: Polish

- Verify all animations use 200-300ms timing
- Test all hover states and transitions
- Ensure red accent is used consistently for primary actions
- Verify color contrast meets accessibility standards
- Test responsive behavior on mobile/tablet

## Technical Considerations

**Performance:**

- Particle animation optimized with RequestAnimationFrame
- Canvas rendering limited to 60fps
- Particle count kept