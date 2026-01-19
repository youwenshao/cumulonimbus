import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma, { withDBErrorHandling, DBErrorType } from '@/lib/db';

// GET /api/apps - List all apps for the current user
export async function GET() {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: apps, error: dbError } = await withDBErrorHandling(
      () => prisma.app.findMany({
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
      }),
      { retryAttempts: 2, retryDelayMs: 500 }
    );

    if (dbError) {
      console.error('Database error fetching apps:', dbError);
      
      if (dbError.type === DBErrorType.CONNECTION || dbError.type === DBErrorType.PERMISSION) {
        return NextResponse.json(
          { 
            error: 'Service temporarily unavailable',
            type: 'SERVICE_UNAVAILABLE',
            message: 'We are experiencing database connectivity issues. Please try again in a moment.',
            retryable: true,
            apps: [], // Return empty array for graceful degradation
          },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch apps',
          type: 'DATABASE_ERROR',
          retryable: dbError.retryable,
          apps: [],
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ apps: apps || [] });
  } catch (error) {
    console.error('Unexpected error fetching apps:', error);
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        type: 'UNKNOWN_ERROR',
        apps: [],
      },
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

    const { data: app, error: dbError } = await withDBErrorHandling(
      () => prisma.app.create({
        data: {
          userId: session.user.id,
          name,
          description: description || '',
          spec,
          config,
          data: [],
          status: 'ACTIVE',
        },
      }),
      { retryAttempts: 1, retryDelayMs: 500 }
    );

    if (dbError) {
      console.error('Database error creating app:', dbError);
      
      if (dbError.type === DBErrorType.CONNECTION || dbError.type === DBErrorType.PERMISSION) {
        return NextResponse.json(
          { 
            error: 'Service temporarily unavailable',
            type: 'SERVICE_UNAVAILABLE',
            message: 'We are experiencing database connectivity issues. Please try again in a moment.',
            retryable: true,
          },
          { status: 503 }
        );
      }
      
      if (dbError.type === DBErrorType.CONSTRAINT) {
        return NextResponse.json(
          { 
            error: 'An app with this name already exists',
            type: 'CONSTRAINT_VIOLATION',
            retryable: false,
          },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to create app',
          type: 'DATABASE_ERROR',
          retryable: dbError.retryable,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ app }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error creating app:', error);
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        type: 'UNKNOWN_ERROR',
      },
      { status: 500 }
    );
  }
}
