---
name: V2 Pipeline Testing
overview: Test the newly implemented V2 Agent Pipeline with various app types to verify correct behavior, identify component naming issues, and validate agent outputs.
todos:
  - id: add-logging
    content: Add detailed debug logging to track component naming through the pipeline
    status: completed
  - id: create-test-script
    content: Create automated test script for V2 pipeline scenarios
    status: completed
  - id: run-baseline
    content: Run simple CRUD test and capture all agent outputs
    status: completed
  - id: run-enum
    content: Run enum-heavy task manager test
    status: completed
  - id: run-reference
    content: Run reference app detection test (Trello-like)
    status: completed
  - id: run-multiview
    content: Run multi-view expense tracker test
    status: completed
  - id: analyze-patterns
    content: Analyze test results and identify component naming patterns
    status: completed
  - id: identify-root-cause
    content: Pinpoint exact location where lowercase naming originates
    status: completed
  - id: document-findings
    content: Document all findings and propose fixes
    status: completed
isProject: false
---

# V2 Pipeline Testing Plan

## Testing Strategy

We'll test the V2 pipeline with different complexity levels and scenarios to identify patterns in the component casing issue and validate overall pipeline behavior.

## Test Scenarios

### 1. Simple CRUD App (Baseline)

**Input**: "Build a simple note-taking app with title and content"

**Expected**:

- Intent Engine: Should detect `tracker` or `content` category
- Schema Designer: 2-3 fields (title, content, timestamps)
- UI Designer: Form + Table layout
- Naming: Component should be `Note` or `NoteForm` (PascalCase)

**What to check**:

- Component naming convention in generated code
- Schema field mapping accuracy
- Layout structure

### 2. Enum-Heavy App

**Input**: "Build a task manager with status (Todo, In Progress, Done) and priority (High, Medium, Low)"

**Expected**:

- Schema Designer: Enum fields with proper options
- UI Designer: Dropdown/select components
- Naming: `Task`, `TaskForm`, `TaskTable`

**What to check**:

- Enum field handling
- Component naming with descriptive entity names
- Status field recognition

### 3. Reference App Detection

**Input**: "Build something like Trello for project management"

**Expected**:

- Intent Engine: Should detect Trello reference, kanban layout hint
- UI Designer: Kanban board component
- Workflows: Drag-and-drop state changes

**What to check**:

- Reference app detection accuracy
- Layout structure matches reference app patterns
- Component naming with specific entity types

### 4. Multi-View App

**Input**: "Build an expense tracker with a table view and a chart showing spending by category"

**Expected**:

- UI Designer: Multiple view components (table + chart)
- Schema Designer: Category field, amount field
- Component naming: `Expense`, `ExpenseTable`, `ExpenseChart`

**What to check**:

- Multiple component generation
- Each component has correct PascalCase naming
- No duplicate naming conflicts

## Testing Execution

### Step 1: Enable Detailed Logging

Modify [`src/app/api/scaffolder/freeform/route.ts`](src/app/api/scaffolder/freeform/route.ts):

- Add debug logging for component naming at each stage
- Log Schema Designer output (entity names)
- Log UI Designer output (component types)
- Log Code Generator input/output

### Step 2: Create Test Script

Create [`scripts/test-v2-pipeline.ts`](scripts/test-v2-pipeline.ts):

```typescript
// Automated test runner that:
// 1. Calls the freeform API with each test scenario
// 2. Captures all agent outputs
// 3. Validates component naming conventions
// 4. Checks for React warnings in generated code
// 5. Generates a test report
```

### Step 3: Component Name Tracking

The issue likely originates in one of these places:

**Hypothesis 1: Schema Designer**

- Check [`src/lib/scaffolder-v2/agents/schema-designer.ts`](src/lib/scaffolder-v2/agents/schema-designer.ts)
- Entity names might be lowercase (e.g., "habit" instead of "Habit")
- Solution: Ensure schema names are PascalCase

**Hypothesis 2: Agent Consolidator**

- Check [`src/lib/scaffolder/agent-consolidator.ts`](src/lib/scaffolder/agent-consolidator.ts)
- `createFallbackSchema()` might be setting lowercase names
- `inferFieldFromName()` field inference

**Hypothesis 3: Code Generator**

- Check [`src/lib/scaffolder-v2/agents/code-generator.ts`](src/lib/scaffolder-v2/agents/code-generator.ts)
- Component name generation from schema
- Might not be capitalizing entity names

**Hypothesis 4: Conversion Layer**

- Check `convertToV2Schema()` in route.ts
- Might be preserving lowercase from V1 format

### Step 4: Run Tests

Execute tests in order:

1. Run each scenario
2. Capture logs for each agent
3. Check generated component files
4. Verify React warnings (or lack thereof)

### Step 5: Pattern Analysis

After running tests, analyze:

- Is the issue consistent across all scenarios?
- Does it only happen with certain entity names?
- Is it in fallback paths or main pipeline?
- Does Intent Engine influence naming?

## Expected Issues to Identify

Based on the terminal output showing `<habitForm />`:

1. **Component Case Issue**: Lowercase first letter
2. **Possible Root Cause**: Entity name from Schema Designer or fallback is lowercase
3. **Fix Location**: Likely need to add PascalCase conversion in consolidator or code generator

## Validation Criteria

Tests pass if:

- ✓ All generated components use PascalCase (e.g., `HabitForm`, not `habitForm`)
- ✓ Schema field names remain camelCase (e.g., `dueDate`)
- ✓ Type names use PascalCase (e.g., `Habit`, `HabitInput`)
- ✓ No React casing warnings in console
- ✓ All V2 agents complete successfully
- ✓ Consolidated results are properly validated

## Deliverables

1. Test execution results for all 4 scenarios
2. Pattern analysis document identifying root cause
3. List of required fixes with file locations
4. Updated test suite for regression prevention