---
name: Improve Architect Advisor Prompts
overview: Make the Architect/Advisor system less conservative so clear requests like "habit tracker with heat map" can build at 60-70% readiness instead of getting stuck. Trust the V2 specialized agents to handle ambiguity.
todos:
  - id: architect-readiness
    content: Update Architect readiness scoring thresholds (80→70)
    status: completed
  - id: architect-inference
    content: Add common app pattern examples and strengthen inference guidance
    status: completed
  - id: architect-questions
    content: Rewrite analysis prompt to emphasize inference over asking
    status: completed
  - id: advisor-approval
    content: Make Advisor approval criteria more liberal
    status: completed
  - id: advisor-confidence
    content: Lower Advisor confidence scoring thresholds (70→60)
    status: completed
  - id: orchestrator-threshold
    content: Lower MIN_CONFIDENCE_TO_APPROVE from 70 to 60
    status: completed
  - id: route-readiness
    content: Lower canBuild readiness threshold from 80 to 70
    status: completed
  - id: phase-logic
    content: Adjust phase determination logic (60→50 for refining)
    status: completed
isProject: false
---

# Improve Architect/Advisor Prompts for Faster Building

## Problem

Simple, clear requests like "habit tracker with heat map" get stuck at 60% readiness because:

- System requires 80% readiness to build
- Prompts bias toward asking questions instead of inferring details
- Advisor marks minor gaps as "critical"
- V2 agents can handle ambiguity but never get the chance

## Solution Strategy

Make the system more confident in building by:

1. Lowering readiness thresholds (80% → 70%)
2. Strengthening inference guidance with examples
3. Making Advisor approval more liberal
4. Lowering confidence requirements (70 → 60)
5. Emphasizing "good enough to build" over perfection

## Implementation

### 1. Update Architect System Prompt

**File**: [`src/lib/scaffolder/freeform-architect.ts`](src/lib/scaffolder/freeform-architect.ts)

#### Change 1.1: Lower Readiness Scoring Thresholds (lines 153-157)

**Current**:

```typescript
## READINESS SCORING
- 0-30: Initial idea, need basic understanding
- 30-60: Core entities identified, need details on relationships or views
- 60-80: Well-defined, minor clarifications might help
- 80-100: Ready to build - you have enough information
```

**Change to**:

```typescript
## READINESS SCORING
- 0-30: Initial idea, need basic understanding
- 30-60: Core entities identified, can likely infer the rest
- 60-100: Ready to build - you have enough to start (V2 agents handle details)

IMPORTANT: Score 70+ for any clear request where the core purpose is obvious, even if some details are missing. The specialized agents (Schema Designer, UI Designer, Workflow Agent) are designed to infer and fill gaps.
```

#### Change 1.2: Strengthen Inference Guidance (lines 172-181)

**Current**:

```typescript
## WHEN TO ASK vs INFER
ASK when:
- Core purpose is unclear
- User mentions something ambiguous that could go multiple ways
- A critical feature choice affects the whole design

INFER when:
- Standard field types (dates, names, descriptions)
- Common patterns (CRUD operations, basic views)
- UI choices that can be changed later
- Technical implementation details (your Advisor handles these)
```

**Change to**:

