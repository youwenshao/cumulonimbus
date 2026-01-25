---
name: Autonomous Freeform Mode Implementation
overview: Transform Freeform mode into a fully autonomous agentic system using adaptive decision-making instead of hard-coded templates, and implement true real-time streaming to the UI.
todos: []
---

# Autonomous Freeform Mode Implementation

## Problem Analysis

The current Freeform mode shares the same backend as Guided mode, using:

- Hard-coded question templates from [`src/lib/scaffolder/probe.ts`](src/lib/scaffolder/probe.ts)
- Fixed flow: `parseIntent()` → `generateProbeQuestions()` → structured Q&A
- No real streaming to UI (only internal to prevent timeouts)

This violates the principle of a fully autonomous Architect that dynamically decides what to ask and when.

## Solution Architecture

```mermaid
graph TD
    User[User Message] --> FreeformAPI[/api/scaffolder/freeform]
    FreeformAPI --> Architect[Adaptive Architect]
    Architect --> Analyze[Analyze Intent & Context]
    Analyze --> Decide{Decision Graph}
    
    Decide -->|Initial Request| ExtractIntent[Extract Enhanced Intent]
    Decide -->|Clarification Needed| AskQuestion[Generate Dynamic Question]
    Decide -->|Ready to Build| GenerateSpec[Generate Spec]
    Decide -->|Refinement| UpdateSpec[Update Existing Spec]
    
    ExtractIntent --> Stream[Stream Response to UI]
    AskQuestion --> Stream
    GenerateSpec --> Stream
    UpdateSpec --> Stream
    
    Stream --> Frontend[FreeformCreator UI]
    Frontend -->|Real-time Updates| Display[Display Streamed Content]
```

## Implementation Steps

### 1. Create New Freeform-Specific API Endpoint

**File**: [`src/app/api/scaffolder/freeform/route.ts`](src/app/api/scaffolder/freeform/route.ts) (new file)

- Use `AdaptiveArchitect` pattern from V2 (reference: [`src/lib/scaffolder-v2/agents/adaptive-architect.ts`](src/lib/scaffolder-v2/agents/adaptive-architect.ts))
- Implement SSE streaming for real-time updates
- No hard-coded question templates
- Dynamic decision-making at each turn

**Key differences from V2**:

- Simpler state management (no parallel pipeline complexity)
- Focus on conversational flow, not multi-agent coordination
- Direct SSE streaming of LLM responses

### 2. Create Freeform-Specific Architect Agent

**File**: [`src/lib/scaffolder/freeform-architect.ts`](src/lib/scaffolder/freeform-architect.ts) (new file)

The agent should:

1. **Analyze user message** - Extract intent, context, and complexity
2. **Make autonomous decisions**:

   - Should I ask a clarifying question?
   - What specific information do I need?
   - Can I infer details from context?
   - Am I ready to generate a spec?

3. **Generate dynamic responses** - No templates, fully contextual
4. **Track conversation readiness** - Progress toward buildable spec (0-100 score)

**System Prompt** (conceptual):

```
You are an autonomous AI Architect building apps through conversation.

PRINCIPLES:
- Ask questions ONLY when truly necessary
- Infer technical details (field types, validations, UI patterns)
- Learn from conversation context
- Decide dynamically when you have enough information to build
- Generate specs without rigid templates

CAPABILITIES:
- Extract entities and relationships from natural language
- Detect reference apps ("like Trello") and apply their patterns
- Make smart assumptions about data types and validations
- Propose multiple options when appropriate
- Know when you're ready to build (readiness score 0-100)

FLOW:
1. Initial message → Extract intent and entities
2. If unclear → Ask specific, contextual questions
3. If clear → Confirm understanding and propose spec
4. User refinement → Update spec dynamically
5. User approval → Generate code
```

### 3. Implement True Streaming to Frontend

**Current issue**: DeepSeek responses are collected internally then sent all at once.

**Fix**:

- Stream each LLM token/chunk directly to frontend via SSE
- Update [`src/components/scaffolder/FreeformCreator.tsx`](src/components/scaffolder/FreeformCreator.tsx) to handle real-time streaming
- Add typewriter effect for assistant messages

**Technical approach**:

