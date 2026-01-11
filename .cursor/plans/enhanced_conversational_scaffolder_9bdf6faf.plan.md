---
name: Enhanced Conversational Scaffolder
overview: Transform the Conversational Scaffolder into a bulletproof, intelligent system with real-time streaming, visual previews, and comprehensive error handling. Priority on reliability and user experience.
todos:
  - id: sse-reliability
    content: Fix SSE streaming with message buffering and connection health monitoring
    status: completed
  - id: error-handling
    content: Implement comprehensive error handling with custom error types and recovery actions
    status: completed
  - id: validation-system
    content: Build multi-layer validation (field, spec, runtime) with detailed feedback
    status: completed
  - id: visual-preview
    content: Create React-based preview component with styled mockups and device frames
    status: completed
  - id: ai-streaming
    content: Implement AI response streaming with typewriter effect in UI
    status: completed
  - id: template-gallery
    content: Build template selection UI with quick customization options
    status: completed
  - id: question-engine
    content: Implement adaptive question engine with context-aware follow-ups
    status: completed
  - id: pattern-library
    content: Create rich pattern library with complete template definitions
    status: completed
  - id: smart-questions
    content: Add question prioritization and skip logic based on answers
    status: completed
  - id: testing-suite
    content: Build comprehensive test suite for reliability and edge cases
    status: completed
---

# Enhanced Conversational Scaffolder Implementation

## Overview

Transform the scaffolder into a production-grade system with:

- Bulletproof SSE status streaming
- Real-time AI response streaming  
- Visual preview generation with styled mockups
- Intelligent, context-aware questioning
- Rich pattern library with pre-built templates
- Comprehensive validation and error handling

Priority: **Reliability first** - robust error handling at every layer.

---

## 1. Fix SSE Status Streaming (Critical - Reliability)

### Problem

Terminal shows "⚠️ emitStatus: No controller found" - timing issue where `emitStatus()` is called before SSE connection establishes.

### Solution: Two-Phase Connection Pattern

**Files to modify:**

- [`src/app/api/scaffolder/status/[conversationId]/route.ts`](src/app/api/scaffolder/status/[conversationId]/route.ts)
- [`src/app/api/scaffolder/route.ts`](src/app/api/scaffolder/route.ts)
- [`src/app/(main)/create/page.tsx`](src/app/\\\(main)/create/page.tsx)

**Changes:**

1. **Add connection acknowledgment system** - SSE endpoint sends "ready" event after controller registration
2. **Buffered message queue** - Queue status messages until SSE connects, then flush
3. **Fallback UI updates** - If SSE fails, fall back to polling or inline status display
4. **Connection health monitoring** - Detect dead connections, auto-reconnect with exponential backoff
```typescript
// New: Message buffer for reliability
const pendingMessages = new Map<string, StatusMessage[]>();

export function emitStatus(conversationId: string, ...) {
  const controller = globalStatusEmitters.get(conversationId);
  
  if (!controller) {
    // Buffer message instead of dropping
    if (!pendingMessages.has(conversationId)) {
      pendingMessages.set(conversationId, []);
    }
    pendingMessages.get(conversationId)!.push(statusMessage);
    
    // Set timeout to flush buffer when connection arrives
    setTimeout(() => flushBufferedMessages(conversationId), 100);
    return;
  }
  
  // Flush any buffered messages first
  flushBufferedMessages(conversationId);
  
  // Send current message
  controller.enqueue(encoder.encode(data));
}
```


---

## 2. Visual Preview Generation (UX Enhancement)

### Current State

`generatePreviewHTML()` returns unstyled HTML string with no visual representation.

### Solution: React-Based Preview Component

**Files to create:**

- `src/components/scaffolder/AppPreview.tsx` - Visual preview component
- `src/components/scaffolder/PreviewMockup.tsx` - Device frame mockup
- `src/lib/scaffolder/preview-generator.ts` - Enhanced preview generation

**Files to modify:**

- [`src/app/api/scaffolder/route.ts`](src/app/api/scaffolder/route.ts) - Return preview data instead of HTML
- [`src/app/(main)/create/page.tsx`](src/app/\\\(main)/create/page.tsx) - Render preview component

**Features:**

