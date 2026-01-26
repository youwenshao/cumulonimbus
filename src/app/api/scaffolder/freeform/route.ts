/**
 * Freeform Scaffolder API
 * Autonomous conversational app building with real-time streaming
 * Uses dual-agent system (Architect + Advisor) for refined responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { generateId } from '@/lib/utils';
import {
  createFreeformState,
  addMessage,
  updateStateWithAnalysis,
  analyzeConversation,
  convertSpecToProjectSpec,
  type FreeformState,
  type GeneratedSpec,
} from '@/lib/scaffolder/freeform-architect';
import {
  orchestrateDualAgent,
  type DualAgentTurn,
} from '@/lib/scaffolder/dual-agent-orchestrator';
import { generateAppCode, generateFallbackCode, type GeneratedCode } from '@/lib/scaffolder/code-generator';
import { CodeGeneratorAgent } from '@/lib/scaffolder-v2/agents/code-generator';
import type { Schema, LayoutNode, FieldDefinition, FieldType } from '@/lib/scaffolder-v2/types';
import { specToPrimitives, validateSpec } from '@/lib/scaffolder/compiler';
import type { UserLLMSettings, LLMProvider } from '@/lib/llm';
import { enhanceUserSettingsWithApiKeys } from '@/lib/llm';

const encoder = new TextEncoder();

/**
 * Convert Freeform GeneratedSpec to V2 Schema format
 */
function convertToV2Schema(spec: GeneratedSpec): Schema {
  const mapFieldTypeToV2 = (type: string): FieldType => {
    const typeMap: Record<string, FieldType> = {
      string: 'string',
      number: 'number',
      boolean: 'boolean',
      date: 'date',
      enum: 'enum',
      relation: 'string', // Simplified for now
    };
    return typeMap[type] || 'string';
  };

  // Combine all entity fields into a single schema
  const allFields: FieldDefinition[] = [];
  
  for (const entity of spec.entities) {
    for (const field of entity.fields) {
      allFields.push({
        name: field.name,
        label: field.name.charAt(0).toUpperCase() + field.name.slice(1).replace(/([A-Z])/g, ' $1'),
        type: mapFieldTypeToV2(field.type),
        required: field.required ?? false,
        options: field.enumValues,
        placeholder: `Enter ${field.name}...`,
      });
    }
  }

  // Add standard ID and timestamp fields
  const hasIdField = allFields.some(f => f.name === 'id');
  if (!hasIdField) {
    allFields.unshift({
      name: 'id',
      label: 'ID',
      type: 'string',
      required: true,
      generated: true,
      primaryKey: true,
    });
  }

  const hasCreatedAt = allFields.some(f => f.name === 'createdAt');
  if (!hasCreatedAt) {
    allFields.push({
      name: 'createdAt',
      label: 'Created At',
      type: 'datetime',
      required: true,
      generated: true,
    });
  }

  return {
    name: spec.entities[0]?.name || 'Item',
    label: spec.entities[0]?.name || 'Items',
    description: spec.description,
    fields: allFields,
  };
}

/**
 * Create a default layout from spec views
 */
function createDefaultLayout(spec: GeneratedSpec, schemaName: string): LayoutNode {
  const componentChildren: LayoutNode[] = [];

  // Add form component
  componentChildren.push({
    id: 'form-section',
    type: 'component',
    component: {
      type: 'form',
      props: {
        schemaName,
        submitLabel: 'Add Entry',
      },
    },
  });

  // Add views based on spec
  for (const view of spec.views) {
    componentChildren.push({
      id: `${view.type}-${view.title.toLowerCase().replace(/\s+/g, '-')}`,
      type: 'component',
      component: {
        type: view.type as any,
        variant: 'default',
        props: {
          schemaName,
          title: view.title,
        },
      },
    });
  }

  // If no specific views, add a table
  if (componentChildren.length === 1) {
    componentChildren.push({
      id: 'data-table',
      type: 'component',
      component: {
        type: 'table',
        props: {
          schemaName,
          title: 'All Data',
          sortable: true,
          deletable: true,
        },
      },
    });
  }

  return {
    id: 'root',
    type: 'container',
    container: {
      direction: 'column',
      gap: '1.5rem',
      padding: '2rem',
      children: componentChildren,
    },
  };
}

/**
 * Validate generated code for basic syntax issues
 * Returns error message if invalid, null if valid
 */