```typescript
## WHEN TO ASK vs INFER (INFER FIRST)

INFER when (the vast majority of cases):
- User describes a common app type (habit tracker, todo list, expense tracker, journal, budget, recipe book, workout log, etc.)
- Standard field types (dates, names, descriptions, amounts, categories, status, priority)
- Common patterns (CRUD operations, basic views, heat maps, charts, tables, forms)
- UI/UX choices that can be changed later
- Technical implementation details (Schema Designer and UI Designer handle these)
- Visualization types (heat maps, charts, calendars are standard patterns)

ASK when (RARE - only these cases):
- Core purpose is truly unclear (user says "make something" or "I don't know")
- User explicitly asks "what should I build?" or "give me ideas"
- Multiple completely different interpretations exist (e.g., "social network" could be Twitter-like OR LinkedIn-like)

## COMMON APP PATTERN EXAMPLES (always infer these):

1. **Habit Tracker**: Track habits daily/weekly, show completion streaks, visualize consistency
   - Entities: Habit (name, frequency, streak), HabitEntry (habitId, completedAt, notes)
   - Views: Habit list with checkboxes, heat map calendar, streak stats
   - If mentioned "like GitHub heat map" → Use calendar heat map showing completion frequency

2. **Todo List**: Manage tasks with status tracking
   - Entities: Task (title, description, completed, dueDate, priority)
   - Views: Task list, filters by status/priority, optional calendar view

3. **Expense Tracker**: Track spending by category
   - Entities: Expense (amount, description, date, category, paymentMethod)
   - Views: Expense list, category breakdown chart, date filters

4. **Journal/Diary**: Daily entries with tags
   - Entities: Entry (date, content, mood, tags)
   - Views: Entry list, calendar view, tag filters

5. **Workout Log**: Track exercises and progress
   - Entities: Workout (date, type, duration, notes), Exercise (name, sets, reps, weight)
   - Views: Workout calendar, progress charts, exercise history

When user mentions ANY of these patterns → Score 70-80 readiness and set canBuild: true
```

#### Change 1.3: Update Analysis Prompt Question (line 214)

**Current**:

```typescript
4. Do you need to ask anything, or can you infer it?
```

**Change to**:

```typescript
4. Can you infer everything needed to build an MVP? (Only ask if the core purpose is completely unclear)
```

#### Change 1.4: Update Build Trigger Condition (line 216)

**Current**:

```typescript
5. If readiness >= 80, generate the full spec.
```

**Change to**:

```typescript
5. If readiness >= 70, generate the full spec. Trust the V2 agents to fill details.
```

### 2. Update Advisor System Prompt

**File**: [`src/lib/scaffolder/advisor-agent.ts`](src/lib/scaffolder/advisor-agent.ts)

#### Change 2.1: Make Approval More Liberal (lines 80-93)

**Current**:

```typescript
## WHEN TO APPROVE (be liberal)
APPROVE if the response:
- Communicates clearly what will be built
- Has enough detail to start building (doesn't need perfection)
- Doesn't ask unnecessary questions

DO NOT iterate just because something "could be better" - iterate only if something is WRONG or MISSING.

## WHEN TO ITERATE (be conservative)
ITERATE only if:
- Response is confusing or contradictory
- Critical information is missing (not nice-to-have)
- You answered questions that MUST be incorporated
```

**Change to**:

```typescript
## WHEN TO APPROVE (be VERY liberal - default to approval)

APPROVE if the response:
- Communicates the core purpose clearly (even if details are light)
- Has enough to start building an MVP (perfection NOT required)
- Doesn't ask questions about obvious things
- Identifies at least the primary entity/entities

APPROVE EVEN IF:
- Some details could be better (minor improvements don't require iteration)
- Response isn't perfect (good enough is good enough)
- Minor gaps exist (V2 agents will infer during build)
- UI/visualization details are missing (UI Designer handles this)

DO NOT iterate just because:
- Something "could be better" or "could use more detail"
- You think of additional nice-to-have features
- Minor wording improvements would help
- You're being perfectionistic

## WHEN TO ITERATE (be VERY conservative - rare)

ITERATE ONLY if:
- Response is confusing, contradictory, or nonsensical (not just improvable)
- Core purpose is completely unclear (not just missing details)
- Response asks questions about things that are obviously common patterns
- Architect fundamentally misunderstood the request

CRITICAL: The V2 specialized agents (Schema Designer, UI Designer, Workflow Agent) are designed to handle ambiguity and fill gaps. Your job is NOT to ensure perfection, but to ensure the Architect understood the basic intent. Trust the pipeline.
```

#### Change 2.2: Lower Confidence Thresholds (lines 107-111)

**Current**:

```typescript
## CONFIDENCE SCORING (be generous)
- 60+: Approve if Advisor answered questions or made decisions
- 70+: Approve for solid responses
- 80+: Excellent, definitely approve
Don't give low scores for minor issues - save low scores for real problems.
```

**Change to**:

