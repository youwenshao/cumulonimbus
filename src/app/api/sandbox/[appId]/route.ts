/**
 * Sandbox App API Route
 * Serves bundled code and data for sandboxed apps
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';

interface RouteParams {
  params: Promise<{ appId: string }>;
}

/**
 * GET /api/sandbox/[appId]
 * Get the bundled code and initial data for a sandbox app
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    const { appId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const app = await prisma.app.findFirst({
      where: {
        id: appId,
        userId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        description: true,
        spec: true,
        config: true,
        data: true,
        generatedCode: true,
        componentFiles: true,
        layoutDefinition: true,
        version: true,
        status: true,
        buildStatus: true,
      },
    });

    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    // Get bundled code from componentFiles or generatedCode
    let bundledCode = '';

    if (app.componentFiles && typeof app.componentFiles === 'object') {
      // V2/Sandbox apps store code in componentFiles
      const files = app.componentFiles as Record<string, string>;
      bundledCode = files['bundled'] || files['App.tsx'] || files['page.tsx'] || '';
    } else if (app.generatedCode && typeof app.generatedCode === 'object') {
      // V1 apps store code in generatedCode
      const generated = app.generatedCode as { pageComponent?: string };
      bundledCode = generated.pageComponent || '';
    }

    return NextResponse.json({
      appId: app.id,
      name: app.name,
      description: app.description,
      bundledCode,
      initialData: app.data || [],
      schema: app.spec,
      layout: app.layoutDefinition,
      version: app.version,
      status: app.status,
    });
  } catch (error) {
    console.error('Error fetching sandbox app:', error);
    return NextResponse.json(
      { error: 'Failed to fetch app' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sandbox/[appId]
 * Update the bundled code for a sandbox app
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    const { appId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bundledCode, componentFiles } = body;

    const app = await prisma.app.findFirst({
      where: {
        id: appId,
        userId: session.user.id,
      },
    });

    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    // Update the app with new code
    const updatedApp = await prisma.app.update({
      where: { id: appId },
      data: {
        componentFiles: componentFiles || { bundled: bundledCode },
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      appId: updatedApp.id,
      message: 'App code updated',
    });
  } catch (error) {
    console.error('Error updating sandbox app:', error);
    return NextResponse.json(
      { error: 'Failed to update app' },
      { status: 500 }
    );
  }
}
