
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { generateId, generateSubdomain } from '@/lib/utils';
import type { UserLLMSettings, LLMProvider } from '@/lib/llm';
import { enhanceUserSettingsWithApiKeys } from '@/lib/llm';
import { 
  // New naming convention (preferred)
  architect,
  coordinator,
  designer,
  coder,
  advisor,
  automator,
  // Legacy names for backward compatibility
  architectAgent, 
  adaptiveArchitect,
  intentEngine,
  schemaDesignerAgent,
  uiDesignerAgent,
  codeGeneratorAgent,
  workflowAgent,
  type BaseAgent,
} from '@/lib/scaffolder-v2/agents';
import {
  createConversationState,
  createDynamicConversationState,
  ensureDynamicState,
  addMessageToState,
  updateConversationState,
  transitionPhase,
  updateReadiness,
  setEnhancedIntent,
  setSuggestions,
  createCheckpoint,
  serializeState,
  serializeDynamicState,
  deserializeState,
  deserializeDynamicState,
  addRefinementEntry,
  getPhaseFromReadiness,
} from '@/lib/scaffolder-v2/state';
import { proposalEngine } from '@/lib/scaffolder-v2/proposals';
import { mockupGenerator } from '@/lib/scaffolder-v2/mockup';
import { FeedbackLoop } from '@/lib/scaffolder-v2/feedback-loop';
import { FeedbackStats } from '@/lib/scaffolder-v2/feedback-stats';
import { IS_DEMO_MODE } from '@/lib/config';
import type { 
  ConversationState,
  DynamicConversationState,
  V2ChatRequest, 
  V2ChatResponse,
  ArchitectDecision,
  EnhancedArchitectDecision,
  Schema,
  LayoutNode,
  EnhancedIntent,
  ProposalSet,
  GeneratedApp,
  WorkflowDefinition,
  ProactiveSuggestion,
} from '@/lib/scaffolder-v2/types';

/**
 * POST /api/scaffolder-v2
 * Main chat endpoint for v2 scaffolder
 * 
 * This endpoint powers the dual-agent system:
 * - The Advisor (AI assistant) processes user messages
 * - The Architect (internal agent) drives autonomous app design
 * - State is persisted to maintain context across interactions
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: V2ChatRequest = await request.json();
    const { conversationId, message, action = 'chat' } = body;

    console.log('\n🚀 === V2 Scaffolder Request ===');
    console.log(`📋 Action: ${action}`);
    console.log(`💬 Message: "${message?.substring(0, 100)}${message?.length > 100 ? '...' : ''}"`);
    console.log(`🔑 ConversationId: ${conversationId || 'new'}`);
    console.log(`👤 User: ${session.user.id}`);

    let response: NextResponse;

    switch (action) {
      case 'chat':
        response = await handleChat(session.user.id, conversationId, message);
        break;
      
      case 'finalize':
        response = await handleFinalize(session.user.id, conversationId!);
        break;
      
      case 'undo':
        response = await handleUndo(session.user.id, conversationId!);
        break;
      
      case 'select_proposal':
        response = await handleSelectProposal(session.user.id, conversationId!, message);
        break;
      
      case 'fix_component':
        response = await handleFixComponent(session.user.id, conversationId!, body.componentCode!, body.errorLog!, message);
        break;

      case 'resolve_feedback':
        response = await handleResolveFeedback(session.user.id, conversationId!, message, body.componentCode!);
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Request completed in ${duration}ms`);
    
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ V2 Scaffolder error after ${duration}ms:`, error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Handle a chat message with the dynamic pipeline
 * This function maintains conversation context and drives autonomous progression
 */