1. **Styled preview cards** matching the Cumulonimbus dark theme
2. **Device frame mockup** (phone/tablet/desktop views)
3. **Interactive preview** - show form fields, sample data in tables/charts
4. **Animations** - slide-in transitions for preview reveal
5. **Edit suggestions** - Visual indicators for customization options
```typescript
interface PreviewData {
  spec: ProjectSpec;
  mockData: DataRecord[]; // Generate 3-5 sample records
  viewMode: 'mobile' | 'tablet' | 'desktop';
  timestamp: string;
}

export function generatePreviewData(spec: ProjectSpec): PreviewData {
  // Generate realistic mock data based on field types
  const mockData = generateMockDataForSpec(spec);
  
  return {
    spec,
    mockData,
    viewMode: 'desktop',
    timestamp: new Date().toISOString(),
  };
}
```


**Preview Component Structure:**

```
AppPreview
├── PreviewHeader (app name, description)
├── PreviewDeviceFrame
│   ├── PreviewForm (shows form fields)
│   ├── PreviewTable (shows mock data)
│   └── PreviewChart (renders chart with mock data)
└── PreviewActions (Edit/Confirm buttons)
```

---

## 3. AI Response Streaming (UX + Performance)

### Current State

AI calls wait for complete response before displaying - no user feedback during generation.

### Solution: Stream AI Responses Word-by-Word

**Files to modify:**

- [`src/app/api/scaffolder/route.ts`](src/app/api/scaffolder/route.ts) - Add streaming endpoints
- [`src/app/(main)/create/page.tsx`](src/app/\\\(main)/create/page.tsx) - Consume streaming responses
- [`src/components/ui/ChatMessage.tsx`](src/components/ui/ChatMessage.tsx) - Add typewriter effect

**New API endpoints:**

```typescript
// POST /api/scaffolder/stream - Streaming response for initial prompt
export async function POST(request: NextRequest) {
  // ... existing validation ...
  
  if (action === 'stream-start') {
    return streamStart(userId, message, tempConversationId);
  }
}

async function streamStart(userId: string, message: string, tempId: string) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Emit status updates via SSE (separate channel)
        emitStatus(tempId, 'parse', 'Analyzing your request...', { progress: 10 });
        
        // Stream AI response chunks
        for await (const chunk of streamComplete({
          messages: [
            { role: 'system', content: PARSE_SYSTEM_PROMPT },
            { role: 'user', content: message }
          ]
        })) {
          const data = { type: 'chunk', content: chunk };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        controller.close();
      } catch (error) {
        // Error handling with fallback
        emitStatus(tempId, 'parse', 'Using fallback parsing...', { 
          severity: 'warning',
          progress: 30 
        });
        // Continue with non-streaming fallback
      }
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    }
  });
}
```

**Frontend Integration:**

```typescript
// In create/page.tsx
const [streamingMessage, setStreamingMessage] = useState('');

const connectToAIStream = (message: string) => {
  const eventSource = new EventSource(`/api/scaffolder/stream?message=${encodeURIComponent(message)}`);
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'chunk') {
      setStreamingMessage(prev => prev + data.content);
    } else if (data.type === 'done') {
      // Finalize message
      eventSource.close();
    }
  };
  
  eventSource.onerror = () => {
    // Fallback to non-streaming
    eventSource.close();
    handleSubmitNonStreaming(message);
  };
};
```

---

## 4. Smarter Question Generation (Intelligence)

### Current State

Questions are AI-generated or fall back to generic defaults. No context awareness between questions.

### Solution: Adaptive Question Flow

**Files to create:**

- `src/lib/scaffolder/question-engine.ts` - Smart question generation
- `src/lib/scaffolder/question-validators.ts` - Answer validation
- `src/lib/scaffolder/question-templates.ts` - Pre-built question sets

**Files to modify:**

- [`src/lib/scaffolder/probe.ts`](src/lib/scaffolder/probe.ts) - Use question engine
- [`src/lib/scaffolder/blueprint.ts`](src/lib/scaffolder/blueprint.ts) - Update answer recording

**Features:**

