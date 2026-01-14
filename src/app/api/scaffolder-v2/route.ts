/**
 * Scaffolder V2 API Route
 * Main chat endpoint for the dynamic AI pipeline
 * 
 * Features:
 * - Adaptive orchestrator with parallel agent execution
 * - Multi-proposal system with visual mockups
 * - Smart defaults and proactive suggestions
 * - Natural language refinement routing
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { generateId } from '@/lib/utils';
import type { UserLLMSettings } from '@/lib/llm';
import { 
  orchestratorAgent, 
  adaptiveOrchestrator,
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
import type { 
  ConversationState,
  DynamicConversationState,
  V2ChatRequest, 
  V2ChatResponse,
  OrchestratorDecision,
  EnhancedOrchestratorDecision,
  Schema,
  LayoutNode,
  EnhancedIntent,
  ProposalSet,
} from '@/lib/scaffolder-v2/types';

/**
 * POST /api/scaffolder-v2
 * Main chat endpoint for v2 scaffolder
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: V2ChatRequest = await request.json();
    const { conversationId, message, action = 'chat' } = body;

    console.log('\n🚀 === V2 Scaffolder Request ===');
    console.log(`📋 Action: ${action}`);
    console.log(`💬 Message: "${message?.substring(0, 100)}..."`);
    console.log(`🔑 ConversationId: ${conversationId || 'new'}`);

    switch (action) {
      case 'chat':
        return handleChat(session.user.id, conversationId, message);
      
      case 'finalize':
        return handleFinalize(session.user.id, conversationId!);
      
      case 'undo':
        return handleUndo(session.user.id, conversationId!);
      
      case 'select_proposal':
        return handleSelectProposal(session.user.id, conversationId!, message);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ V2 Scaffolder error:', error);
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
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 }) as unknown as NextResponse<V2ChatResponse>;
    }

    state = ensureDynamicState(
      deserializeDynamicState(conversation.agentState as object || createDynamicConversationState())
    );
    state.id = conversationId;
  } else {
    state = createDynamicConversationState();
    isNewConversation = true;
  }

  // Add user message to state
  state = addMessageToState(state, 'user', message, { phase: state.phase }) as DynamicConversationState;

  // Get user LLM settings
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      preferredLLMProvider: true,
      ollamaEndpoint: true,
      ollamaModel: true,
      ollamaSmallModel: true,
      // lmstudioEndpoint: true,  // TODO: Enable after DB migration
      // lmstudioModel: true,     // TODO: Enable after DB migration
    },
  });

  const userSettings: UserLLMSettings | undefined = user ? {
    provider: user.preferredLLMProvider || undefined,
    ollamaEndpoint: user.ollamaEndpoint || undefined,
    ollamaModel: user.ollamaModel || undefined,
    ollamaSmallModel: user.ollamaSmallModel || undefined,
    // lmstudioEndpoint: user.lmstudioEndpoint || undefined,  // TODO: Enable after DB migration
    // lmstudioModel: user.lmstudioModel || undefined,        // TODO: Enable after DB migration
  } : undefined;

  // Create checkpoint before processing
  if (state.schemas.length > 0 || state.layout) {
    state = createCheckpoint(state, `Before: ${message.substring(0, 30)}...`);
  }

  // Use adaptive orchestrator for dynamic pipeline
  const orchestratorResponse = await adaptiveOrchestrator.process(message, state, userSettings);
  const decision = orchestratorResponse.data as EnhancedOrchestratorDecision;

  console.log(`🧠 Orchestrator decision:`, {
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

  // Save conversation to database
  const serializedState = serializeDynamicState(state);
  
  if (isNewConversation) {
    await prisma.conversation.create({
      data: {
        id: state.id,
        userId,
        version: 'v2',
        messages: state.messages as unknown as object[],
        phase: mapPhaseToEnum(state.phase),
        agentState: serializedState as object,
        schemaDesigns: state.schemas as unknown as object[],
        layoutDesigns: state.layout ? [state.layout] as unknown as object[] : [],
        refinementHistory: state.refinementHistory as unknown as object[],
      },
    });
  } else {
    await prisma.conversation.update({
      where: { id: state.id },
      data: {
        messages: state.messages as unknown as object[],
        phase: mapPhaseToEnum(state.phase),
        agentState: serializedState as object,
        schemaDesigns: state.schemas as unknown as object[],
        layoutDesigns: state.layout ? [state.layout] as unknown as object[] : [],
        refinementHistory: state.refinementHistory as unknown as object[],
        updatedAt: new Date(),
      },
    });
  }

  console.log(`✅ V2 Dynamic Chat complete`);
  console.log(`   Readiness: schema=${state.readiness.schema}%, ui=${state.readiness.ui}%, overall=${state.readiness.overall}%`);
  console.log(`   Phase: ${state.phase}`);

  return NextResponse.json({
    conversationId: state.id,
    messages: state.messages,
    state: {
      phase: state.phase,
      schemas: state.schemas,
      layout: state.layout,
      intent: state.intent,
      suggestedAppName: state.suggestedAppName,
      // Dynamic pipeline additions
      readiness: state.readiness,
      enhancedIntent: state.enhancedIntent,
      currentProposals: state.currentProposals,
      suggestions: state.suggestions,
    },
    requiresUserInput: orchestratorResponse.requiresUserInput ?? true,
    suggestedActions: orchestratorResponse.suggestedActions,
  });
}

/**
 * Execute parallel pipeline based on orchestrator decision
 */