function validateCodeSyntax(code: string): string | null {
  if (!code || code.length < 100) {
    return 'Code is too short or empty';
  }

  // Check for unmatched string literals (common LLM issue)
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Count quotes (excluding escaped ones)
    const singleQuotes = (line.match(/(?<!\\)'/g) || []).length;
    const doubleQuotes = (line.match(/(?<!\\)"/g) || []).length;
    const backticks = (line.match(/(?<!\\)`/g) || []).length;
    
    // Check for odd number of quotes (potential unterminated string)
    // This is a heuristic - template literals can span lines
    if (singleQuotes % 2 !== 0 && !line.includes('`')) {
      // Check if it's a JSX attribute or intentional
      if (!line.match(/className=|style=|href=|src=|alt=/)) {
        return `Possible unterminated string at line ${i + 1}`;
      }
    }
  }

  // Check for basic structure issues
  const openBraces = (code.match(/\{/g) || []).length;
  const closeBraces = (code.match(/\}/g) || []).length;
  if (Math.abs(openBraces - closeBraces) > 2) {
    return `Mismatched braces: ${openBraces} open, ${closeBraces} close`;
  }

  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;
  if (Math.abs(openParens - closeParens) > 2) {
    return `Mismatched parentheses: ${openParens} open, ${closeParens} close`;
  }

  // Check for common incomplete code patterns
  if (code.endsWith('const ') || code.endsWith('let ') || code.endsWith('function ')) {
    return 'Code appears to be truncated';
  }

  // Check for export default (required for component)
  if (!code.includes('export default') && !code.includes('export {')) {
    return 'No default export found';
  }

  return null; // Code passes basic validation
}

/**
 * POST /api/scaffolder/freeform
 * Handles both regular messages and streaming responses
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, conversationId, message } = body;

    console.log('\n🚀 === Freeform Scaffolder Request ===');
    console.log(`📋 Action: ${action}`);
    console.log(`💬 Message: "${message?.substring(0, 100)}..."`);
    console.log(`🔑 ConversationId: ${conversationId || 'new'}`);

    // Get user LLM settings including API keys
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
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
      provider: (user.preferredLLMProvider as LLMProvider) || undefined,
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

    switch (action) {
      case 'chat':
        return handleChat(session.user.id, conversationId, message, userSettings);
      
      case 'stream':
        return handleStreamingChat(session.user.id, conversationId, message, userSettings);
      
      case 'build':
        return handleBuild(session.user.id, conversationId);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ Freeform Scaffolder error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Handle a chat message with streaming response using dual-agent system
 */
async function handleStreamingChat(
  userId: string,
  conversationId: string | undefined,
  message: string,
  userSettings?: UserLLMSettings
): Promise<Response> {
  // Load or create state
  let state: FreeformState;
  let isNewConversation = false;

  if (conversationId) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (conversation) {
      state = JSON.parse(conversation.spec as string) as FreeformState;
    } else {
      state = createFreeformState();
      isNewConversation = true;
    }
  } else {
    state = createFreeformState();
    isNewConversation = true;
  }

  // Add user message to state
  state = addMessage(state, 'user', message);

  // Create streaming response using dual-agent orchestrator
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let fullResponse = '';
        let analysis = null;
        let internalDialogue: DualAgentTurn[] = [];
        let iterations = 0;
        let finalConfidence = 0;

        console.log(`🎬 Starting dual-agent orchestration for state.id: ${state.id}`);
        
        // Run dual-agent orchestration
        for await (const event of orchestrateDualAgent(message, state, userSettings)) {
          if (event.type === 'thinking') {
            // Stream live thinking events for real-time UI updates
            const thinkingData = {
              type: 'thinking',
              agent: event.agent,
              content: event.content,
              iteration: event.iteration,
              isStreaming: event.isStreaming,
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(thinkingData)}\n\n`));
          } else if (event.type === 'internal') {
            // Stream internal dialogue events (complete turn)
            const internalData = {
              type: 'internal',
              agent: event.agent,
              content: event.content,
              confidence: event.confidence,
              decision: event.decision,
              iteration: event.iteration,
              answeredQuestions: event.answeredQuestions,
              decisions: event.decisions,
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(internalData)}\n\n`));
          } else if (event.type === 'chunk') {
            // Stream final response chunks
            fullResponse += event.content;
            const data = { type: 'chunk', content: event.content };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } else if (event.type === 'analysis') {
            analysis = event.analysis;
          } else if (event.type === 'done') {
            internalDialogue = event.result.internalDialogue;
            iterations = event.result.iterations;
            finalConfidence = event.result.finalConfidence;
            if (!analysis) {
              analysis = event.result.analysis;
            }
          }
        }

        console.log(`✅ Orchestration loop completed. fullResponse length: ${fullResponse.length}`);
        
        // Update state with analysis
        if (analysis) {
          state = updateStateWithAnalysis(state, analysis);
          state = addMessage(state, 'assistant', fullResponse, {
            readinessScore: analysis.readinessScore,
            entities: analysis.entities,
            spec: analysis.spec,
          });
        } else {
          state = addMessage(state, 'assistant', fullResponse);
        }

        // Save conversation to database
        // IMPORTANT: We must save BEFORE sending the done event, and use the database-generated ID
        const originalStateId = state.id; // Keep for logging
        console.log(`💾 Saving conversation - isNew: ${isNewConversation}, userId: ${userId}, state.id before save: ${originalStateId}`);
        
        let savedConversationId: string;
        try {
          if (isNewConversation) {
            const newConversation = await prisma.conversation.create({
              data: {
                userId,
                messages: JSON.stringify(state.messages),
                phase: state.phase.toUpperCase() as 'PROBE' | 'PICTURE' | 'PLAN' | 'COMPLETE',
                spec: JSON.stringify(state),
              },
            });
            savedConversationId = newConversation.id;
            state.id = newConversation.id;
            console.log(`✅ New conversation created with database ID: ${newConversation.id}`);
            console.log(`✅ Note: Original generateId() was: ${originalStateId}`);
          } else {
            // For existing conversations, use the provided conversationId
            savedConversationId = conversationId!;
            await prisma.conversation.update({
              where: { id: conversationId },
              data: {
                messages: JSON.stringify(state.messages),
                phase: state.phase.toUpperCase() as 'PROBE' | 'PICTURE' | 'PLAN' | 'COMPLETE',
                spec: JSON.stringify(state),
              },
            });
            console.log(`✅ Conversation updated: ${conversationId}`);
          }
          
          // Verify the save worked
          const verify = await prisma.conversation.findUnique({
            where: { id: savedConversationId },
            select: { id: true },
          });
          if (!verify) {
            throw new Error(`Verification failed: conversation ${savedConversationId} not found after save`);
          }
          console.log(`✅ Verified conversation exists in database: ${savedConversationId}`);
          
        } catch (saveError) {
          console.error(`❌ Failed to save conversation:`, saveError);
          // Send error event - do NOT send a conversationId that doesn't exist
          const errorData = { type: 'error', error: 'Failed to save conversation' };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
          controller.close();
          return;
        }

        console.log(`📤 Sending done event with conversationId: ${savedConversationId}`);
        
        // Send final state with internal dialogue for debugging
        // CRITICAL: Use savedConversationId (the verified database ID), not state.id
        const finalData = {
          type: 'done',
          conversationId: savedConversationId,
          readinessScore: state.readinessScore,
          // Allow build if: phase is ready, OR readinessScore >= 80, OR Advisor approved (finalConfidence >= 70)
          canBuild: state.phase === 'ready' || state.readinessScore >= 80 || finalConfidence >= 70,
          entities: state.entities,
          // Include dual-agent metadata
          iterations,
          confidence: finalConfidence,
          internalDialogue: internalDialogue.map(turn => ({
            id: turn.id,
            agent: turn.agent,
            content: turn.content,
            timestamp: turn.timestamp.toISOString(),
            metadata: turn.metadata,
          })),
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalData)}\n\n`));
        controller.close();

      } catch (error) {
        console.error('❌ Streaming error:', error);
        console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
        const errorData = { type: 'error', error: 'Failed to generate response' };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

/**
 * Handle a chat message without streaming (for compatibility)
 */
async function handleChat(
  userId: string,
  conversationId: string | undefined,
  message: string,
  userSettings?: UserLLMSettings
): Promise<NextResponse> {
  // Load or create state
  let state: FreeformState;
  let isNewConversation = false;

  if (conversationId) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (conversation) {
      state = JSON.parse(conversation.spec as string) as FreeformState;
    } else {
      state = createFreeformState();
      isNewConversation = true;
    }
  } else {
    state = createFreeformState();
    isNewConversation = true;
  }

  // Add user message to state
  state = addMessage(state, 'user', message);

  // Get analysis from architect
  const analysis = await analyzeConversation(message, state, userSettings);

  // Update state
  state = updateStateWithAnalysis(state, analysis);
  state = addMessage(state, 'assistant', analysis.responseMessage, {
    readinessScore: analysis.readinessScore,
    entities: analysis.entities,
    spec: analysis.spec,
  });

  // Save conversation to database
  if (isNewConversation) {
    const newConversation = await prisma.conversation.create({
      data: {
        userId,
        messages: JSON.stringify(state.messages),
        phase: state.phase.toUpperCase() as 'PROBE' | 'PICTURE' | 'PLAN' | 'COMPLETE',
        spec: JSON.stringify(state),
      },
    });
    state.id = newConversation.id;
  } else {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        messages: JSON.stringify(state.messages),
        phase: state.phase.toUpperCase() as 'PROBE' | 'PICTURE' | 'PLAN' | 'COMPLETE',
        spec: JSON.stringify(state),
      },
    });
  }

  return NextResponse.json({
    conversationId: state.id,
    message: analysis.responseMessage,
    readinessScore: state.readinessScore,
    // Note: Non-streaming mode doesn't have Advisor confidence, so only check readinessScore and phase
    canBuild: state.phase === 'ready' || state.readinessScore >= 80,
    entities: state.entities,
    messages: state.messages,
  });
}

/**
 * Handle building the app when ready
 */
async function handleBuild(
  userId: string,
  conversationId: string
): Promise<NextResponse> {
  console.log('\n🏗️ === Freeform Build ===');
  console.log(`🔑 ConversationId: ${conversationId}`);
  console.log(`🔐 UserId: ${userId}`);

  // Try to find conversation with retry (handles race conditions)
  let conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  });

  // Retry once after a short delay if not found (handles timing issues)
  if (!conversation) {
    console.log(`⏳ Conversation not found on first try, retrying in 500ms...`);
    await new Promise(resolve => setTimeout(resolve, 500));
    conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });
  }

  // Debug: Check if conversation exists at all (ignoring userId)
  if (!conversation) {
    const existsAnyUser = await prisma.conversation.count({
      where: { id: conversationId },
    });
    console.log(`📊 Conversation exists (any user): ${existsAnyUser > 0}`);
    
    if (existsAnyUser > 0) {
      // Conversation exists but belongs to different user
      const conv = await prisma.conversation.findFirst({
        where: { id: conversationId },
        select: { userId: true },
      });
      console.log(`📊 Conversation belongs to userId: ${conv?.userId}`);
      console.log(`📊 Request userId: ${userId}`);
      console.log(`❌ UserId mismatch!`);
    } else {
      console.log(`❌ Conversation does not exist in database at all`);
      
      // List recent conversations for this user to help debug
      const recentConvs = await prisma.conversation.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { id: true, createdAt: true },
      });
      console.log(`📊 Recent conversations for this user:`, recentConvs.map(c => c.id));
    }
    
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }
  
  console.log(`✅ Conversation found!`);

  const state = JSON.parse(conversation.spec as string) as FreeformState;

  console.log(`📊 Debug - state.spec exists: ${!!state.spec}`);
  if (state.spec) {
    console.log(`📊 Debug - spec.name: "${state.spec.name}"`);
    console.log(`📊 Debug - spec.entities: ${state.spec.entities?.length || 0} entities`);
    console.log(`📊 Debug - spec.views: ${state.spec.views?.length || 0} views`);
    if (state.spec.entities?.length > 0) {
      console.log(`📊 Debug - first entity: ${state.spec.entities[0].name} with ${state.spec.entities[0].fields?.length || 0} fields`);
    }
  } else {
    console.log(`📊 Debug - state.entities fallback: ${state.entities?.length || 0} entities`);
    console.log(`📊 Debug - state.readinessScore: ${state.readinessScore}`);
    console.log(`📊 Debug - state.phase: ${state.phase}`);
  }

  // If spec is missing but we have entities, generate a fallback spec
  if (!state.spec && state.entities && state.entities.length > 0) {
    console.log(`🔧 Generating fallback spec from ${state.entities.length} entities`);
    
    const primaryEntity = state.entities[0];
    const appName = primaryEntity.name || 'My App';
    
    // Get description from last assistant message if available
    const lastMessage = state.messages
      ?.filter(m => m.role === 'assistant')
      .pop();
    const description = lastMessage?.content?.substring(0, 200) || 'A new application';
    
    state.spec = {
      name: appName,
      description,
      entities: state.entities,
      views: [
        {
          type: 'table',
          title: `All ${appName}s`,
          entityName: primaryEntity.name
        }
      ],
      category: 'Productivity'
    };
    
    console.log(`✅ Generated fallback spec: ${state.spec.name}`);
  }

  if (!state.spec) {
    console.error(`❌ Build failed: No spec or entities available in conversation state`);
    return NextResponse.json({ error: 'No spec available - continue the conversation first' }, { status: 400 });
  }

  // Convert to project spec format
  const projectSpec = convertSpecToProjectSpec(state.spec);
  
  console.log(`📊 Debug - projectSpec.dataStore.fields: ${projectSpec.dataStore?.fields?.length || 0} fields`);
  console.log(`📊 Debug - projectSpec.views: ${projectSpec.views?.length || 0} views`);

  // Validate spec
  const validation = validateSpec(projectSpec as any);
  if (!validation.valid) {
    console.error(`❌ Build failed: Spec validation failed`);
    console.error(`📊 Validation errors:`, validation.errors);
    return NextResponse.json({ 
      error: 'Spec validation failed', 
      details: validation.errors 
    }, { status: 400 });
  }

  // Generate app config directly from projectSpec (Freeform mode doesn't use question/answer flow)
  const primitives = specToPrimitives(projectSpec as any);
  const appConfig = {
    id: generateId(),
    name: projectSpec.name,
    description: projectSpec.description,
    spec: projectSpec,
    primitives,
    createdAt: new Date(),
  };

  // Create the app in database
  const subdomain = `${state.spec.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${generateId().substring(0, 4)}`;

  const app = await prisma.app.create({
    data: {
      userId,
      name: state.spec.name,
      description: state.spec.description,
      spec: JSON.stringify(projectSpec),
      config: JSON.stringify(appConfig),
      data: JSON.stringify([]),
      status: 'GENERATING',
      buildStatus: 'GENERATING',
      subdomain,
      version: 'v1', // Explicitly set to v1 for Freeform apps
    },
  });

  console.log(`📝 App record created with ID: ${app.id}`);

  // Generate code using V2 Code Generator for better quality
  let generatedCode: GeneratedCode = {
    pageComponent: '',
    types: '',
  };
  const allComponents: Record<string, string> = {};
  let codeGenerationSuccess = false;

  try {
    console.log('🚀 Using V2 Code Generator for enhanced output...');
    
    // Convert to V2 Schema format (optimize by doing this only once)
    const v2Schema = convertToV2Schema(state.spec);
    const layout = createDefaultLayout(state.spec, v2Schema.name);
    
    console.log(`📐 V2 Schema: ${v2Schema.name} with ${v2Schema.fields.length} fields`);
    
    // Use V2 CodeGeneratorAgent
    const codeGenAgent = new CodeGeneratorAgent();
    let hadError = false;
    
    try {
      for await (const event of codeGenAgent.generateAppIncremental(v2Schema, layout, app.id)) {
        if (event.type === 'types' && event.code) {
          generatedCode.types = event.code;
          allComponents['lib/types.ts'] = event.code;
          console.log(`  ✓ Generated types (${event.code.length} chars)`);
        } else if (event.type === 'component' && event.code) {
          if (event.name === 'api') {
            allComponents['lib/api.ts'] = event.code;
          } else if (event.name === 'hooks') {
            allComponents['lib/hooks.ts'] = event.code;
          } else if (event.name === 'validators') {
            allComponents['lib/validators.ts'] = event.code;
          } else if (event.name === 'utils') {
            allComponents['lib/utils.ts'] = event.code;
          } else {
            allComponents[`components/${event.name}.tsx`] = event.code;
          }
          console.log(`  ✓ Generated component: ${event.name} (${event.code.length} chars)`);
        } else if (event.type === 'page' && event.code) {
          generatedCode.pageComponent = event.code;
          allComponents['App.tsx'] = event.code;
          console.log(`  ✓ Generated page (${event.code.length} chars)`);
        } else if (event.type === 'error') {
          console.log(`⚠️ V2 Code generation error: ${event.error}`);
          hadError = true;
        }
      }

      // Ensure App.tsx is set if pageComponent was generated
      if (generatedCode.pageComponent && !allComponents['App.tsx']) {
        allComponents['App.tsx'] = generatedCode.pageComponent;
      }

      // If V2 generated modular components, combine them into page component
      if (!generatedCode.pageComponent && Object.keys(allComponents).length > 0) {
        // Use the page wrapper or combine components
        if (allComponents['page-wrapper']) {
          generatedCode.pageComponent = allComponents['page-wrapper'];
        } else {
          // Fallback: use the first component that looks like a page
          const pageComponent = Object.entries(allComponents).find(([name]) => 
            name.includes('page') || name.includes('Page') || name.includes('main')
          );
          if (pageComponent) {
            generatedCode.pageComponent = pageComponent[1];
          }
        }
      }

      // Store all components for potential future use
      if (Object.keys(allComponents).length > 0) {
        (generatedCode as any).components = allComponents;
      }

      // Check if V2 generation was successful
      if (!hadError && generatedCode.pageComponent) {
        // Validate the generated code for basic syntax issues
        const syntaxError = validateCodeSyntax(generatedCode.pageComponent);
        if (syntaxError) {
          console.log(`⚠️ V2 generated code has syntax errors: ${syntaxError}`);
          hadError = true;
        } else {
          console.log('✅ V2 Code generation successful, skipping fallbacks');
          codeGenerationSuccess = true;
        }
      }

    } catch (v2Error) {
      console.error('V2 Code generation failed:', v2Error);
      hadError = true;
    }

    // Early exit if V2 succeeded
    if (codeGenerationSuccess) {
      // Skip V1 and template fallbacks
      console.log('⚡ Early exit: V2 generation succeeded');
    } else if (hadError || !generatedCode.pageComponent) {
      // Fallback to V1 if V2 failed
      console.log('🔄 V2 failed, falling back to V1 code generation...');
      
      for await (const chunk of generateAppCode(projectSpec as any, app.id)) {
        if (chunk.type === 'code' && chunk.component === 'page') {
          generatedCode.pageComponent += chunk.content;
        } else if (chunk.type === 'code' && chunk.component === 'types') {
          generatedCode.types = (generatedCode.types || '') + chunk.content;
        } else if (chunk.type === 'complete') {
          generatedCode.pageComponent = chunk.content;
          // Ensure App.tsx is set for V1 fallback too
          allComponents['App.tsx'] = chunk.content;
          
          // Validate V1 generated code
          const syntaxError = validateCodeSyntax(generatedCode.pageComponent);
          if (!syntaxError) {
            console.log('✅ V1 Code generation successful, skipping template fallback');
            codeGenerationSuccess = true;
          }
          break;
        } else if (chunk.type === 'error') {
          console.log('⚠️ V1 Code generation also failed');
          break;
        }
      }
    }
    
    // Final fallback to template only if both V2 and V1 failed
    if (!codeGenerationSuccess && !generatedCode.pageComponent) {
      console.log('🔄 Using fallback template code generation');
      const fallback = generateFallbackCode(projectSpec as any, app.id);
      generatedCode.pageComponent = fallback;
      allComponents['App.tsx'] = fallback;
    } else if (!codeGenerationSuccess) {
      // Last resort: use template if code has syntax errors
      console.log('🔄 Using fallback code generation due to persistent syntax errors');
      const fallback = generateFallbackCode(projectSpec as any, app.id);
      generatedCode.pageComponent = fallback;
      allComponents['App.tsx'] = fallback;
    }
  } catch (error) {
    console.error('All code generation attempts failed, using fallback:', error);
    const fallback = generateFallbackCode(projectSpec as any, app.id);
    generatedCode.pageComponent = fallback;
    allComponents['App.tsx'] = fallback;
  }

  // Update app with generated code
  const updatedApp = await prisma.app.update({
    where: { id: app.id },
    data: {
      generatedCode: JSON.stringify(generatedCode),
      componentFiles: JSON.stringify(allComponents),
      status: 'ACTIVE',
      buildStatus: 'COMPLETED',
    },
  });

  // Update conversation
  state.phase = 'complete';
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      phase: 'COMPLETE',
      spec: JSON.stringify(state),
      appId: app.id,
    },
  });

  console.log(`🎉 App generation complete: ${app.id}`);
  console.log(`📊 Generated code length: ${generatedCode.pageComponent?.length || 0} chars`);

  return NextResponse.json({
    success: true,
    app: {
      id: app.id,
      name: app.name,
      description: app.description,
      subdomain: app.subdomain,
      url: `/apps/${app.id}`,
    },
    generatedCode,
  });
}
