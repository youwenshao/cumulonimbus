import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { regenerateAppCode, generateFallbackCode, type GeneratedCode } from '@/lib/scaffolder/code-generator';
import type { ProjectSpec } from '@/lib/scaffolder/types';
import { emitStatus } from '../status/[conversationId]/route';
import { emitCodeChunk, emitCodeComplete, emitCodeError } from '../code-stream/[conversationId]/route';

/**
 * POST /api/scaffolder/regenerate
 * 
 * Regenerates app code with user-provided issue feedback
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { appId, issues } = body;

    if (!appId) {
      return NextResponse.json({ error: 'App ID is required' }, { status: 400 });
    }

    if (!issues || typeof issues !== 'string' || issues.trim().length === 0) {
      return NextResponse.json({ error: 'Issue description is required' }, { status: 400 });
    }

    console.log(`\n🔄 === Regenerating App Code ===`);
    console.log(`   App ID: ${appId}`);
    console.log(`   Issues: ${issues.substring(0, 100)}...`);

    // Find the app
    const app = await prisma.app.findFirst({
      where: {
        id: appId,
        userId: session.user.id,
      },
    });

    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    const spec = app.spec as unknown as ProjectSpec;
    const previousCode = (app.generatedCode as unknown as GeneratedCode)?.pageComponent || '';

    // Update app status to generating
    await prisma.app.update({
      where: { id: appId },
      data: {
        buildStatus: 'GENERATING',
      },
    });

    // Generate new code with issues context
    const generatedCode: GeneratedCode = {
      pageComponent: '',
      types: '',
    };
    const generationLog: Array<{ timestamp: string; message: string }> = [
      {
        timestamp: new Date().toISOString(),
        message: `Regeneration requested with issues: ${issues}`,
      },
    ];

    try {
      for await (const chunk of regenerateAppCode(spec, appId, previousCode, issues)) {
        generationLog.push({
          timestamp: new Date().toISOString(),
          message: `[${chunk.type}] ${chunk.content?.substring(0, 100) || 'chunk'}`,
        });

        if (chunk.type === 'status') {
          emitStatus(appId, 'build', chunk.content, {
            severity: 'info',
            progress: chunk.progress,
          });
        } else if (chunk.type === 'code') {
          emitCodeChunk(appId, {
            component: chunk.component || 'page',
            code: chunk.content,
            progress: chunk.progress,
          });
          
          if (chunk.component === 'page') {
            generatedCode.pageComponent += chunk.content;
          } else if (chunk.component === 'types') {
            generatedCode.types = (generatedCode.types || '') + chunk.content;
          }
        } else if (chunk.type === 'complete') {
          generatedCode.pageComponent = chunk.content;
          console.log(`✅ Regeneration complete, length: ${chunk.content.length}`);
          break;
        } else if (chunk.type === 'error') {
          console.error(`❌ Regeneration error: ${chunk.content}`);
          emitCodeError(appId, chunk.content);
          throw new Error(chunk.content);
        }
      }
    } catch (genError) {
      console.error('❌ Regeneration failed, using fallback:', genError);
      
      // Use fallback code generator
      generatedCode.pageComponent = generateFallbackCode(spec, appId);
      generationLog.push({
        timestamp: new Date().toISOString(),
        message: `[fallback] Generated fallback code due to error`,
      });
    }

    // Emit completion
    emitCodeComplete(appId, generatedCode.pageComponent);

    // Update app with new generated code
    await prisma.app.update({
      where: { id: appId },
      data: {
        generatedCode: generatedCode as unknown as object,
        generationLog: generationLog as unknown as object,
        buildStatus: 'COMPLETED',
      },
    });

    console.log(`✅ Regeneration saved successfully`);
    console.log(`   New code length: ${generatedCode.pageComponent.length} chars`);

    return NextResponse.json({
      success: true,
      appId,
      generatedCode,
    });

  } catch (error) {
    console.error('❌ Regeneration endpoint error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Regeneration failed',
      },
      { status: 500 }
    );
  }
}