async function executeParallelPipeline(
  decision: EnhancedOrchestratorDecision,
  state: DynamicConversationState,
  userMessage: string
): Promise<{ message: string; updatedState: DynamicConversationState }> {
  let updatedState = state;
  const messages: string[] = [];

  // Build agent map
  const agents: Record<string, BaseAgent> = {
    intent: intentEngine,
    schema: schemaDesignerAgent,
    ui: uiDesignerAgent,
    workflow: workflowAgent,
    code: codeGeneratorAgent,
  };

  // Group actions by dependency level for parallel execution
  const actionGroups = groupActionsByDependency(decision.parallelActions);

  for (const group of actionGroups) {
    // Execute all actions in this group in parallel
    const results = await Promise.all(
      group.map(async (action) => {
        const agent = agents[action.agent];
        if (!agent) {
          console.log(`⚠️ Agent not found: ${action.agent}`);
          return null;
        }

        console.log(`🔄 Executing: ${action.agent}.${action.action}`);
        const startTime = Date.now();

        try {
          const result = await agent.process(userMessage, updatedState);
          console.log(`✅ ${action.agent}.${action.action} completed in ${Date.now() - startTime}ms`);
          return { action, result };
        } catch (error) {
          console.error(`❌ ${action.agent}.${action.action} failed:`, error);
          return null;
        }
      })
    );

    // Merge results into state
    for (const res of results) {
      if (!res || !res.result.success) continue;

      const { action, result } = res;
      const data = result.data as Record<string, unknown> | undefined;

      // Handle intent extraction
      if (action.agent === 'intent' && data?.intent) {
        const intent = data.intent as EnhancedIntent;
        updatedState = setEnhancedIntent(updatedState, intent);
        
        // Generate proposals if this is a new request
        if (decision.generateProposals && !updatedState.currentProposals) {
          const proposals = await proposalEngine.generateProposals(intent, updatedState);
          updatedState = {
            ...updatedState,
            currentProposals: proposals,
          };
        }
        
        // Use smart schema if generated
        if (data.defaultSchema) {
          updatedState = updateConversationState(updatedState, {
            schemas: data.defaultSchema as Schema[],
          }) as DynamicConversationState;
        }
        
        if (data.suggestions) {
          updatedState = setSuggestions(updatedState, data.suggestions as DynamicConversationState['suggestions']);
        }
      }

      // Handle schema proposals
      if (action.agent === 'schema' && data?.schemas) {
        const schemas = data.schemas as Schema[];
        updatedState = updateConversationState(updatedState, {
          schemas,
          suggestedAppName: (data as { suggestedName?: string }).suggestedName || updatedState.suggestedAppName,
        }) as DynamicConversationState;
        
        // Update readiness
        updatedState = updateReadiness(updatedState, {
          schema: Math.min(100, updatedState.readiness.schema + 40),
        });
      }

      // Handle UI proposals
      if (action.agent === 'ui' && data?.layout) {
        const layout = data.layout as LayoutNode;
        updatedState = updateConversationState(updatedState, {
          layout,
        }) as DynamicConversationState;
        
        // Update readiness
        updatedState = updateReadiness(updatedState, {
          ui: Math.min(100, updatedState.readiness.ui + 40),
        });

        // Generate mockup for the layout
        if (updatedState.schemas.length > 0) {
          const mockup = mockupGenerator.generateSVG(
            layout,
            updatedState.schemas[0],
            updatedState.suggestedAppName
          );
          // Mockup is attached to layout for display
        }
      }

      // Handle workflow analysis
      if (action.agent === 'workflow' && data?.workflows) {
        updatedState = {
          ...updatedState,
          workflows: data.workflows as DynamicConversationState['workflows'],
        };
        
        // Update readiness
        updatedState = updateReadiness(updatedState, {
          workflow: Math.min(100, updatedState.readiness.workflow + 30),
        });
      }

      // Collect messages
      if (result.message) {
        messages.push(result.message);
      }
    }
  }

  // Combine messages intelligently
  const combinedMessage = combineAgentMessages(messages, updatedState, decision);

  return {
    message: combinedMessage || decision.userMessage || decision.reasoning,
    updatedState,
  };
}

