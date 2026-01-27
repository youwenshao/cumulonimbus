/**
 * V3 Scaffolder Files API
 * Direct access to app files
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';

/**
 * GET /api/scaffolder-v3/files/[appId]
 * List all files or get a specific file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { appId: string } }
) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { appId } = params;
  const filePath = request.nextUrl.searchParams.get('path');

  // Get app
  const app = await prisma.app.findFirst({
    where: {
      id: appId,
      userId: session.user.id,
    },
    select: {
      viteComponentFiles: true,
      vitePackageJson: true,
    },
  });

  if (!app) {
    return NextResponse.json({ error: 'App not found' }, { status: 404 });
  }

  const componentFiles = JSON.parse(app.viteComponentFiles || '{}');
  const packageJson = JSON.parse(app.vitePackageJson || '{}');

  // Add package.json to files
  const allFiles = {
    ...componentFiles,
    'package.json': JSON.stringify(packageJson, null, 2),
  };

  if (filePath) {
    // Return specific file
    const content = allFiles[filePath];
    if (content === undefined) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    return NextResponse.json({ path: filePath, content });
  }

  // Return all files
  return NextResponse.json({
    files: Object.keys(allFiles).map(path => ({
      path,
      size: allFiles[path]?.length || 0,
    })),
  });
}

/**
 * POST /api/scaffolder-v3/files/[appId]
 * Create or update a file
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { appId: string } }
) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { appId } = params;
  const body = await request.json();
  const { path, content } = body;

  if (!path || typeof content !== 'string') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Get app
  const app = await prisma.app.findFirst({
    where: {
      id: appId,
      userId: session.user.id,
    },
    select: {
      viteComponentFiles: true,
    },
  });

  if (!app) {
    return NextResponse.json({ error: 'App not found' }, { status: 404 });
  }

  const componentFiles = JSON.parse(app.viteComponentFiles || '{}');
  const isNew = componentFiles[path] === undefined;
  
  // Update file
  componentFiles[path] = content;

  await prisma.app.update({
    where: { id: appId },
    data: {
      viteComponentFiles: JSON.stringify(componentFiles),
    },
  });

  return NextResponse.json({
    success: true,
    path,
    action: isNew ? 'created' : 'updated',
  });
}

/**
 * PATCH /api/scaffolder-v3/files/[appId]
 * Update an existing file
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { appId: string } }
) {
  // Same as POST for file updates
  return POST(request, { params });
}

/**
 * DELETE /api/scaffolder-v3/files/[appId]
 * Delete a file
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { appId: string } }
) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { appId } = params;
  const filePath = request.nextUrl.searchParams.get('path');

  if (!filePath) {
    return NextResponse.json({ error: 'File path required' }, { status: 400 });
  }

  // Get app
  const app = await prisma.app.findFirst({
    where: {
      id: appId,
      userId: session.user.id,
    },
    select: {
      viteComponentFiles: true,
    },
  });

  if (!app) {
    return NextResponse.json({ error: 'App not found' }, { status: 404 });
  }

  const componentFiles = JSON.parse(app.viteComponentFiles || '{}');
  
  if (componentFiles[filePath] === undefined) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  // Delete file
  delete componentFiles[filePath];

  await prisma.app.update({
    where: { id: appId },
    data: {
      viteComponentFiles: JSON.stringify(componentFiles),
    },
  });

  return NextResponse.json({
    success: true,
    path: filePath,
    action: 'deleted',
  });
}