async function handleChat(
  userId: string,
  conversationId: string | undefined,
  message: string
): Promise<NextResponse<V2ChatResponse>> {
  let state: DynamicConversationState;
  let isNewConversation = false;

  // Load or create conversation state
  if (conversationId) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId, version: 'v2' },
    });

    if (!conversation) {
      console.log(`⚠️ Conversation ${conversationId} not found, creating new`);
      // Instead of returning 404, create a new conversation
      // This ensures continuity even if there's a state mismatch
      state = createDynamicConversationState();
      isNewConversation = true;
    } else {
      // Safely deserialize state with fallback
      try {
        const rawState = conversation.agentState as object;
        state = ensureDynamicState(
          rawState ? deserializeDynamicState(rawState) : createDynamicConversationState()
        );
        state.id = conversationId;
        console.log(`✅ Loaded conversation ${conversationId}, readiness: ${state.readiness.overall}%`);
      } catch (error) {
        console.error(`❌ Failed to deserialize state for ${conversationId}:`, error);
        // Create fresh state but keep the conversation ID
        state = createDynamicConversationState();
        state.id = conversationId;
      }
    }
  } else {
    state = createDynamicConversationState();
    isNewConversation = true;
    console.log(`🆕 Creating new conversation: ${state.id}`);
  }

  // Add user message to state
  state = addMessageToState(state, 'user', message, { phase: state.phase }) as DynamicConversationState;

  // Get user LLM settings including API keys
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      preferredLLMProvider: true,
      ollamaEndpoint: true,
      ollamaModel: true,
      ollamaSmallModel: true,
      lmstudioEndpoint: true,
      lmstudioModel: true,
      deepseekApiKey: true,
      openrouterApiKey: true,
    },
  });

  // Build base user settings
  const baseSettings: UserLLMSettings = user ? {
    provider: (user.preferredLLMProvider || undefined) as LLMProvider | undefined,
    ollamaEndpoint: user.ollamaEndpoint || undefined,
    ollamaModel: user.ollamaModel || undefined,
    ollamaSmallModel: user.ollamaSmallModel || undefined,
    lmstudioEndpoint: user.lmstudioEndpoint || undefined,
    lmstudioModel: user.lmstudioModel || undefined,
  } : {};

  // Enhance with decrypted API keys if available
  const userSettings: UserLLMSettings | undefined = user ? enhanceUserSettingsWithApiKeys(
    baseSettings,
    {
      deepseekApiKey: user.deepseekApiKey,
      openrouterApiKey: user.openrouterApiKey,
    }
  ) : undefined;

  // Create checkpoint before processing
  if (state.schemas.length > 0 || state.layout) {
    state = createCheckpoint(state, `Before: ${message.substring(0, 30)}...`);
  }

  // Use adaptive architect for dynamic pipeline
  if (IS_DEMO_MODE) {
    // Add assistant message to state
    state = addMessageToState(state, 'assistant', 'Demo Mode: The Advanced Scaffolder (V2) is connected to live AI services which are disabled in this demo environment. Please use the "Guided" mode for a simulated experience.', {
      phase: state.phase,
    }) as DynamicConversationState;

    return NextResponse.json({
      conversationId: state.id,
      messages: state.messages,
      state: {
        phase: state.phase,
        schemas: state.schemas,
        layout: state.layout,
        suggestedAppName: state.suggestedAppName,
        readiness: state.readiness,
        currentProposals: state.currentProposals,
        suggestions: state.suggestions,
      },
      requiresUserInput: true,
      suggestedActions: [],
    });
  }

  // Use the Architect to coordinate the pipeline
  const architectResponse = await architect.process(message, state, userSettings);
  const decision = architectResponse.data as EnhancedArchitectDecision;

  console.log(`🧠 Architect decision:`, {
    parallelActions: decision.parallelActions.length,
    generateProposals: decision.generateProposals,
  });

  // Execute parallel actions
  const { message: assistantMessage, updatedState } = await executeParallelPipeline(
    decision,
    state,
    message
  );
  state = updatedState;

  // Update phase based on readiness
  state.phase = getPhaseFromReadiness(state.readiness);
  
  // Add assistant message to state
  state = addMessageToState(state, 'assistant', assistantMessage, {
    phase: state.phase,
  }) as DynamicConversationState;

  // Save conversation to database with robust error handling
  const serializedState = serializeDynamicState(state);
  
  try {
    if (isNewConversation) {
      await prisma.conversation.create({
        data: {
          id: state.id,
          userId,
          agentState: serializedState as any,
          messages: state.messages as any,
          version: 'v2',
        },
      });
      console.log(`💾 Created new conversation: ${state.id}`);
    } else {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          agentState: serializedState as any,
          messages: state.messages as any,
          updatedAt: new Date(),
        },
      });
      console.log(`💾 Updated conversation: ${conversationId}, readiness: ${state.readiness.overall}%`);
    }
  } catch (dbError) {
    console.error('❌ Failed to save conversation:', dbError);
    // Continue anyway - we can still return the response
    // The client can retry or the user can continue in a new conversation
  }

  // Determine if ready to build
  const isReadyToBuild = state.readiness.overall >= 80;
  
  // Log readiness for debugging
  console.log(`📊 State after processing:`, {
    phase: state.phase,
    readiness: state.readiness,
    hasSchema: state.schemas.length > 0,
    hasLayout: !!state.layout,
    isReadyToBuild,
  });

  return NextResponse.json({
    conversationId: state.id,
    messages: state.messages,
    state: {
      phase: state.phase,
      schemas: state.schemas,
      layout: state.layout,
      suggestedAppName: state.suggestedAppName,
      readiness: state.readiness,
      currentProposals: state.currentProposals,
      suggestions: state.suggestions,
    },
    requiresUserInput: true,
    suggestedActions: architectResponse.suggestedActions,
    // Additional flags for UI
    isReadyToBuild,
    canFinalize: state.schemas.length > 0 && state.readiness.overall >= 60,
  });
}

