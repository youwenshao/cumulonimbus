---
name: Fix Build 404 and Dashboard Integration
overview: Fix the 404 error when building apps (stale state issue) and add conversations/chat history to the dashboard so users can resume and re-edit apps through the AI agent pipeline.
todos:
  - id: fix-404
    content: Fix handleBuild to use conversationIdRef instead of freeformState.conversationId
    status: completed
  - id: conversations-api
    content: Create /api/conversations endpoint for listing and fetching conversations
    status: completed
  - id: dashboard-conversations
    content: Add conversations tab/section to dashboard
    status: completed
  - id: resume-conversation
    content: Enable FreeformCreator to load and resume existing conversations
    status: completed
  - id: edit-via-agent
    content: Enable editing existing apps through Freeform agent by linking to conversations
    status: completed
---

# Fix Build 404 and Dashboard Integration

## Issue 1: Build 404 Error

The 404 error occurs because `handleBuild` in [FreeformCreator.tsx](src/components/scaffolder/FreeformCreator.tsx) uses `freeformState.conversationId` (React state) instead of `conversationIdRef.current` (ref).

When the user clicks "Build My App", the state may not have been updated yet due to React's asynchronous state updates, causing a stale/null conversation ID to be sent.

**Fix**: Update `handleBuild` to use `conversationIdRef.current` instead of `freeformState.conversationId`:

```typescript
// Line 262 - Change from:
if (!freeformState.conversationId || isBuilding) return;

// To:
if (!conversationIdRef.current || isBuilding) return;

// Line 280 - Change from:
conversationId: freeformState.conversationId,

// To:
conversationId: conversationIdRef.current,
```

## Issue 2: Conversations Not Accessible from Dashboard

Currently, the dashboard only shows apps. Users need to access their chat conversations to:

- Resume incomplete conversations
- Re-edit existing apps through the AI agent pipeline
- View chat history

### Solution Architecture

```mermaid
graph TD
    subgraph dashboard [Dashboard Page]
        Apps[Apps Tab]
        Convs[Conversations Tab]
    end
    
    subgraph api [API Layer]
        ConvAPI[/api/conversations]
        AppAPI[/api/apps]
    end
    
    subgraph create [Create Page]
        Freeform[FreeformCreator]
    end
    
    Apps -->|Edit via Agent| Freeform
    Convs -->|Resume| Freeform
    ConvAPI -->|List/Get| Convs
    Freeform -->|Load conversation| ConvAPI
```

### Implementation Steps

**Step 1**: Create Conversations API endpoint

New file: [src/app/api/conversations/route.ts](src/app/api/conversations/route.ts)

- `GET` - List user's conversations with pagination
- Include related app info if appId exists

**Step 2**: Update Dashboard to show Conversations

Modify [src/app/(main)/dashboard/DashboardContent.tsx](src/app/\\(main)/dashboard/DashboardContent.tsx):

- Add tabs for "Apps" and "Conversations"
- Create `ConversationCard` component showing:
  - Preview of last message
  - Phase/readiness status
  - Link to resume conversation
  - Associated app (if any)

**Step 3**: Enable Resuming Conversations

Modify [src/components/scaffolder/FreeformCreator.tsx](src/components/scaffolder/FreeformCreator.tsx):

- Accept `conversationId` prop to load existing conversation
- Fetch and hydrate state from `/api/conversations/[id]`
- Allow continuing from where user left off

**Step 4**: Enable Re-editing Apps via Agent

Modify create page routing:

- Add route: `/create?conversationId=xxx` to resume conversation
- Add route: `/create?appId=xxx&mode=freeform` to edit app through agent
- When editing existing app, create/load conversation linked to that app

**Step 5**: Create Single Conversation API

New file: [src/app/api/conversations/[conversationId]/route.ts](src/app/api/conversations/[conversationId]/route.ts)

- `GET` - Fetch single conversation with messages
- `DELETE` - Delete conversation

## Files to Create/Modify

**New Files**:

- `src/app/api/conversations/route.ts` - List conversations
- `src/app/api/conversations/[conversationId]/route.ts` - Get/delete conversation

**Modified Files**:

- `src/components/scaffolder/FreeformCreator.tsx` - Fix 404, add conversation loading
- `src/app/(main)/dashboard/DashboardContent.tsx` - Add conversations tab
- `src/app/(main)/dashboard/page.tsx` - Fetch conversations
- `src/app/(main)/create/page.tsx` - Handle conversationId param

## Success Criteria

- "Build My App" button works without 404 errors
- Users can see their conversation history in dashboard
- Users can resume incomplete conversations
- Users can edit existing apps through the Freeform agent pipeline
- Apps and conversations are properly linked