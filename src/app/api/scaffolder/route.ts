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
import type { BlueprintState, Message, ProjectSpec } from '@/lib/scaffolder/types';
import { generateId } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, conversationId, message, questionId, answer } = body;

    switch (action) {
      case 'start':
        return handleStart(session.user.id, message);
      
      case 'answer':
        return handleAnswer(session.user.id, conversationId, questionId, answer);
      
      case 'finalize':
        return handleFinalize(session.user.id, conversationId);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Scaffolder error:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}

// Start a new conversation with initial prompt
async function handleStart(userId: string, userMessage: string) {
  // Parse the user's intent
  const intent = await parseIntent(userMessage);
  
  // Generate probe questions
  const questions = await generateProbeQuestions(intent);
  
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

  // Save conversation to database
  const conversation = await prisma.conversation.create({
    data: {
      userId,
      messages: messages as unknown as object[],
      phase: 'PROBE',
      spec: state as unknown as object,
    },
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
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  // Reconstruct state from stored spec
  let state = conversation.spec as unknown as BlueprintState;
  state = recordAnswer(state, questionId, answer);

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
    // All questions answered, move to picture phase
    state.phase = 'picture';
    const spec = buildSpecFromAnswers(state);
    state.spec = spec;
    
    const previewHTML = generatePreviewHTML(spec);
    
    messages.push({
      id: generateId(),
      role: 'assistant',
      content: `Here's a preview of your **${spec.name}**:\n\n${spec.description}\n\nIt will include:\n- A form to add new entries with ${spec.dataStore.fields.length} fields\n- ${spec.views.map(v => v.title).join(' and ')}\n\nDoes this look right? Click "Build My App" to create it, or we can make adjustments.`,
      timestamp: new Date(),
      metadata: { phase: 'picture' },
    });
  }

  // Update conversation in database
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      messages: messages as unknown as object[],
      phase: state.phase === 'picture' ? 'PICTURE' : 'PROBE',
      spec: state as unknown as object,
    },
  });

  return NextResponse.json({
    conversationId,
    messages,
    state: {
      phase: state.phase,
      spec: state.spec,
      questions: state.questions,
      allQuestionsAnswered: !state.questions.some(q => !q.answered),
    },
    preview: state.phase === 'picture' && state.spec ? generatePreviewHTML(state.spec as ProjectSpec) : null,
  });
}

// Finalize and create the app
async function handleFinalize(userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  const state = conversation.spec as unknown as BlueprintState;
  
  if (!state.spec) {
    return NextResponse.json({ error: 'No spec to finalize' }, { status: 400 });
  }

  // Cast spec to ProjectSpec for type safety
  const spec = state.spec as ProjectSpec;

  // Validate the spec
  const validation = validateSpec(spec);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
  }

  // Generate app configuration
  const appConfig = generateAppConfig(state);

  // Create the app in the database
  const app = await prisma.app.create({
    data: {
      userId,
      name: spec.name,
      description: spec.description,
      spec: spec as unknown as object,
      config: appConfig as unknown as object,
      data: [],
      status: 'ACTIVE',
    },
  });

  // Update conversation
  const messages = conversation.messages as unknown as Message[];
  messages.push({
    id: generateId(),
    role: 'assistant',
    content: `🎉 Your **${app.name}** is ready! You can access it now at /apps/${app.id}`,
    timestamp: new Date(),
    metadata: { phase: 'complete' },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      messages: messages as unknown as object[],
      phase: 'COMPLETE',
      appId: app.id,
    },
  });

  return NextResponse.json({
    success: true,
    app: {
      id: app.id,
      name: app.name,
      description: app.description,
      url: `/apps/${app.id}`,
    },
  });
}