import { QualityController } from '@/lib/scaffolder-v2/quality-control';
import { 
  emitV2CodeChunk, 
  waitForV2CodeStreamConnection,
  isV2ControllerHealthy 
} from './code-stream/[conversationId]/route';

/**
 * Handle finalize action with streaming support
 */
async function handleFinalize(
  userId: string,
  conversationId: string
): Promise<NextResponse> {
  // Load conversation state
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId, version: 'v2' },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  const state = ensureDynamicState(
    deserializeDynamicState(conversation.agentState as object || createDynamicConversationState())
  );

  if (state.schemas.length === 0 || !state.layout) {
    return NextResponse.json({ error: 'Cannot finalize without schema and layout' }, { status: 400 });
  }

  // Wait for code stream connection (frontend may be connecting)
  const streamConnected = await waitForV2CodeStreamConnection(conversationId, 3000);
  const useStreaming = streamConnected && isV2ControllerHealthy(conversationId);
  
  console.log(`🏗️ V2 Finalize: Streaming ${useStreaming ? 'enabled' : 'disabled'} for ${conversationId}`);

  // Track generated code for response
  const generatedCode: Record<string, string> = {};
  const qualityReports: Record<string, any> = {};
  let overallScore = 0;
  let componentCount = 0;

  if (useStreaming) {
    // Use incremental generation with streaming
    emitV2CodeChunk(conversationId, {
      type: 'status',
      component: 'system',
      code: '',
      progress: 0,
      metadata: { totalFiles: 10 }, // Estimate
    });

    let fileIndex = 0;
    for await (const event of coder.generateAppIncremental(
      state.schemas[0],
      state.layout,
      conversationId
    )) {
      if (event.code) {
        const fileName = event.name || event.type;
        generatedCode[fileName] = event.code;
        
        // Emit chunk to stream
        emitV2CodeChunk(conversationId, {
          type: 'chunk',
          component: fileName,
          code: event.code,
          progress: event.progress,
          metadata: {
            fileName,
            language: 'typescript',
            currentFile: ++fileIndex,
          },
        });

        // Quality check
        if (event.type === 'component' || event.type === 'page') {
          const report = QualityController.verify(event.code);
          qualityReports[fileName] = report;
          overallScore += report.score;
          componentCount++;
        }
      } else if (event.type === 'complete') {
        emitV2CodeChunk(conversationId, {
          type: 'complete',
          component: 'system',
          code: '',
          progress: 100,
        });
      }
    }
  } else {
    // Fallback: Generate all at once (non-streaming)
    const appCode = await coder.generateApp(
      state.schemas[0],
      state.layout,
      conversationId
    );

    // Store all generated code
    generatedCode['types'] = appCode.types;
    generatedCode['validators'] = appCode.validators;
    generatedCode['api'] = appCode.apiClient;
    generatedCode['hooks'] = appCode.hooks;
    generatedCode['utils'] = appCode.utils;
    generatedCode['page'] = appCode.page;
    
    for (const [name, code] of Object.entries(appCode.components)) {
      generatedCode[name] = code;
    }

    // Quality Control
    for (const [path, code] of Object.entries(appCode.components)) {
      const report = QualityController.verify(code);
      qualityReports[path] = report;
      overallScore += report.score;
      componentCount++;
    }

    if (appCode.page) {
      const report = QualityController.verify(appCode.page);
      qualityReports['page.tsx'] = report;
      overallScore += report.score;
      componentCount++;
    }
  }

  overallScore = componentCount > 0 ? overallScore / componentCount : 0;

  // Save app to database
  const name = state.suggestedAppName || state.schemas[0].label;
  const app = await prisma.app.create({
    data: {
      userId,
      name,
      subdomain: generateSubdomain(name),
      description: state.schemas[0].description || '',
      spec: {
        schema: state.schemas[0],
        layout: state.layout,
        components: generatedCode,
      } as any,
      config: {},
      data: [],
      generationLog: {
        qualityReports,
        overallScore,
        generatedAt: new Date().toISOString(),
        streamingUsed: useStreaming,
      } as any,
    },
  });

  // Link app to conversation
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      appId: app.id,
      phase: 'COMPLETE',
    },
  });

  return NextResponse.json({
    success: true,
    app: {
      id: app.id,
      name: app.name,
      subdomain: app.subdomain,
    },
    appUrl: `/apps/${app.id}`,
    generatedCode,
    qualityControl: {
      score: overallScore,
      reports: qualityReports,
    },
    streamingUsed: useStreaming,
  });
}