/**
 * Group actions by dependency level for parallel execution
 */
function groupActionsByDependency(
  actions: EnhancedOrchestratorDecision['parallelActions']
): EnhancedOrchestratorDecision['parallelActions'][] {
  const groups: EnhancedOrchestratorDecision['parallelActions'][] = [];
  const completed = new Set<string>();
  const pending = [...actions];

  while (pending.length > 0) {
    // Find actions with satisfied dependencies
    const runnable = pending.filter(action => {
      if (!action.dependsOn || action.dependsOn.length === 0) return true;
      return action.dependsOn.every(dep => completed.has(dep));
    });

    if (runnable.length === 0) {
      // Deadlock - just run remaining actions
      groups.push(pending);
      break;
    }

    groups.push(runnable);

    // Mark as completed and remove from pending
    for (const action of runnable) {
      completed.add(action.id);
      const idx = pending.indexOf(action);
      if (idx >= 0) pending.splice(idx, 1);
    }
  }

  return groups;
}

/**
 * Combine messages from multiple agents into a coherent response
 */
function combineAgentMessages(
  messages: string[],
  state: DynamicConversationState,
  decision: EnhancedOrchestratorDecision
): string {
  if (messages.length === 0) {
    // Generate default message based on state
    if (state.currentProposals) {
      return `I've designed ${state.currentProposals.proposals.length} approaches for your app. Take a look at the options above and pick the one that works best for you!`;
    }
    if (state.readiness.overall >= 80) {
      return `Your app is looking great! You can build it now, or let me know if you'd like to make any changes.`;
    }
    return decision.userMessage || `I'm ready to help. What would you like to do next?`;
  }

  if (messages.length === 1) {
    return messages[0];
  }

  // Combine multiple messages
  // Filter out duplicates and very short messages
  const uniqueMessages = Array.from(new Set(messages)).filter(m => m.length > 20);
  
  if (uniqueMessages.length === 1) {
    return uniqueMessages[0];
  }

  // Take the most substantive message
  const sorted = uniqueMessages.sort((a, b) => b.length - a.length);
  return sorted[0];
}

/**
 * Handle proposal selection
 */