```typescript
## CONFIDENCE SCORING (be VERY generous)
- 50-60: Approve if the core purpose is clear, even if response is basic
- 60-70: Approve for decent responses that capture the main idea
- 70+: Solid response, definitely approve
- 80+: Excellent response

IMPORTANT: Give 60+ confidence for ANY response where the Architect understood the core purpose and identified primary entities. The specialized V2 agents will handle the rest. Only give <60 for truly confused or nonsensical responses.
```

### 3. Lower Orchestrator Confidence Threshold

**File**: [`src/lib/scaffolder/dual-agent-orchestrator.ts`](src/lib/scaffolder/dual-agent-orchestrator.ts)

#### Change 3.1: Lower MIN_CONFIDENCE_TO_APPROVE (line 33)

**Current**:

```typescript
const MIN_CONFIDENCE_TO_APPROVE = 70;
```

**Change to**:

```typescript
const MIN_CONFIDENCE_TO_APPROVE = 60; // Trust V2 agents to handle ambiguity
```

### 4. Adjust ReadinessScore to canBuild Logic

**File**: [`src/app/api/scaffolder/freeform/route.ts`](src/app/api/scaffolder/freeform/route.ts)

#### Change 4.1: Lower Readiness Threshold for UI (line 778)

**Current**:

```typescript
canBuild: state.phase === 'ready' || state.readinessScore >= 80,
```

**Change to**:

```typescript
canBuild: state.phase === 'ready' || state.readinessScore >= 70,
```

### 5. Update Phase Determination Logic

**File**: [`src/lib/scaffolder/freeform-architect.ts`](src/lib/scaffolder/freeform-architect.ts)

#### Change 5.1: Lower Phase Threshold (lines 359-363)

**Current**:

```typescript
const newPhase = analysis.canBuild
  ? 'ready'
  : analysis.readinessScore >= 60
    ? 'refining'
    : 'exploring';
```

**Change to**:

```typescript
const newPhase = analysis.canBuild
  ? 'ready'
  : analysis.readinessScore >= 50
    ? 'refining'
    : 'exploring';
```

## Expected Impact

### Before

```
Request: "A personal habit tracker with a Github-like heat map"
Result: Readiness 60%, canBuild: false
Outcome: Stuck, asks for details about data models and heat map implementation
```

### After  

```
Request: "A personal habit tracker with a Github-like heat map"
Result: Readiness 75%, canBuild: true
Outcome: Proceeds to build
  - Schema Designer infers: Habit entity (name, description, frequency, currentStreak) + HabitEntry entity (habitId, date, completed, notes)
  - UI Designer creates: Habit list + heat map calendar view
  - Workflow Agent adds: Streak calculation, auto-reset logic
```

## Testing Plan

After implementing changes:

1. Test with the stuck conversation:

            - Resume conversation ID `cmkvby27r0009v0xateoyg699`
            - Send message: "Yes, build it"
            - Should proceed to build phase

2. Test with new simple requests:

            - "Build a recipe manager"
            - "Track my workouts"
            - "Expense tracker with charts"
            - All should build at first interaction

3. Monitor readiness scores:

            - Common patterns should score 70-80
            - Only truly ambiguous requests should score <60

## Risk Mitigation

**Concern**: Building from insufficient information

**Mitigation**:

- V2 agents have proven fallback systems
- Users can refine after seeing the initial build
- The hybrid approach (Architect/Advisor → V2 agents) provides two layers of validation
- All generated apps are editable/refinable

**Concern**: Lower quality initial builds

**Response**:

- "Good enough to start" is better than "stuck asking questions"
- Refinement is easier than starting from scratch
- V2 agents are designed for this - they have sophisticated inference

## Files to Modify

1. [`src/lib/scaffolder/freeform-architect.ts`](src/lib/scaffolder/freeform-architect.ts) - Lines 153-157, 172-181, 214, 216, 359-363
2. [`src/lib/scaffolder/advisor-agent.ts`](src/lib/scaffolder/advisor-agent.ts) - Lines 80-111
3. [`src/lib/scaffolder/dual-agent-orchestrator.ts`](src/lib/scaffolder/dual-agent-orchestrator.ts) - Line 33
4. [`src/app/api/scaffolder/freeform/route.ts`](src/app/api/scaffolder/freeform/route.ts) - Line 778

Total: 4 files, ~50 lines of prompt text changes