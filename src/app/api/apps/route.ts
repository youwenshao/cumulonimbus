import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';

// GET /api/apps - List all apps for the current user
export async function GET() {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apps = await prisma.app.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ apps });
  } catch (error) {
    console.error('Error fetching apps:', error);
    return NextResponse.json(
      { error: 'Failed to fetch apps' },
      { status: 500 }
    );
  }
}

// POST /api/apps - Create a new app (for quick creation without conversation)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, spec, config } = body;

    if (!name || !spec || !config) {
      return NextResponse.json(
        { error: 'Name, spec, and config are required' },
        { status: 400 }
      );
    }

    const app = await prisma.app.create({
      data: {
        userId: session.user.id,
        name,
        description: description || '',
        spec,
        config,
        data: [],
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({ app }, { status: 201 });
  } catch (error) {
    console.error('Error creating app:', error);
    return NextResponse.json(
      { error: 'Failed to create app' },
      { status: 500 }
    );
  }
}