async function handleSelectProposal(
  userId: string,
  conversationId: string,
  proposalId: string
): Promise<NextResponse> {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId, version: 'v2' },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  let state = ensureDynamicState(
    deserializeDynamicState(conversation.agentState as object || createDynamicConversationState())
  );

  // Find the selected proposal
  if (!state.currentProposals) {
    return NextResponse.json({ error: 'No proposals available' }, { status: 400 });
  }

  const proposal = state.currentProposals.proposals.find(p => p.id === proposalId);
  if (!proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  // Apply the selected proposal
  state = {
    ...state,
    schemas: proposal.schema,
    layout: proposal.layout,
    selectedProposalId: proposalId,
  };

  // Update readiness based on proposal
  state = updateReadiness(state, {
    schema: 80,
    ui: 80,
    workflow: proposal.workflows?.length ? 70 : 50,
  });

  // Clear proposals after selection
  state = {
    ...state,
    currentProposals: undefined,
  };

  // Add message about selection
  state = addMessageToState(
    state,
    'assistant',
    `Great choice! I've applied the **${proposal.name}** design.\n\n${proposal.description}\n\nYou can now:\n- Make refinements ("add a priority field")\n- Build the app ("build it")\n- Or tell me what else you'd like to change`,
    { phase: state.phase }
  ) as DynamicConversationState;

  // Save state
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      agentState: serializeDynamicState(state) as object,
      schemaDesigns: state.schemas as unknown as object[],
      layoutDesigns: state.layout ? [state.layout] as unknown as object[] : [],
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    conversationId: state.id,
    messages: state.messages,
    state: {
      phase: state.phase,
      schemas: state.schemas,
      layout: state.layout,
      readiness: state.readiness,
      suggestedAppName: state.suggestedAppName,
    },
  });
}

/**
 * Generate assistant response based on orchestrator decision
 * Integrates with specialized agents for schema, UI, and code generation
 * @deprecated Use executeParallelPipeline instead for dynamic pipeline
 */
