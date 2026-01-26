---
name: Fix Code Display
overview: Display generated code after build completes by passing it directly to CodeEditor, avoiding streaming connection issues.
todos:
  - id: update-freeform
    content: Update FreeformCreator to extract code from build response and show simple loading
    status: in_progress
  - id: update-codeeditor
    content: Update CodeEditor to skip streaming when initialFiles provided
    status: pending
  - id: test
    content: Test code display after build completes
    status: pending
isProject: false
---

# Fix Code Display in Freeform Creator

## Problem

`CodeEditor` attempts to connect to an SSE endpoint that never receives code chunks because the freeform API generates code synchronously without emitting to the stream.

## Solution

Display code after build completes by passing it directly via props, avoiding streaming altogether.

## Changes Required

### 1. Update FreeformCreator Build Flow

**File: [`src/components/scaffolder/FreeformCreator.tsx`](src/components/scaffolder/FreeformCreator.tsx)**

**Current flow:**

- Calls `/api/scaffolder/freeform` with `action: 'build'`
- Shows `CodeEditor` with streaming during build
- `CodeEditor` connects to SSE endpoint (fails)

**New flow:**

- Show simple loading state during build
- After build completes, extract code from response
- Pass code to `CodeEditor` via `initialFiles` prop
- Remove streaming connection attempt

**Specific changes:**

1. Add state to store generated code files:
   ```typescript
   const [generatedFiles, setGeneratedFiles] = useState<CodeFile[]>([]);
   ```

2. Update `handleBuild` to extract code from response:
   ```typescript
   const data = await response.json();
   if (response.ok && data.app) {
     // Extract code from response
     const files: CodeFile[] = [];
     if (data.generatedCode?.components) {
       Object.entries(data.generatedCode.components).forEach(([path, code]) => {
         files.push({
           name: path.split('/').pop() || path,
           path,
           code: code as string,
           language: 'typescript',
         });
       });
     }
     setGeneratedFiles(files);
     // ... rest of success handling
   }
   ```

3. During building phase, show simple loading instead of `CodeEditor`:
   ```tsx
   {phase === 'building' && (
     <div className="animate-slide-up p-6 rounded-xl bg-surface-elevated border border-outline-light">
       <div className="flex items-center gap-4">
         <Loader2 className="w-6 h-6 animate-spin text-accent-yellow" />
         <div>
           <div className="font-medium text-text-primary">Generating your app...</div>
           <div className="text-sm text-text-secondary">Writing components and resolving dependencies</div>
         </div>
       </div>
     </div>
   )}
   ```

4. In preview phase, pass `generatedFiles` to `CodeEditor`:
   ```tsx
   <CodeEditor
     conversationId={conversationIdRef.current}
     initialFiles={generatedFiles}  // Pass generated code directly
     useV2={false}
     height="h-[500px]"
     editable={true}
   />
   ```


### 2. Update CodeEditor to Support Non-Streaming Mode

**File: [`src/components/scaffolder/CodeEditor.tsx`](src/components/scaffolder/CodeEditor.tsx)**

**Current behavior:**

- Always attempts SSE connection on mount
- If `initialFiles` provided, still tries to connect

**New behavior:**

- Skip SSE connection if `initialFiles` is provided
- Immediately display the provided files

**Specific changes:**

Update the connection effect (around line 580):

```typescript
useEffect(() => {
  if (initialFiles.length > 0) {
    // Non-streaming mode: use provided files
    setStatus('complete');
    setProgress(100);
    const codeMap: Record<string, string> = {};
    initialFiles.forEach(f => {
      codeMap[f.path] = f.code;
    });
    bufferRef.current = codeMap;
    setDisplayedCode(codeMap);
    setFiles(initialFiles);
    if (initialFiles.length > 0) {
      setSelectedFilePath(initialFiles[0].path);
    }
  } else {
    // Streaming mode: connect to SSE
    connectToStream();
  }
  return cleanupEventSource;
}, [conversationId, initialFiles.length]);
```

### 3. Remove Unused Split-Pane During Build

Since we're showing a simple loading state during build, remove the complex split-pane view toggle buttons from the building phase in `FreeformCreator.tsx`. This simplifies the UI and removes the non-functional code streaming view.

## Files Modified

- [`src/components/scaffolder/FreeformCreator.tsx`](src/components/scaffolder/FreeformCreator.tsx) - Extract code from API response, pass to CodeEditor
- [`src/components/scaffolder/CodeEditor.tsx`](src/components/scaffolder/CodeEditor.tsx) - Skip streaming when initialFiles provided

## Result

- Code displays instantly after build completes
- No SSE connection attempts or timeouts
- No impact on responsiveness
- Code remains editable in preview phase
- Simpler, more reliable implementation