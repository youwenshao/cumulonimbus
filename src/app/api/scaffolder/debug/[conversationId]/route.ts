import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import type { BlueprintState, ProjectSpec } from '@/lib/scaffolder/types';

/**
 * Debug endpoint for inspecting conversation state
 * GET /api/scaffolder/debug/[conversationId]
 * 
 * Returns detailed information about a conversation including:
 * - Questions generated
 * - Answers recorded
 * - Blueprint state
 * - Final spec (if generated)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationId = params.conversationId;

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: session.user.id },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const state = conversation.spec as unknown as BlueprintState;
    const spec = state.spec as ProjectSpec | undefined;

    // Analyze question-answer mapping
    const questionAnswerAnalysis = state.questions?.map(q => {
      const answer = state.answers?.[q.id];
      return {
        questionId: q.id,
        category: q.category,
        type: q.type,
        answered: q.answered,
        hasAnswer: !!answer,
        answer: answer,
        optionIds: q.options?.map(o => o.id),
        question: q.question,
      };
    }) || [];

    // Check for mismatches
    const answerKeys = Object.keys(state.answers || {});
    const questionIds = state.questions?.map(q => q.id) || [];
    const unmatchedAnswers = answerKeys.filter(key => !questionIds.includes(key));
    const unansweredQuestions = questionIds.filter(id => !answerKeys.includes(id));

    return NextResponse.json({
      conversationId: conversation.id,
      phase: conversation.phase,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      
      // Blueprint state
      blueprintState: {
        phase: state.phase,
        intent: state.intent,
      },
      
      // Questions analysis
      questions: {
        total: state.questions?.length || 0,
        answered: state.questions?.filter(q => q.answered).length || 0,
        questionIds,
        categories: [...new Set(state.questions?.map(q => q.category) || [])],
      },
      
      // Answers analysis
      answers: {
        total: answerKeys.length,
        keys: answerKeys,
        values: state.answers,
      },
      
      // Mapping issues
      mappingAnalysis: {
        unmatchedAnswers: unmatchedAnswers.length > 0 ? unmatchedAnswers : null,
        unansweredQuestions: unansweredQuestions.length > 0 ? unansweredQuestions : null,
        allMatched: unmatchedAnswers.length === 0 && unansweredQuestions.length === 0,
      },
      
      // Detailed question-answer pairs
      questionAnswerPairs: questionAnswerAnalysis,
      
      // Final spec (if generated)
      finalSpec: spec ? {
        name: spec.name,
        description: spec.description,
        category: spec.category,
        fields: spec.dataStore?.fields?.map(f => ({
          name: f.name,
          label: f.label,
          type: f.type,
          required: f.required,
        })),
        views: spec.views?.map(v => ({
          type: v.type,
          title: v.title,
        })),
      } : null,
      
      // Messages count
      messagesCount: (conversation.messages as unknown[])?.length || 0,
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debug info' },
      { status: 500 }
    );
  }
}
