import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { parseIntent } from '@/lib/scaffolder/parser';
import { generateProbeQuestions } from '@/lib/scaffolder/probe';
import { 
  createBlueprintState, 
  updateBlueprintWithIntent, 
  updateBlueprintWithQuestions,
  recordAnswer,
  buildSpecFromAnswers,
  generatePreviewHTML,
} from '@/lib/scaffolder/blueprint';
import { generateAppConfig, validateSpec } from '@/lib/scaffolder/compiler';
import { generateImplementationPlan, formatPlanMessage } from '@/lib/scaffolder/plan-generator';
import { generateAppCode, generateFallbackCode, type GeneratedCode } from '@/lib/scaffolder/code-generator';
import type { BlueprintState, Message, ProjectSpec } from '@/lib/scaffolder/types';
import { generateId } from '@/lib/utils';
import { emitStatus, waitForConnection, getConnectionStats } from './status/[conversationId]/route';
import { emitCodeChunk, emitCodeComplete, emitCodeError } from './code-stream/[conversationId]/route';
import { 
  ScaffolderError, 
  wrapError, 
  NotFoundError, 
  ValidationError, 
  DatabaseError 
} from '@/lib/error-handling/scaffolder-errors';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, conversationId, message, questionId, answer, tempConversationId } = body;

    switch (action) {
      case 'start':
        return handleStart(session.user.id, message, tempConversationId);
      
      case 'answer':
        return handleAnswer(session.user.id, conversationId, questionId, answer);
      
      case 'finalize':
        return handleFinalize(session.user.id, conversationId);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    // Wrap error in our custom error type for consistent handling
    const wrappedError = wrapError(error, 'parse');
    
    console.error('Scaffolder error:', wrappedError.toJSON());
    
    // Return structured error response
    return NextResponse.json(
      { 
        error: wrappedError.message,
        errorCode: wrappedError.errorCode,
        recovery: wrappedError.recovery?.suggestion,
        technicalDetails: process.env.NODE_ENV === 'development' ? wrappedError.technicalDetails : undefined,
      },
      { status: wrappedError instanceof NotFoundError ? 404 : wrappedError instanceof ValidationError ? 400 : 500 }
    );
  }
}