async function generateAssistantResponse(
  decision: OrchestratorDecision,
  state: ConversationState,
  userMessage: string
): Promise<{ message: string; updatedState: ConversationState }> {
  const { nextAction } = decision;
  let updatedState = state;

  // Route to Schema Designer Agent
  if (nextAction.agent === 'schema') {
    if (nextAction.action === 'propose' && state.schemas.length === 0) {
      // Propose new schema
      const schemaResponse = await schemaDesignerAgent.proposeSchema(userMessage, state);
      
      if (schemaResponse.success && schemaResponse.data) {
        const proposal = schemaResponse.data as { schemas: Schema[]; suggestedName: string; domain: string };
        updatedState = updateConversationState(state, {
          schemas: proposal.schemas,
          suggestedAppName: proposal.suggestedName,
          intent: {
            domain: proposal.domain,
            description: userMessage,
            userGoals: [],
            entities: [],
          },
          phase: 'schema',
        });
      }
      
      return { 
        message: schemaResponse.message, 
        updatedState 
      };
    }
    
    if (nextAction.action === 'refine') {
      const schemaResponse = await schemaDesignerAgent.refineSchema(userMessage, state);
      
      if (schemaResponse.success && schemaResponse.data) {
        const proposal = schemaResponse.data as { schemas: Schema[] };
        updatedState = updateConversationState(state, {
          schemas: proposal.schemas,
        });
        
        // Track refinement
        updatedState = addRefinementEntry(updatedState, {
          phase: 'schema',
          userFeedback: userMessage,
          agentResponse: schemaResponse.message,
          changes: [],
        });
      }
      
      return { 
        message: schemaResponse.message, 
        updatedState 
      };
    }
    
    if (nextAction.action === 'extend') {
      const schemaResponse = await schemaDesignerAgent.extendSchema(userMessage, state);
      
      if (schemaResponse.success && schemaResponse.data) {
        const proposal = schemaResponse.data as { schemas: Schema[] };
        updatedState = updateConversationState(state, {
          schemas: proposal.schemas,
        });
      }
      
      return { 
        message: schemaResponse.message, 
        updatedState 
      };
    }
  }

  // Route to UI Designer Agent
  if (nextAction.agent === 'ui') {
    if (nextAction.action === 'propose') {
      const uiResponse = await uiDesignerAgent.proposeLayout(userMessage, state);
      
      if (uiResponse.success && uiResponse.data) {
        const proposal = uiResponse.data as { layout: LayoutNode };
        updatedState = updateConversationState(state, {
          layout: proposal.layout,
          phase: 'ui',
        });
      }
      
      return { 
        message: uiResponse.message, 
        updatedState 
      };
    }
    
    if (nextAction.action === 'refine') {
      const uiResponse = await uiDesignerAgent.refineLayout(userMessage, state);
      
      if (uiResponse.success && uiResponse.data) {
        const proposal = uiResponse.data as { layout: LayoutNode };
        updatedState = updateConversationState(state, {
          layout: proposal.layout,
        });
        
        // Track refinement
        updatedState = addRefinementEntry(updatedState, {
          phase: 'ui',
          userFeedback: userMessage,
          agentResponse: uiResponse.message,
          changes: [],
        });
      }
      
      return { 
        message: uiResponse.message, 
        updatedState 
      };
    }
  }

  // Route to Code Generator Agent
  if (nextAction.agent === 'code') {
    if (nextAction.action === 'generate') {
      updatedState = updateConversationState(state, {
        phase: 'code',
      });
      
      return {
        message: `Perfect! I'll now generate the code for your app.

This will include:
- TypeScript types for your data
- Form component with validation
- Table component with sorting
- API routes for data operations

The code will appear in the preview panel as it's generated.

Click **Build App** when you're ready to finalize!`,
        updatedState,
      };
    }
    
    if (nextAction.action === 'finalize') {
      updatedState = updateConversationState(state, {
        phase: 'complete',
      });
      
      return {
        message: `🎉 Your app is ready to be built!

Click the **Build App** button to create your app.`,
        updatedState,
      };
    }
  }

  // For approval - determine transition
  if (decision.phaseTransition) {
    switch (decision.phaseTransition) {
      case 'schema':
        // Trigger schema proposal
        const schemaResponse = await schemaDesignerAgent.proposeSchema(userMessage, state);
        
        if (schemaResponse.success && schemaResponse.data) {
          const proposal = schemaResponse.data as { schemas: Schema[]; suggestedName: string; domain: string };
          updatedState = updateConversationState(state, {
            schemas: proposal.schemas,
            suggestedAppName: proposal.suggestedName,
            intent: {
              domain: proposal.domain,
              description: userMessage,
              userGoals: [],
              entities: [],
            },
            phase: 'schema',
          });
        }
        
        return { 
          message: schemaResponse.message, 
          updatedState 
        };

      case 'ui':
        const uiResponse = await uiDesignerAgent.proposeLayout('', state);
        
        if (uiResponse.success && uiResponse.data) {
          const proposal = uiResponse.data as { layout: LayoutNode };
          updatedState = updateConversationState(state, {
            layout: proposal.layout,
            phase: 'ui',
          });
        }
        
        return { 
          message: uiResponse.message, 
          updatedState 
        };
      
      case 'code':
        updatedState = updateConversationState(state, {
          phase: 'code',
        });
        
        return {
          message: `Perfect! I'll now generate the code for your app.

This will include:
- TypeScript types for your data
- Form component with validation
- Table component with sorting
- API routes for data operations

The code will appear in the preview panel as it's generated.

Click **Build App** when you're ready to finalize!`,
          updatedState,
        };
      
      case 'complete':
        updatedState = updateConversationState(state, {
          phase: 'complete',
        });
        
        return {
          message: `🎉 Your app is ready to be built!

Click the **Build App** button to create your app.`,
          updatedState,
        };
    }
  }

  // For clarification
  if (nextAction.action === 'clarify') {
    return {
      message: `I'd be happy to help clarify! ${decision.reasoning}

Feel free to ask any questions about:
- The data fields and their types
- The layout and components
- How the app will work`,
      updatedState,
    };
  }

  // Default response
  return {
    message: decision.reasoning || "I'm ready to help you build your app. What would you like to do next?",
    updatedState,
  };
}