```typescript
// In API route
const stream = new ReadableStream({
  async start(controller) {
    for await (const chunk of llmClient.streamComplete(options)) {
      const data = { type: 'chunk', content: chunk };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    }
    controller.close();
  }
});
```

### 4. Update FreeformCreator Component

**File**: [`src/components/scaffolder/FreeformCreator.tsx`](src/components/scaffolder/FreeformCreator.tsx)

Changes:

- Connect to new `/api/scaffolder/freeform` endpoint
- Handle real-time streaming events
- Display assistant messages with typewriter effect
- Remove hard-coded question handling (no `options` metadata)
- Add dynamic "Build App" button when Architect signals readiness

**State management**:

```typescript
interface FreeformState {
  messages: Message[];
  currentResponse: string; // Accumulates streaming chunks
  readinessScore: number; // 0-100, determines if "Build" appears
  isStreaming: boolean;
  canBuild: boolean;
}
```

### 5. Remove Hard-Coded Templates

**Files to modify**:

- [`src/lib/scaffolder/probe.ts`](src/lib/scaffolder/probe.ts) - Keep for Guided mode, but not used by Freeform
- [`src/lib/scaffolder/parser.ts`](src/lib/scaffolder/parser.ts) - Keep for Guided mode

**Principle**: Freeform should never import or use these files. It uses the adaptive architect exclusively.

### 6. Readiness Scoring System

The Architect tracks readiness across dimensions:

- **Entities Defined** (0-40 points): Core data models identified
- **Relationships Clear** (0-30 points): How entities connect
- **UI Pattern Decided** (0-20 points): Layout and views
- **Confidence Level** (0-10 points): How certain the Architect is

When readiness ≥ 80, the "Build My App" button appears.

### 7. Example Conversation Flow

```
User: "I want to track my workouts"

Architect (streaming):
"I understand you want a workout tracker. Let me think about what 
we'll need...

I'm envisioning:
- A Workout entity (date, exercise, sets, reps, weight)
- A table view to see your history
- Charts to visualize progress over time

A few questions to refine this:
1. Do you track multiple exercises per workout session?
2. Do you want to track cardio (duration, distance) separately?"

[Readiness: 45/100]
```

After user responds:

```
Architect (streaming):
"Perfect! So we'll have:
- WorkoutSession (date, duration, notes)
- Exercise (name, sets, reps, weight, exercise_type)
- Many exercises per session

I can build this now. Ready to proceed?"

[Readiness: 85/100] → "Build My App" button appears
```

## Architecture Comparison

### Before (Current):

```
User → /api/scaffolder → parseIntent() → Fixed Templates → Questions → Spec
```

### After (Autonomous):

```
User → /api/scaffolder/freeform → FreeformArchitect → Dynamic Analysis → 
  → Context-Aware Response → [Loop until ready] → Spec Generation
```

## Implementation Notes

1. **DeepSeek Streaming**: Already implemented internally in [`src/lib/llm/deepseek-client.ts`](src/lib/llm/deepseek-client.ts). Just need to expose it to the API route.

2. **Backward Compatibility**: Guided mode (`/api/scaffolder`) remains unchanged. Only Freeform gets the new architecture.

3. **Demo Mode**: The demo scenarios can still work, but should use the autonomous flow (pre-scripted responses, not templates).

4. **Error Handling**: Fallback to simpler prompts if LLM fails, never hard-coded questions.

## Success Criteria

- ✅ No hard-coded question templates in Freeform flow
- ✅ Real-time streaming visible in UI (typewriter effect)
- ✅ Architect makes autonomous decisions about what to ask
- ✅ Readiness scoring determines when "Build" button appears
- ✅ Guided mode unaffected (still uses templates)
- ✅ Natural, conversational interaction

## Files to Create/Modify

**New Files**:

- `src/app/api/scaffolder/freeform/route.ts`
- `src/lib/scaffolder/freeform-architect.ts`

**Modified Files**:

- `src/components/scaffolder/FreeformCreator.tsx` (complete rewrite of message handling)
- `src/app/(main)/create/page.tsx` (point demo mode to new endpoint)

**Unchanged Files** (for Guided mode):

- `src/app/api/scaffolder/route.ts`
- `src/lib/scaffolder/probe.ts`
- `src/lib/scaffolder/parser.ts`