// Start a new conversation with initial prompt
async function handleStart(userId: string, userMessage: string, tempConversationId?: string) {
  // Use provided temp ID or generate one for status tracking
  const statusId = tempConversationId || generateId();
  
  console.log(`\n🚀 === handleStart ===`);
  console.log(`📋 User message: "${userMessage}"`);
  console.log(`🔑 StatusId: ${statusId}`);
  console.log(`🔑 TempConversationId provided: ${tempConversationId || 'none'}`);
  console.log(`📊 Connection stats:`, getConnectionStats());
  
  // Wait for SSE connection to be ready (with timeout)
  // This ensures status messages are delivered reliably
  const connectionReady = await waitForConnection(statusId, 2000);
  console.log(`📡 SSE connection ready: ${connectionReady}`);
  
  // Emit: Starting to parse (will be buffered if connection not ready)
  emitStatus(statusId, 'parse', 'Analyzing your request...', {
    severity: 'info',
    technicalDetails: 'Calling parseIntent() with AI model',
    progress: 10,
  });

  // Parse the user's intent
  const intent = await parseIntent(userMessage, statusId);
  
  console.log(`✅ Intent parsed:`, JSON.stringify(intent, null, 2));
  
  emitStatus(statusId, 'parse', 'Understanding complete!', {
    severity: 'success',
    technicalDetails: `Detected: ${intent.category} tracker with ${intent.entities.length} entities`,
    progress: 30,
  });

  // Emit: Generating questions
  emitStatus(statusId, 'probe', 'Generating personalized questions...', {
    severity: 'info',
    technicalDetails: 'Calling generateProbeQuestions() with AI',
    progress: 40,
  });

  // Generate probe questions
  const questions = await generateProbeQuestions(intent, statusId);
  
  console.log(`✅ Questions generated (${questions.length}):`);
  questions.forEach((q, i) => {
    console.log(`   [${i}] id="${q.id}", category="${q.category}", type="${q.type}"`);
    console.log(`       options: ${q.options.map(o => o.id).join(', ')}`);
  });
  
  emitStatus(statusId, 'probe', `Generated ${questions.length} questions for you!`, {
    severity: 'success',
    technicalDetails: `Questions: ${questions.map(q => q.id).join(', ')}`,
    progress: 60,
  });

  // Create blueprint state
  let state = createBlueprintState();
  state = updateBlueprintWithIntent(state, intent);
  state = updateBlueprintWithQuestions(state, questions);

  // Create assistant messages
  const messages: Message[] = [
    {
      id: generateId(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    },
    {
      id: generateId(),
      role: 'assistant',
      content: `Great! I understand you want to build a **${intent.suggestedName}** - a ${intent.category} tracker. I have a few questions to make sure I build exactly what you need.`,
      timestamp: new Date(),
      metadata: { phase: 'probe' },
    },
  ];

  // Add first question
  if (questions.length > 0) {
    messages.push({
      id: generateId(),
      role: 'assistant',
      content: questions[0].question,
      timestamp: new Date(),
      metadata: {
        phase: 'probe',
        questionType: questions[0].type,
        options: questions[0].options,
      },
    });
  }

  // Emit: Saving conversation
  emitStatus(statusId, 'probe', 'Setting up your conversation...', {
    severity: 'info',
    technicalDetails: 'Saving to database',
    progress: 80,
  });

  // Save conversation to database
  const conversation = await prisma.conversation.create({
    data: {
      userId,
      messages: messages as unknown as object[],
      phase: 'PROBE',
      spec: state as unknown as object,
    },
  });

  // Emit: Complete
  emitStatus(statusId, 'probe', 'Ready to start!', {
    severity: 'success',
    technicalDetails: `Conversation ID: ${conversation.id}`,
    progress: 100,
  });

  return NextResponse.json({
    conversationId: conversation.id,
    messages,
    state: {
      phase: state.phase,
      intent: state.intent,
      questions: state.questions,
      currentQuestionIndex: 0,
    },
  });
}

// Handle answering a probe question
async function handleAnswer(
  userId: string, 
  conversationId: string, 
  questionId: string, 
  answer: string | string[]
) {
  console.log(`\n📝 === handleAnswer ===`);
  console.log(`🔑 ConversationId: ${conversationId}`);
  console.log(`❓ QuestionId: ${questionId}`);
  console.log(`💬 Answer:`, JSON.stringify(answer));

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  });

  if (!conversation) {
    console.log(`❌ Conversation not found: ${conversationId}`);
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  // Reconstruct state from stored spec
  let state = conversation.spec as unknown as BlueprintState;
  
  console.log(`📊 Current answers before recording:`, JSON.stringify(state.answers || {}));
  console.log(`📊 Current questions:`, state.questions?.map(q => `${q.id}(${q.answered ? 'answered' : 'pending'})`).join(', '));
  
  // Validate that the questionId exists in the state
  const questionExists = state.questions?.some(q => q.id === questionId);
  if (!questionExists) {
    console.log(`⚠️ WARNING: QuestionId "${questionId}" not found in state questions!`);
    console.log(`   Available question IDs: [${state.questions?.map(q => q.id).join(', ')}]`);
    // Still proceed - the recordAnswer function will handle it
  } else {
    console.log(`✅ QuestionId "${questionId}" validated - exists in state`);
  }
  
  state = recordAnswer(state, questionId, answer);
  
  console.log(`📊 Answers after recording:`, JSON.stringify(state.answers));

  const messages = conversation.messages as unknown as Message[];
  
  // Add user's answer as a message
  const answerText = Array.isArray(answer) ? answer.join(', ') : answer;
  messages.push({
    id: generateId(),
    role: 'user',
    content: answerText,
    timestamp: new Date(),
  });

  // Find next unanswered question
  const nextQuestion = state.questions.find(q => !q.answered);
  console.log(`⏭️ Next question: ${nextQuestion ? nextQuestion.id : 'NONE - all answered'}`);

  if (nextQuestion) {
    // Ask next question
    messages.push({
      id: generateId(),
      role: 'assistant',
      content: nextQuestion.question,
      timestamp: new Date(),
      metadata: {
        phase: 'probe',
        questionType: nextQuestion.type,
        options: nextQuestion.options,
      },
    });
  } else {
    // All questions answered, build spec and generate implementation plan
    console.log(`\n🏗️ === Building Spec ===`);
    console.log(`📊 Final answers object:`, JSON.stringify(state.answers, null, 2));
    console.log(`📋 Questions with categories:`, state.questions.map(q => `${q.id}(${q.category})`).join(', '));

    emitStatus(conversationId, 'picture', 'Building your app preview...', {
      severity: 'info',
      technicalDetails: 'Calling buildSpecFromAnswers()',
      progress: 30,
    });

    state.phase = 'picture';
    const spec = buildSpecFromAnswers(state);
    state.spec = spec;

    console.log(`✅ Spec built:`);
    console.log(`   Name: ${spec.name}`);
    console.log(`   Description: ${spec.description}`);
    console.log(`   Fields: ${spec.dataStore.fields.map(f => f.name).join(', ')}`);
    console.log(`   Views: ${spec.views.map(v => v.type).join(', ')}`);

    emitStatus(conversationId, 'picture', 'Spec ready, generating implementation plan...', {
      severity: 'success',
      technicalDetails: `Spec: ${spec.dataStore.fields.length} fields, ${spec.views.length} views`,
      progress: 50,
    });

    // Generate the implementation plan using LLM
    console.log(`\n🎯 === Generating Implementation Plan ===`);
    const plan = await generateImplementationPlan(spec, conversationId);
    state.plan = plan;
    state.phase = 'plan';

    console.log(`✅ Plan generated successfully`);
    console.log(`   Complexity: ${plan.estimatedComplexity}`);
    console.log(`   Steps: ${plan.steps.length}`);

    // Generate preview HTML
    const previewHTML = generatePreviewHTML(spec);

    // Add plan message with formatted content
    messages.push({
      id: generateId(),
      role: 'assistant',
      content: formatPlanMessage(plan),
      timestamp: new Date(),
      metadata: { 
        phase: 'plan',
        plan: plan,
      },
    });

    // Add preview message
    messages.push({
      id: generateId(),
      role: 'assistant',
      content: `Here's a preview of your **${spec.name}**:\n\n${spec.description}\n\nIt will include:\n- A form to add new entries with ${spec.dataStore.fields.length} fields\n- ${spec.views.map(v => v.title).join(' and ')}\n\nReview the plan above and click "Build My App" when you're ready!`,
      timestamp: new Date(),
      metadata: { phase: 'plan' },
    });

    console.log(`🎉 Plan generation complete - ready for user to review and finalize`);
  }

  // Determine database phase value
  let dbPhase: 'PROBE' | 'PICTURE' | 'PLAN' = 'PROBE';
  if (state.phase === 'picture') dbPhase = 'PICTURE';
  if (state.phase === 'plan') dbPhase = 'PLAN';

  // Update conversation in database
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      messages: messages as unknown as object[],
      phase: dbPhase,
      spec: state as unknown as object,
    },
  });

  return NextResponse.json({
    conversationId,
    messages,
    state: {
      phase: state.phase,
      spec: state.spec,
      plan: state.plan,
      questions: state.questions,
      allQuestionsAnswered: !state.questions.some(q => !q.answered),
    },
    preview: (state.phase === 'picture' || state.phase === 'plan') && state.spec 
      ? generatePreviewHTML(state.spec as ProjectSpec) 
      : null,
  });
}

