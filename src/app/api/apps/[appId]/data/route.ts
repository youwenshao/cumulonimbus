import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { generateId } from '@/lib/utils';
import type { DataRecord } from '@/lib/primitives/types';

interface RouteParams {
  params: Promise<{ appId: string }>;
}

// GET /api/apps/[appId]/data - Get all data for an app
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
      select: { data: true },
    });

    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    const data = typeof app.data === 'string' ? JSON.parse(app.data) : (app.data || []);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching app data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

// POST /api/apps/[appId]/data - Add a new record
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json();
    const now = new Date().toISOString();
    
    const newRecord: DataRecord = {
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      ...body,
    };

    const currentData = (typeof app.data === 'string' ? JSON.parse(app.data) : (app.data || [])) as DataRecord[];
    const updatedData = [...currentData, newRecord];

    await prisma.app.update({
      where: { id: appId },
      data: { data: JSON.stringify(updatedData) },
    });

    return NextResponse.json({ record: newRecord }, { status: 201 });
  } catch (error) {
    console.error('Error adding record:', error);
    return NextResponse.json(
      { error: 'Failed to add record' },
      { status: 500 }
    );
  }
}

// PATCH /api/apps/[appId]/data - Update a record
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json();
    const { id: recordId, ...updates } = body;

    if (!recordId) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    }

    const currentData = (typeof app.data === 'string' ? JSON.parse(app.data) : (app.data || [])) as DataRecord[];
    const recordIndex = currentData.findIndex(r => r.id === recordId);

    if (recordIndex === -1) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const updatedRecord: DataRecord = {
      ...currentData[recordIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const updatedData = [...currentData];
    updatedData[recordIndex] = updatedRecord;

    await prisma.app.update({
      where: { id: appId },
      data: { data: JSON.stringify(updatedData) },
    });

    return NextResponse.json({ record: updatedRecord });
  } catch (error) {
    console.error('Error updating record:', error);
    return NextResponse.json(
      { error: 'Failed to update record' },
      { status: 500 }
    );
  }
}

// DELETE /api/apps/[appId]/data - Delete a record
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    const { appId } = await params;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('id');

    if (!recordId) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
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

    const currentData = (typeof app.data === 'string' ? JSON.parse(app.data) : (app.data || [])) as DataRecord[];
    const updatedData = currentData.filter(r => r.id !== recordId);

    if (updatedData.length === currentData.length) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    await prisma.app.update({
      where: { id: appId },
      data: { data: JSON.stringify(updatedData) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting record:', error);
    return NextResponse.json(
      { error: 'Failed to delete record' },
      { status: 500 }
    );
  }
}
