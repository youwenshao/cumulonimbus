import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma, { withDBErrorHandling, DBErrorType } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const updateEmailSchema = z.object({
  action: z.literal('update_email'),
  email: z.string().email('Invalid email address'),
  currentPassword: z.string().min(1, 'Current password is required'),
});

const updatePasswordSchema = z.object({
  action: z.literal('update_password'),
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user, error: dbError } = await withDBErrorHandling(
      () => prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          name: true,
          email: true,
          plan: true,
        },
      })
    );

    if (dbError || !user) {
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const action = body.action;

    if (action === 'update_email') {
      const validation = updateEmailSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
      }

      const { email, currentPassword } = validation.data;

      // Verify password
      const user = await prisma.user.findUnique({ where: { id: session.user.id } });
      if (!user || !user.password) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'Incorrect password' }, { status: 403 });
      }

      // Check if email is taken
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== session.user.id) {
        return NextResponse.json({ error: 'Email is already in use' }, { status: 400 });
      }

      const { error: updateError } = await withDBErrorHandling(
        () => prisma.user.update({
          where: { id: session.user.id },
          data: { email },
        })
      );

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update email' }, { status: 500 });
      }

      return NextResponse.json({ message: 'Email updated successfully' });
    } else if (action === 'update_password') {
      const validation = updatePasswordSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
      }

      const { currentPassword, newPassword } = validation.data;

      // Verify password
      const user = await prisma.user.findUnique({ where: { id: session.user.id } });
      if (!user || !user.password) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'Incorrect password' }, { status: 403 });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      const { error: updateError } = await withDBErrorHandling(
        () => prisma.user.update({
          where: { id: session.user.id },
          data: { password: hashedPassword },
        })
      );

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
      }

      return NextResponse.json({ message: 'Password updated successfully' });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
