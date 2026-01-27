I will implement the requested design updates across the application, focusing on visual consistency with the homepage and redesigning the Advanced Chat experience.

### 1. Theme Toggle Implementation

* **Verify & Enhance**: The `ThemeToggle` component and `ThemeProvider` are already present. I will review `globals.css` to ensure smooth color transitions (e.g., adding `transition-colors duration-300` to base layers) are applied globally.

* **Homepage Integration**: Confirm the toggle's placement in the homepage header aligns with the design system.

### 2. Settings Page Redesign

* **Target File**: `src/app/(main)/settings/page.tsx`

* **Typography**: Update section headings to use `font-serif` to match the homepage.

* **Visual Hierarchy**:

  * Refine the header to match the homepage's aesthetic.

  * Update card styles and spacing to align with the "atmospheric" design language.

  * Ensure consistent use of `surface-base`, `surface-elevated`, and `outline-mid` colors.

### 3. Create Page Harmonization

* **Target File**: `src/app/(main)/create/page.tsx`

* **Mode Selection Screen**:

  * Update "Create Your App" heading to `font-serif`.

  * Style the mode selection cards (Freeform, Guided, Advanced) to match the homepage's `ValueCard` design (hover effects, typography).

* **Freeform Chat** (`src/components/scaffolder/FreeformCreator.tsx`):

  * Update headers to `font-serif`.

  * Ensure input fields and buttons match the global component library.

* **Guided Chat** (`CreatePageV1` in `src/app/(main)/create/page.tsx`):

  * Update headers to `font-serif`.

  * Maintain the existing functionality while polishing the visual container.

### 4. Advanced Chat Redesign (New IDE Landing Page)

* **Target File**: `src/app/(main)/create/page.tsx` (replacing the `mode === 'v2'` section)

* **Concept**: Create a premium "Product Landing Page" for the Cumulonimbus IDE.

* **Key Sections**:

  * **Hero**: "Cumulonimbus IDE" title in `font-serif`, with a compelling tagline for experienced developers.

  * **Feature Showcase**: Highlighting "Advanced Workflow Control", "Agent Orchestration", and "Local-First Performance".

  * **Visuals**: Integrate `ParticleBackground` or similar atmospheric effects to create a "premium" feel.

  * **Call to Action**: Distinct "Download" (Coming Soon) and "Waitlist" buttons with hover states.

* **Inspiration**: Draw from the "Stratosphere" theme (dark, sleek, yellow accents) to make it stand out as a pro tool.

### Implementation Steps

1. **Global Styles**: Add transition properties to `globals.css` for smooth theme switching.
2. **Settings Page**: Refactor `settings/page.tsx` UI components.
3. **Create Page**: Update typography and card styles in `create/page.tsx` and `FreeformCreator.tsx`.
4. **Advanced Page**: Completely rewrite the V2 render logic in `create/page.tsx` to build the new IDE landing page.
5. **Verification**: Verify all pages for responsiveness, theme switching smoothness, and functional integrity.