/**
 * Handle undo action
 */
async function handleUndo(
  userId: string,
  conversationId: string
): Promise<NextResponse<V2ChatResponse>> {
  // Load conversation state
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId, version: 'v2' },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 }) as unknown as NextResponse<V2ChatResponse>;
  }

  let state = ensureDynamicState(
    deserializeDynamicState(conversation.agentState as object || createDynamicConversationState())
  );
  
  // Find last checkpoint
  if (state.checkpoints && state.checkpoints.length > 0) {
    const lastCheckpoint = state.checkpoints[state.checkpoints.length - 1];
    
    // Restore state
    state = updateConversationState(state, {
      schemas: lastCheckpoint.schemas,
      layout: lastCheckpoint.layout,
      workflows: lastCheckpoint.workflows,
      readiness: lastCheckpoint.readiness,
      // Keep messages but add system note
    } as any) as DynamicConversationState;
    
    // Remove used checkpoint
    state.checkpoints.pop();
    
    // Add system message
    state = addMessageToState(state, 'system', `Reverted to previous state: ${lastCheckpoint.label}`, {
      phase: state.phase
    }) as DynamicConversationState;
    
    // Save
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        agentState: serializeDynamicState(state) as any,
        messages: state.messages as any,
      },
    });
  }

  return NextResponse.json({
    conversationId: state.id,
    messages: state.messages,
    state: {
      phase: state.phase,
      schemas: state.schemas,
      layout: state.layout,
      suggestedAppName: state.suggestedAppName,
      readiness: state.readiness,
    },
    requiresUserInput: true,
  });
}

/**
 * Handle proposal selection
 */
async function handleSelectProposal(
  userId: string,
  conversationId: string,
  proposalId: string
): Promise<NextResponse<V2ChatResponse>> {
  // Load conversation state
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId, version: 'v2' },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 }) as unknown as NextResponse<V2ChatResponse>;
  }

  let state = ensureDynamicState(
    deserializeDynamicState(conversation.agentState as object || createDynamicConversationState())
  );
  
  if (!state.currentProposals) {
    return NextResponse.json({ error: 'No active proposals' }, { status: 400 }) as unknown as NextResponse<V2ChatResponse>;
  }
  
  // Find selected proposal
  const proposal = state.currentProposals.proposals.find(p => p.id === proposalId);
  
  if (!proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 }) as unknown as NextResponse<V2ChatResponse>;
  }
  
  // Apply proposal
  state = updateConversationState(state, {
    schemas: proposal.schema || state.schemas,
    layout: proposal.layout || state.layout,
    workflows: proposal.workflows || state.workflows,
    selectedProposalId: proposalId,
    currentProposals: undefined, // Clear proposals
  } as any) as DynamicConversationState;
  
  // Update readiness
  state = updateReadiness(state, {
    schema: proposal.schema ? Math.min(state.readiness.schema + 20, 100) : state.readiness.schema,
    ui: proposal.layout ? Math.min(state.readiness.ui + 20, 100) : state.readiness.ui,
    workflow: proposal.workflows ? Math.min(state.readiness.workflow + 20, 100) : state.readiness.workflow,
  });
  
  // Add system message
  state = addMessageToState(state, 'user', `Selected proposal: ${proposal.name}`, {
    phase: state.phase
  }) as DynamicConversationState;
  
  state = addMessageToState(state, 'assistant', `Great choice! I've updated the design with "${proposal.name}". ${proposal.description}`, {
    phase: state.phase
  }) as DynamicConversationState;
  
  // Save
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      agentState: serializeDynamicState(state) as any,
      messages: state.messages as any,
    },
  });

  return NextResponse.json({
    conversationId: state.id,
    messages: state.messages,
    state: {
      phase: state.phase,
      schemas: state.schemas,
      layout: state.layout,
      suggestedAppName: state.suggestedAppName,
      readiness: state.readiness,
      currentProposals: undefined,
    },
    requiresUserInput: true,
  });
}