/**
 * Handle finalize action
 */
async function handleFinalize(
  userId: string,
  conversationId: string
): Promise<NextResponse> {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId, version: 'v2' },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  const state = deserializeState(conversation.agentState as object || {});

  // Validate state is ready for finalization
  if (state.schemas.length === 0) {
    return NextResponse.json(
      { error: 'No schema defined. Please complete the design first.' },
      { status: 400 }
    );
  }

  // Create the app
  const app = await prisma.app.create({
    data: {
      userId,
      name: state.suggestedAppName || 'My App',
      description: state.intent?.description || 'Generated with Scaffolder V2',
      version: 'v2',
      spec: state.schemas[0] as unknown as object,
      config: {
        layout: state.layout,
        components: state.componentSpecs,
      },
      data: [],
      status: 'GENERATING',
      buildStatus: 'GENERATING',
      layoutDefinition: state.layout as unknown as object,
    },
  });

  // Update conversation with app reference
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      appId: app.id,
      phase: 'COMPLETE',
    },
  });

  console.log(`✅ V2 App created: ${app.id}`);

  return NextResponse.json({
    success: true,
    appId: app.id,
    appUrl: `/apps/${app.id}`,
    message: 'App created successfully! Code generation will begin shortly.',
  });
}

/**
 * Handle undo action
 */
async function handleUndo(
  userId: string,
  conversationId: string
): Promise<NextResponse> {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId, version: 'v2' },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  let state = deserializeState(conversation.agentState as object || createConversationState());

  // Check if there's anything to undo
  if (state.refinementHistory.length === 0) {
    return NextResponse.json({
      success: false,
      message: 'Nothing to undo.',
      state: {
        phase: state.phase,
        schemas: state.schemas,
        layout: state.layout,
      },
    });
  }

  // Remove the last refinement
  const lastRefinement = state.refinementHistory[state.refinementHistory.length - 1];
  state = updateConversationState(state, {
    refinementHistory: state.refinementHistory.slice(0, -1),
  });

  // Add undo message
  state = addMessageToState(state, 'system', `Undid: ${lastRefinement.userFeedback}`);

  // Save updated state
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      agentState: serializeState(state) as object,
      refinementHistory: state.refinementHistory as unknown as object[],
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    message: 'Undid the last change.',
    state: {
      phase: state.phase,
      schemas: state.schemas,
      layout: state.layout,
    },
  });
}

/**
 * Map v2 phase to database enum
 */
function mapPhaseToEnum(phase: string): 'PARSE' | 'PROBE' | 'PICTURE' | 'PLAN' | 'COMPLETE' {
  const mapping: Record<string, 'PARSE' | 'PROBE' | 'PICTURE' | 'PLAN' | 'COMPLETE'> = {
    'intent': 'PARSE',
    'schema': 'PROBE',
    'ui': 'PICTURE',
    'code': 'PLAN',
    'preview': 'PLAN',
    'refinement': 'PLAN',
    'complete': 'COMPLETE',
  };
  return mapping[phase] || 'PARSE';
}

/**
 * GET /api/scaffolder-v2
 * Get conversation state
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      // Return all v2 conversations for user
      const conversations = await prisma.conversation.findMany({
        where: { userId: session.user.id, version: 'v2' },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      });

      return NextResponse.json({ conversations });
    }

    // Return specific conversation
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: session.user.id, version: 'v2' },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const state = deserializeState(conversation.agentState as object || createConversationState());

    return NextResponse.json({
      conversationId: conversation.id,
      messages: state.messages,
      state: {
        phase: state.phase,
        schemas: state.schemas,
        layout: state.layout,
        intent: state.intent,
        suggestedAppName: state.suggestedAppName,
      },
    });
  } catch (error) {
    console.error('❌ V2 Scaffolder GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