// Finalize and create the app
async function handleFinalize(userId: string, conversationId: string) {
  console.log(`\n🏭 === handleFinalize ===`);
  console.log(`🔑 ConversationId: ${conversationId}`);

  emitStatus(conversationId, 'build', 'Starting app generation...', {
    severity: 'info',
    technicalDetails: 'Loading conversation spec',
    progress: 10,
  });

  let conversation;
  try {
    conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });
  } catch (dbError) {
    const error = new DatabaseError('find conversation', dbError instanceof Error ? dbError : undefined);
    console.error('❌ Database error:', error.toJSON());
    emitStatus(conversationId, 'build', error.message, {
      severity: 'error',
      technicalDetails: error.technicalDetails,
    });
    throw error;
  }

  if (!conversation) {
    const error = new NotFoundError('Conversation', conversationId);
    console.log(`❌ Conversation not found: ${conversationId}`);
    emitStatus(conversationId, 'build', error.message, {
      severity: 'error',
      technicalDetails: error.technicalDetails,
    });
    throw error;
  }

  const state = conversation.spec as unknown as BlueprintState;

  if (!state.spec) {
    const error = new ValidationError(['No specification found - please complete all questions first'], [], 'build');
    console.log(`❌ No spec found in conversation state`);
    emitStatus(conversationId, 'build', error.message, {
      severity: 'error',
      technicalDetails: 'State.spec is empty',
    });
    throw error;
  }

  console.log(`✅ Found spec to finalize:`);
  console.log(`   Name: ${state.spec.name}`);
  console.log(`   Fields: ${state.spec.dataStore?.fields?.length || 0}`);
  console.log(`   Views: ${state.spec.views?.length || 0}`);

  // Cast spec to ProjectSpec for type safety
  const spec = state.spec as ProjectSpec;

  emitStatus(conversationId, 'build', 'Validating app specification...', {
    severity: 'info',
    technicalDetails: 'Running validateSpec()',
    progress: 30,
  });

  // Validate the spec
  const validation = validateSpec(spec);
  if (!validation.valid) {
    const error = new ValidationError(validation.errors, validation.warnings || [], 'build');
    emitStatus(conversationId, 'build', 'Validation failed', {
      severity: 'error',
      technicalDetails: validation.errors.join(', '),
    });
    throw error;
  }

  // Emit warnings if any
  if (validation.warnings && validation.warnings.length > 0) {
    emitStatus(conversationId, 'build', `Note: ${validation.warnings.join('; ')}`, {
      severity: 'warning',
      progress: 35,
    });
  }

  emitStatus(conversationId, 'build', 'Compiling app configuration...', {
    severity: 'info',
    technicalDetails: 'Calling generateAppConfig()',
    progress: 20,
  });

  // Generate app configuration
  const appConfig = generateAppConfig(state);

  emitStatus(conversationId, 'build', 'Creating app record...', {
    severity: 'info',
    technicalDetails: 'Inserting into App table with GENERATING status',
    progress: 25,
  });

  // Create the app in the database with GENERATING status
  let app;
  try {
    app = await prisma.app.create({
      data: {
        userId,
        name: spec.name,
        description: spec.description,
        spec: spec as unknown as object,
        config: appConfig as unknown as object,
        data: [],
        status: 'GENERATING',
        buildStatus: 'GENERATING',
      },
    });
  } catch (dbError) {
    const error = new DatabaseError('create app', dbError instanceof Error ? dbError : undefined);
    console.error('❌ Database error creating app:', error.toJSON());
    emitStatus(conversationId, 'build', 'Failed to create app', {
      severity: 'error',
      technicalDetails: error.technicalDetails,
    });
    throw error;
  }

  console.log(`📝 App record created with ID: ${app.id}`);

  emitStatus(conversationId, 'build', 'Starting code generation...', {
    severity: 'info',
    technicalDetails: 'Calling LLM for component code generation',
    progress: 30,
  });

  // Generate code with streaming
  const generatedCode: GeneratedCode = {
    pageComponent: '',
    types: '',
  };
  const generationLog: Array<{ timestamp: string; message: string }> = [];

  try {
    console.log(`\n🔧 === Starting Code Generation for ${app.id} ===`);
    
    for await (const chunk of generateAppCode(spec, app.id)) {
      generationLog.push({
        timestamp: new Date().toISOString(),
        message: `[${chunk.type}] ${chunk.content?.substring(0, 100) || 'chunk'}`,
      });

      if (chunk.type === 'status') {
        emitStatus(conversationId, 'build', chunk.content, {
          severity: 'info',
          progress: Math.min(30 + Math.floor(chunk.progress * 0.6), 90),
        });
      } else if (chunk.type === 'code') {
        // Emit code chunk for real-time display
        emitCodeChunk(conversationId, {
          component: chunk.component || 'page',
          code: chunk.content,
          progress: chunk.progress,
        });
        
        // Accumulate code
        if (chunk.component === 'page') {
          generatedCode.pageComponent += chunk.content;
        } else if (chunk.component === 'types') {
          generatedCode.types = (generatedCode.types || '') + chunk.content;
        }
      } else if (chunk.type === 'complete') {
        // Final complete chunk contains the full cleaned code
        generatedCode.pageComponent = chunk.content;
        console.log(`✅ Code generation complete, length: ${chunk.content.length}`);
        break;
      } else if (chunk.type === 'error') {
        console.error(`❌ Code generation error: ${chunk.content}`);
        emitCodeError(conversationId, chunk.content);
        throw new Error(chunk.content);
      }
    }
  } catch (genError) {
    console.error('❌ Code generation failed, using fallback:', genError);
    
    emitStatus(conversationId, 'build', 'Using fallback code generator...', {
      severity: 'warning',
      technicalDetails: genError instanceof Error ? genError.message : 'Unknown error',
      progress: 85,
    });

    // Use fallback code generator
    generatedCode.pageComponent = generateFallbackCode(spec, app.id);
    generationLog.push({
      timestamp: new Date().toISOString(),
      message: `[fallback] Generated fallback code due to error`,
    });
  }

  // Emit the complete code
  emitCodeComplete(conversationId, generatedCode.pageComponent);

  emitStatus(conversationId, 'build', 'Saving generated code...', {
    severity: 'info',
    technicalDetails: 'Updating app record with generated code',
    progress: 92,
  });

  // Update app with generated code
  try {
    await prisma.app.update({
      where: { id: app.id },
      data: {
        generatedCode: generatedCode as unknown as object,
        generationLog: generationLog as unknown as object,
        status: 'ACTIVE',
        buildStatus: 'COMPLETED',
      },
    });
  } catch (dbError) {
    console.error('❌ Failed to save generated code:', dbError);
    emitStatus(conversationId, 'build', 'Warning: Generated code may not be saved', {
      severity: 'warning',
      technicalDetails: 'Database update failed',
      progress: 94,
    });
  }

  emitStatus(conversationId, 'build', 'Finalizing...', {
    severity: 'info',
    technicalDetails: `App ${app.id} ready for preview`,
    progress: 96,
  });

  // Update conversation
  const messages = conversation.messages as unknown as Message[];
  messages.push({
    id: generateId(),
    role: 'assistant',
    content: `🎉 Your **${app.name}** has been generated! Review the preview below and click "Accept" when you're satisfied, or report any issues for regeneration.`,
    timestamp: new Date(),
    metadata: { phase: 'complete' },
  });

  try {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        messages: messages as unknown as object[],
        phase: 'COMPLETE',
        appId: app.id,
      },
    });
  } catch (dbError) {
    console.warn('⚠️ Failed to update conversation:', dbError);
  }

  emitStatus(conversationId, 'complete', `${spec.name} is ready for preview!`, {
    severity: 'success',
    technicalDetails: `App URL: /apps/${app.id}`,
    progress: 100,
  });

  console.log(`🎉 App generation successful!`);
  console.log(`   App ID: ${app.id}`);
  console.log(`   App Name: ${app.name}`);
  console.log(`   Code Length: ${generatedCode.pageComponent.length} chars`);
  console.log(`   App URL: /apps/${app.id}`);

  return NextResponse.json({
    success: true,
    app: {
      id: app.id,
      name: app.name,
      description: app.description,
      url: `/apps/${app.id}`,
    },
    generatedCode,
    buildComplete: true,
  });
}