/**
 * Handle component fix request
 */
async function handleFixComponent(
  userId: string,
  conversationId: string,
  componentCode: string,
  errorLog: string,
  instruction: string
): Promise<NextResponse<V2ChatResponse>> {
  // Load conversation state
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId, version: 'v2' },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 }) as unknown as NextResponse<V2ChatResponse>;
  }

  let state = ensureDynamicState(
    deserializeDynamicState(conversation.agentState as object || createDynamicConversationState())
  );

  // Initialize or hydrate feedback loop
  let loop: FeedbackLoop;
  if (state.feedbackSession) {
    loop = FeedbackLoop.fromSession(state.feedbackSession);
  } else {
    // Start new session
    loop = new FeedbackLoop(generateId(), instruction || 'Fix component error');
  }

  // Add feedback iteration
  const iteration = loop.addFeedback(componentCode, errorLog);
  
  // Log stats
  FeedbackStats.logAttempt(iteration.analysis.category, iteration.analysis.rootCause);

  // Generate prompt
  const correctionPrompt = loop.generateCorrectionPrompt();

  // Regenerate code using the Coder agent
  const prompt = instruction || 'Fix the component based on the error log';
  const fixedCode = await coder.regenerateComponentWithFeedback(
    componentCode,
    errorLog,
    correctionPrompt || prompt // Prefer structured prompt if available
  );

  // Update feedback session in state
  state.feedbackSession = loop.getSession();

  // Add interaction to history
  state = addMessageToState(state, 'user', `Fix component error: ${instruction || 'Auto-fix'}`, {
    phase: state.phase
  }) as DynamicConversationState;

  state = addMessageToState(state, 'assistant', `I've analyzed the error and updated the component code.`, {
    phase: state.phase
  }) as DynamicConversationState;

  // Save
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      agentState: serializeDynamicState(state) as any,
      messages: state.messages as any,
    },
  });

  // In a real streaming implementation, we would push this update via SSE
  // For now, return it in the response so the UI can update
  return NextResponse.json({
    conversationId: state.id,
    messages: state.messages,
    state: {
      phase: state.phase,
      schemas: state.schemas,
      layout: state.layout,
      suggestedAppName: state.suggestedAppName,
      readiness: state.readiness,
    },
    requiresUserInput: true,
  });
}

/**
 * Handle feedback resolution
 */
async function handleResolveFeedback(
  userId: string,
  conversationId: string,
  message: string,
  componentCode: string
): Promise<NextResponse<V2ChatResponse>> {
  // Load conversation state
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId, version: 'v2' },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 }) as unknown as NextResponse<V2ChatResponse>;
  }

  let state = ensureDynamicState(
    deserializeDynamicState(conversation.agentState as object || createDynamicConversationState())
  );

  // Mark session as resolved and log stats
  if (state.feedbackSession) {
    const loop = FeedbackLoop.fromSession(state.feedbackSession);
    loop.markResolved();
    state.feedbackSession = loop.getSession();

    // Log resolution stats
    const lastIteration = loop.getLastIteration();
    if (lastIteration) {
      FeedbackStats.logResolution(
        lastIteration.analysis.category,
        lastIteration.analysis.rootCause,
        loop.getSession().iterations.length
      );
    }
  }

  // Add interaction to history
  state = addMessageToState(state, 'user', `Feedback resolved: ${message}`, {
    phase: state.phase
  }) as DynamicConversationState;

  state = addMessageToState(state, 'assistant', `Glad to hear the issue is resolved!`, {
    phase: state.phase
  }) as DynamicConversationState;

  // Save
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      agentState: serializeDynamicState(state) as any,
      messages: state.messages as any,
    },
  });

  return NextResponse.json({
    conversationId: state.id,
    messages: state.messages,
    state: {
      phase: state.phase,
      schemas: state.schemas,
      layout: state.layout,
      suggestedAppName: state.suggestedAppName,
      readiness: state.readiness,
    },
    requiresUserInput: true,
  });
}