1. **Context-aware follow-ups** - Next question based on previous answers
2. **Skip irrelevant questions** - If user selects "no charts", skip chart customization
3. **Answer validation** - Check for conflicts before allowing progression
4. **Smart suggestions** - Pre-fill probable answers based on category
5. **Question prioritization** - Ask most important questions first
```typescript
interface QuestionNode {
  id: string;
  question: string;
  type: 'single' | 'multiple' | 'text';
  category: 'data' | 'logic' | 'ui' | 'integration';
  options?: QuestionOption[];
  priority: number; // 1-5, higher = more important
  dependencies?: QuestionDependency[];
  skipConditions?: SkipCondition[];
  validator?: (answer: string | string[]) => ValidationResult;
}

interface QuestionDependency {
  questionId: string;
  requiredAnswer?: string | string[];
  condition: 'equals' | 'contains' | 'not_equals';
}

interface SkipCondition {
  questionId: string;
  answer: string | string[];
  condition: 'if_equals' | 'if_contains';
}

export class QuestionEngine {
  generateAdaptiveQuestions(
    intent: ParsedIntent,
    previousAnswers: Record<string, string | string[]>
  ): QuestionNode[] {
    // 1. Start with template questions for category
    let questions = this.loadTemplateQuestions(intent.category);
    
    // 2. Filter based on previous answers
    questions = questions.filter(q => 
      !this.shouldSkipQuestion(q, previousAnswers)
    );
    
    // 3. Add follow-up questions based on answers
    const followUps = this.generateFollowUpQuestions(previousAnswers, intent);
    questions.push(...followUps);
    
    // 4. Sort by priority
    questions.sort((a, b) => b.priority - a.priority);
    
    // 5. Limit to 4-5 questions max
    return questions.slice(0, 5);
  }
  
  private generateFollowUpQuestions(
    answers: Record<string, string | string[]>,
    intent: ParsedIntent
  ): QuestionNode[] {
    const followUps: QuestionNode[] = [];
    
    // Example: If user selected 'chart' view, ask about chart type
    if (this.answersInclude(answers, 'q_visualization', 'chart')) {
      followUps.push({
        id: 'q_chart_type',
        question: 'What type of chart would you like?',
        type: 'single',
        category: 'ui',
        priority: 4,
        options: [
          { id: 'bar', label: 'Bar Chart', description: 'Compare values across categories' },
          { id: 'line', label: 'Line Chart', description: 'Show trends over time' },
          { id: 'pie', label: 'Pie Chart', description: 'Show proportions of a whole' },
        ],
        dependencies: [{ questionId: 'q_visualization', requiredAnswer: 'chart', condition: 'contains' }]
      });
    }
    
    return followUps;
  }
}
```


**Answer Validation:**

```typescript
export class QuestionValidator {
  validateAnswer(
    question: QuestionNode,
    answer: string | string[],
    spec: Partial<ProjectSpec>
  ): ValidationResult {
    // Check for logical conflicts
    if (question.id === 'q_fields') {
      const fields = answer as string[];
      
      // Ensure at least 2 fields
      if (fields.length < 2) {
        return {
          valid: false,
          error: 'Please select at least 2 fields to track',
          suggestion: 'Most apps need a name/title field and at least one data field'
        };
      }
      
      // Warn if no date field for time-series categories
      if (['habit', 'expense', 'time'].includes(spec.category || '') && !fields.includes('date')) {
        return {
          valid: true,
          warning: 'Consider adding a date field to track progress over time'
        };
      }
    }
    
    return { valid: true };
  }
}
```

---

## 5. Pattern Library Implementation (Smart Defaults)

### Current State

`CATEGORY_TEMPLATES` exists but only provides field lists. Not leveraged for quick-start.

### Solution: Rich Template System

**Files to create:**

- `src/lib/scaffolder/pattern-library.ts` - Complete template definitions
- `src/components/scaffolder/TemplateGallery.tsx` - Template selection UI
- `src/lib/scaffolder/template-customizer.ts` - Template → Spec converter

**Files to modify:**

- [`src/app/(main)/create/page.tsx`](src/app/\\\(main)/create/page.tsx) - Add template selection mode
- [`src/lib/scaffolder/parser.ts`](src/lib/scaffolder/parser.ts) - Use templates for fallback

**Template Structure:**

