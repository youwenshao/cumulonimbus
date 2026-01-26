# V2 Pipeline Manual Testing Guide

## Quick Start

Since the root cause has been identified and fixed, you can now test the fixes with these simple steps:

---

## Test 1: Simple CRUD (Baseline) ✅

**Purpose**: Verify basic PascalCase naming works

### Steps:
1. Navigate to http://localhost:1000/create
2. Enter: "Build a simple note-taking app with title and content"
3. Wait for the agent pipeline to complete
4. Click "Build My App"

### Expected Results:
- ✅ Schema name: `Note`
- ✅ Components: `NoteForm`, `NoteTable`
- ✅ No React warnings in console
- ✅ Intent Engine detects "tracker" or "content" category

### Check Console For:
```
[Consolidator] createFallbackSchema: rawName="note" -> pascalName="Note"
[Schema Name Check] schema.name="Note" (should be PascalCase)
```

---

## Test 2: Enum-Heavy App

**Purpose**: Verify enum handling and naming

### Steps:
1. Navigate to http://localhost:1000/create
2. Enter: "Build a task manager with status (Todo, In Progress, Done) and priority (High, Medium, Low)"
3. Wait for completion
4. Click "Build My App"

### Expected Results:
- ✅ Schema name: `Task`
- ✅ Components: `TaskForm`, `TaskTable`
- ✅ Enum fields detected: `status`, `priority`
- ✅ No React warnings

### Verify:
- Status dropdown has: Todo, In Progress, Done
- Priority dropdown has: High, Medium, Low
- Field types are correct in generated code

---

## Test 3: Reference App Detection

**Purpose**: Test intent engine's reference app detection

### Steps:
1. Navigate to http://localhost:1000/create
2. Enter: "Build something like Trello for project management"
3. Watch the Agent Timeline component
4. Click "Build My App"

### Expected Results:
- ✅ Intent Engine detects "Trello" reference
- ✅ Schema name: `Project` or `Task` or `Card`
- ✅ Layout hint includes "kanban"
- ✅ All components use PascalCase

### Check Agent Timeline:
- Intent Engine shows: "Reference Apps: Trello"
- UI Designer may suggest kanban layout

---

## Test 4: Multi-View App

**Purpose**: Test multiple component generation

### Steps:
1. Navigate to http://localhost:1000/create
2. Enter: "Build an expense tracker with a table view and a chart showing spending by category"
3. Wait for completion
4. Click "Build My App"

### Expected Results:
- ✅ Schema name: `Expense` or `ExpenseTracker`
- ✅ Multiple components generated
- ✅ All components use PascalCase: `ExpenseForm`, `ExpenseTable`, `ExpenseChart`
- ✅ Category field detected

### Verify Generated Components:
Check the code editor for:
- `lib/types.ts` - type `Expense`
- `components/ExpenseForm.tsx`
- `components/ExpenseTable.tsx`
- Possibly: `components/ExpenseChart.tsx`

---

## Test 5: Multi-Word Entities (Edge Case)

**Purpose**: Verify hyphen/space handling

### Steps:
1. Enter: "Build a project-management tool"
2. Build the app

### Expected Results:
- ✅ Schema name: `ProjectManagement` (not `Projectmanagement`)
- ✅ Components: `ProjectManagementForm`

---

## Test 6: Special Characters (Edge Case)

**Purpose**: Verify sanitization works correctly

### Steps:
1. Enter: "Build an API endpoint tracker"
2. Build the app

### Expected Results:
- ✅ Schema name: `ApiEndpoint`
- ✅ Removes/handles special characters correctly
- ✅ No invalid identifier errors

---

## Quick Verification Checklist

For each test, verify these items:

### Console Checks:
- [ ] No React casing warnings
- [ ] Debug logs show PascalCase names
- [ ] Agent timeline shows all agents complete

### Code Generation Checks:
- [ ] Open Code Editor view
- [ ] Check `lib/types.ts` - types are PascalCase
- [ ] Check component files - exports are PascalCase
- [ ] Field names are camelCase (e.g., `dueDate`, not `due_date`)

### Runtime Checks:
- [ ] App loads without errors
- [ ] Form submission works
- [ ] Table displays data
- [ ] No console warnings

---

## Debug Mode

If you want to see detailed logging:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Filter for: `[Consolidator]` or `[Schema`
4. You should see:
   ```
   [Consolidator] createFallbackSchema: rawName="habit" -> pascalName="Habit"
   [Schema Name Check] schema.name="Habit" (should be PascalCase)
   [Schema Designer returned name="Habit"
   ```

---

## Known Issues & Workarounds

### Issue: Schema Designer Still Returns Lowercase

**Symptom**: Logs show lowercase from Schema Designer

**Cause**: LLM response needs better prompting

**Workaround**: The consolidator fixes this automatically with `toPascalCase()`

### Issue: Multiple Components with Same Base Name

**Symptom**: `ExpenseForm` and `ExpenseTable` both in same file

**Cause**: Multiple views detected

**Status**: Expected behavior - each view gets its own component

---

## Automated Testing

To run the full automated test suite:

```bash
# Make sure dev server is running
npm run dev

# In another terminal
tsx scripts/test-v2-pipeline.ts
```

This will:
- Run all 4 test scenarios
- Validate component naming
- Check for React warnings
- Generate a detailed report

---

## Troubleshooting

### Components Still Lowercase?

1. Check environment variable: `FREEFORM_V2_PIPELINE=true`
2. Restart dev server
3. Clear browser cache
4. Try in incognito mode

### Agent Pipeline Not Showing?

1. Verify feature flag is enabled
2. Check that you're creating a NEW conversation
3. Agent pipeline only runs on first message

### No Debug Logs?

1. Check console for filters blocking output
2. Logs are on server-side - check terminal running `npm run dev`
3. Look for lines starting with `[Consolidator]` or `[V2]`

---

## Success Criteria

All tests pass if:

- ✅ No React casing warnings in console
- ✅ All component names use PascalCase
- ✅ All type names use PascalCase
- ✅ All field names use camelCase
- ✅ Generated apps run without errors
- ✅ Agent Timeline shows all agents completing
- ✅ Debug logs show correct naming

---

## Reporting Issues

If you find a naming issue:

1. Note the input prompt
2. Check console for debug logs
3. Copy the schema name from logs
4. Check generated component code
5. Report with all details in GitHub issue

Include:
- User input
- Expected component name
- Actual component name
- Console logs
- Screenshot of Agent Timeline
