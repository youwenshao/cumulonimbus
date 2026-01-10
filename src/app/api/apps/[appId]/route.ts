import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';

interface RouteParams {
  params: Promise<{ appId: string }>;
}

// GET /api/apps/[appId] - Get a specific app
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
    });

    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    return NextResponse.json({ app });
  } catch (error) {
    console.error('Error fetching app:', error);
    return NextResponse.json(
      { error: 'Failed to fetch app' },
      { status: 500 }
    );
  }
}

// PATCH /api/apps/[appId] - Update an app
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    const { appId } = await params;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, status } = body;

    const app = await prisma.app.findFirst({
      where: { 
        id: appId,
        userId: session.user.id,
      },
    });

    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    const updatedApp = await prisma.app.update({
      where: { id: appId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
      },
    });

    return NextResponse.json({ app: updatedApp });
  } catch (error) {
    console.error('Error updating app:', error);
    return NextResponse.json(
      { error: 'Failed to update app' },
      { status: 500 }
    );
  }
}

// DELETE /api/apps/[appId] - Delete an app
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
    });

    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    await prisma.app.delete({
      where: { id: appId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting app:', error);
    return NextResponse.json(
      { error: 'Failed to delete app' },
      { status: 500 }
    );
  }
}