```typescript
interface AppTemplate {
  id: string;
  name: string;
  description: string;
  category: TrackerCategory;
  icon: string;
  preview: {
    screenshot?: string;
    demoData: DataRecord[];
  };
  spec: ProjectSpec; // Complete, ready-to-use spec
  customizationPoints: CustomizationPoint[]; // What user can tweak
  useCases: string[]; // Example use cases
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface CustomizationPoint {
  id: string;
  label: string;
  description: string;
  type: 'field-selection' | 'view-type' | 'validation-rules' | 'feature-toggle';
  options: CustomizationOption[];
  defaultValue: string | string[];
}

export const PATTERN_LIBRARY: AppTemplate[] = [
  {
    id: 'expense-tracker-basic',
    name: 'Simple Expense Tracker',
    description: 'Track daily expenses with categories and amounts. Perfect for personal budgeting.',
    category: 'expense',
    icon: '💰',
    preview: {
      demoData: [
        { id: '1', amount: 45.99, category: 'Food', description: 'Grocery shopping', date: '2026-01-10', createdAt: '...' },
        { id: '2', amount: 12.50, category: 'Transport', description: 'Gas', date: '2026-01-10', createdAt: '...' },
        { id: '3', amount: 89.00, category: 'Shopping', description: 'New shoes', date: '2026-01-09', createdAt: '...' },
      ]
    },
    spec: {
      name: 'My Expense Tracker',
      description: 'Track and categorize your daily expenses',
      category: 'expense',
      dataStore: {
        name: 'expenses',
        label: 'Expenses',
        fields: [
          { name: 'amount', label: 'Amount', type: 'number', required: true, placeholder: '0.00' },
          { name: 'category', label: 'Category', type: 'select', required: true, options: ['Food', 'Transport', 'Shopping', 'Bills', 'Other'] },
          { name: 'description', label: 'Description', type: 'textarea', required: false },
          { name: 'date', label: 'Date', type: 'date', required: true },
        ]
      },
      views: [
        { type: 'table', title: 'All Expenses', config: { /* ... */ } },
        { type: 'chart', title: 'Spending by Category', config: { chartType: 'pie', /* ... */ } },
      ],
      features: { allowEdit: true, allowDelete: true, allowExport: false }
    },
    customizationPoints: [
      {
        id: 'custom-categories',
        label: 'Expense Categories',
        description: 'Customize the expense categories',
        type: 'field-selection',
        options: [/* ... */],
        defaultValue: ['Food', 'Transport', 'Shopping', 'Bills', 'Other']
      }
    ],
    useCases: ['Personal budgeting', 'Small business expenses', 'Travel expense tracking'],
    difficulty: 'beginner'
  },
  // ... more templates
];
```

**Template Selection UI Flow:**

```
1. User lands on /create
2. Show two options:
                                                                                 - "Describe from scratch" (current flow)
                                                                                 - "Start with a template" (new)
3. If template selected:
                                                                                 - Show TemplateGallery component
                                                                                 - User picks template
                                                                                 - Show quick customization options (3-4 key settings)
                                                                                 - Generate app immediately (skip conversation)
```

---

## 6. Enhanced Validation & Error Handling (Reliability)

### Current State

Basic validation in `validateSpec()`. Limited error feedback to users.

### Solution: Multi-Layer Validation

**Files to create:**

- `src/lib/scaffolder/validators/spec-validator.ts` - Comprehensive spec validation
- `src/lib/scaffolder/validators/field-validator.ts` - Field-level validation
- `src/lib/scaffolder/validators/view-validator.ts` - View configuration validation
- `src/lib/error-handling/scaffolder-errors.ts` - Custom error types

**Files to modify:**

- [`src/lib/scaffolder/compiler.ts`](src/lib/scaffolder/compiler.ts) - Use enhanced validators
- [`src/app/api/scaffolder/route.ts`](src/app/api/scaffolder/route.ts) - Better error responses

**Validation Layers:**

```typescript
// Layer 1: Field-level validation
export class FieldValidator {
  validateField(field: FieldDefinition): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Required properties
    if (!field.name || field.name.trim().length === 0) {
      errors.push('Field name is required');
    }
    
    // Name format
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field.name)) {
      errors.push(`Invalid field name "${field.name}". Use only letters, numbers, and underscores.`);
    }
    
    // Type-specific validation
    if (field.type === 'select' && (!field.options || field.options.length < 2)) {
      errors.push(`Select field "${field.label}" must have at least 2 options`);
    }
    
    // Validation rules
    if (field.type === 'number' && field.validation) {
      if (field.validation.min !== undefined && field.validation.max !== undefined) {
        if (field.validation.min > field.validation.max) {
          errors.push(`Field "${field.label}": min value cannot be greater than max value`);
        }
      }
    }
    
    // Warnings (non-blocking)
    if (field.required && !field.defaultValue) {
      warnings.push(`Required field "${field.label}" has no default value`);
    }
    
    return { valid: errors.length === 0, errors, warnings };
  }
}

// Layer 2: Spec-level validation
export class SpecValidator {
  validateSpec(spec: ProjectSpec): DetailedValidationResult {
    const results: ValidationResult[] = [];
    
    // Validate each field
    const fieldValidator = new FieldValidator();
    for (const field of spec.dataStore.fields) {
      results.push(fieldValidator.validateField(field));
    }
    
    // Validate field relationships
    results.push(this.validateFieldRelationships(spec.dataStore.fields));
    
    // Validate views
    const viewValidator = new ViewValidator();
    for (const view of spec.views) {
      results.push(viewValidator.validateView(view, spec.dataStore.fields));
    }
    
    // Cross-validation: Ensure views reference valid fields
    results.push(this.validateViewFieldReferences(spec));
    
    // Aggregate results
    return this.aggregateResults(results);
  }
  
  private validateFieldRelationships(fields: FieldDefinition[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check for duplicate field names
    const names = fields.map(f => f.name);
    const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
    if (duplicates.length > 0) {
      errors.push(`Duplicate field names: ${duplicates.join(', ')}`);
    }
    
    // Ensure at least one required field
    if (!fields.some(f => f.required)) {
      warnings.push('No required fields. Consider making key fields required.');
    }
    
    // Category-specific recommendations
    const hasDateField = fields.some(f => f.type === 'date');
    if (!hasDateField) {
      warnings.push('No date field. Time-based tracking will be limited.');
    }
    
    return { valid: errors.length === 0, errors, warnings };
  }
}

// Layer 3: Runtime validation
export class RuntimeValidator {
  async validateBeforeGeneration(spec: ProjectSpec): Promise<ValidationResult> {
    // Check for potential runtime issues
    const errors: string[] = [];
    
    // Ensure chart configurations are valid
    for (const view of spec.views) {
      if (view.type === 'chart') {
        const chartConfig = view.config as ChartConfig;
        const fieldExists = spec.dataStore.fields.some(f => f.name === chartConfig.yAxis);
        if (!fieldExists) {
          errors.push(`Chart "${view.title}" references non-existent field "${chartConfig.yAxis}"`);
        }
        
        const yField = spec.dataStore.fields.find(f => f.name === chartConfig.yAxis);
        if (yField && yField.type !== 'number') {
          errors.push(`Chart "${view.title}" uses non-numeric field "${chartConfig.yAxis}" for Y-axis`);
        }
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
}
```