/**
 * Helper to execute pipeline actions in parallel
 */
async function executeParallelPipeline(
  decision: EnhancedArchitectDecision,
  state: DynamicConversationState,
  userMessage: string
) {
  let updatedState = { ...state };
  let responseMessage = decision.reasoning;

  // Process parallel actions
  if (decision.parallelActions.length > 0) {
    // Sort by priority
    const actions = decision.parallelActions.sort((a, b) => {
      const priorityMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
      return priorityMap[b.priority] - priorityMap[a.priority];
    });

    const results = [];

    for (const action of actions) {
      let result;
      switch (action.agent) {
        case 'schema':
          // Coordinator: Generates data schemas from natural language
          result = await coordinator.process(userMessage, updatedState);
          if (result.success && result.data) {
             const proposal = result.data as { schemas: Schema[]; suggestedName: string; domain: string };
             updatedState = updateConversationState(updatedState, {
               schemas: proposal.schemas,
               suggestedAppName: proposal.suggestedName,
               intent: {
                 ...updatedState.intent,
                 domain: proposal.domain,
               } as any, 
             }) as DynamicConversationState;
             
             // Update readiness
             updatedState = updateReadiness(updatedState, {
               schema: Math.min((updatedState.readiness.schema || 0) + 40, 100),
               overall: Math.min((updatedState.readiness.overall || 0) + 20, 100)
             });
          }
          break;
          
        case 'ui':
          // Designer: Creates layouts and component arrangements
          result = await designer.process(userMessage, updatedState);
          if (result.success && result.data) {
            const proposal = result.data as { layout: LayoutNode };
            updatedState = updateConversationState(updatedState, {
              layout: proposal.layout,
            }) as DynamicConversationState;
            
            // Update readiness
             updatedState = updateReadiness(updatedState, {
               ui: Math.min((updatedState.readiness.ui || 0) + 40, 100),
               overall: Math.min((updatedState.readiness.overall || 0) + 20, 100)
             });
          }
          break;
          
        case 'workflow':
          // Automator: Handles automations and state machines
          result = await automator.process(userMessage, updatedState);
          if (result.success && result.data) {
            const workflowData = result.data as { workflows: WorkflowDefinition[] };
            updatedState = updateConversationState(updatedState, {
              workflows: workflowData.workflows,
            }) as DynamicConversationState;
            
            // Update readiness
            updatedState = updateReadiness(updatedState, {
              workflow: Math.min((updatedState.readiness.workflow || 0) + 40, 100),
              overall: Math.min((updatedState.readiness.overall || 0) + 10, 100)
            });
          }
          break;
          
        case 'intent':
          // Advisor: Deep understanding with reference app detection
          result = await advisor.process(userMessage, updatedState);
          if (result.success && result.data) {
            const intentData = result.data as { intent: EnhancedIntent; suggestions: ProactiveSuggestion[] };
            updatedState = setEnhancedIntent(updatedState, intentData.intent);
            updatedState = setSuggestions(updatedState, intentData.suggestions);
          }
          break;
      }
      
      if (result) {
        results.push(result);
      }
    }
    
    // Construct response message
    if (results.length > 0) {
      responseMessage = results.map(r => r.message).join('\n\n');
    }
  }

  // Generate proposals if requested
  if (decision.generateProposals && updatedState.enhancedIntent) {
    const proposalSet = await proposalEngine.generateProposals(updatedState.enhancedIntent, updatedState);
    updatedState.currentProposals = proposalSet;
    responseMessage += `\n\nI've prepared ${proposalSet.proposals.length} options for you to choose from.`;
  }

  return { message: responseMessage, updatedState };
}