**Error Handling Strategy:**

```typescript
// Custom error types
export class ScaffolderError extends Error {
  constructor(
    message: string,
    public phase: StatusPhase,
    public severity: 'warning' | 'error',
    public technicalDetails?: string,
    public recovery?: {
      suggestion: string;
      action?: () => Promise<void>;
    }
  ) {
    super(message);
    this.name = 'ScaffolderError';
  }
}

export class AIServiceError extends ScaffolderError {
  constructor(originalError: Error) {
    super(
      'AI service temporarily unavailable',
      'parse',
      'warning',
      `API Error: ${originalError.message}`,
      {
        suggestion: 'Using fallback analysis. Your app will still be created.',
        action: async () => {
          // Retry with exponential backoff
        }
      }
    );
  }
}

// In scaffolder route
try {
  const intent = await parseIntent(userMessage, statusId);
} catch (error) {
  if (error instanceof AIServiceError) {
    // Emit user-friendly error via SSE
    emitStatus(statusId, 'parse', error.message, {
      severity: error.severity,
      technicalDetails: error.technicalDetails,
      progress: 20
    });
    
    // Execute recovery action
    if (error.recovery?.action) {
      await error.recovery.action();
    }
  }
  
  // Continue with fallback
  const fallbackIntent = getFallbackIntent(userMessage);
  // ...
}
```

---

## Implementation Order (Priority-Based)

### Phase 1: Reliability Foundation (Week 1)

1. Fix SSE streaming with buffering
2. Enhanced error handling throughout
3. Comprehensive validation system
4. Better logging and debugging

### Phase 2: User Experience (Week 2)

5. Visual preview generation
6. AI response streaming
7. Template gallery UI

### Phase 3: Intelligence (Week 3)

8. Smart question engine
9. Pattern library integration
10. Adaptive questioning flow

---

## Testing Strategy

### Reliability Tests

- SSE connection failures and recovery
- AI API timeout handling
- Network interruption scenarios
- Race condition testing

### User Experience Tests

- Preview rendering with edge cases
- Streaming with slow connections
- Template customization flow
- Mobile responsiveness

### Integration Tests

- End-to-end scaffolder flow
- Template → App generation
- Multi-user concurrent usage

---

## Success Metrics

1. **Reliability**

                                                                                                                                                                                                - Zero dropped status messages
                                                                                                                                                                                                - 100% graceful error handling
                                                                                                                                                                                                - < 1% fallback usage rate

2. **Performance**

                                                                                                                                                                                                - First message < 2s (with streaming)
                                                                                                                                                                                                - Preview generation < 500ms
                                                                                                                                                                                                - Total flow completion < 60s

3. **User Experience**

                                                                                                                                                                                                - Streaming feedback feels instant
                                                                                                                                                                                                - Preview clearly shows final app
                                                                                                                                                                                                - < 3 questions on average for templates

4. **Quality**

                                                                                                                                                                                                - Zero invalid specs generated
                                                                                                                                                                                                - All validation errors user-actionable
                                                                                                                                                                                                - 95%+ first-time generation success