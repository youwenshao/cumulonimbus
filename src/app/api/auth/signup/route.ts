import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma, { withDBErrorHandling, DBErrorType } from '@/lib/db';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = signupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password, name } = validation.data;

    // Check if user already exists
    const { data: existingUser, error: findError } = await withDBErrorHandling(
      () => prisma.user.findUnique({ where: { email } }),
      { retryAttempts: 1, retryDelayMs: 500 }
    );

    if (findError) {
      console.error('Database error checking existing user:', findError);
      
      if (findError.type === DBErrorType.CONNECTION || 
          findError.type === DBErrorType.PERMISSION ||
          findError.type === DBErrorType.TIMEOUT) {
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
      
      return NextResponse.json(
        { 
          error: 'An error occurred while creating your account',
          type: 'DATABASE_ERROR',
        },
        { status: 500 }
      );
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const { data: user, error: createError } = await withDBErrorHandling(
      () => prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      }),
      { retryAttempts: 1, retryDelayMs: 500 }
    );

    if (createError) {
      console.error('Database error creating user:', createError);
      
      if (createError.type === DBErrorType.CONNECTION || 
          createError.type === DBErrorType.PERMISSION ||
          createError.type === DBErrorType.TIMEOUT) {
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
      
      if (createError.type === DBErrorType.CONSTRAINT) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'An error occurred while creating your account',
          type: 'DATABASE_ERROR',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Account created successfully', user },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected signup error:', error);
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred while creating your account',
        type: 'UNKNOWN_ERROR',
      },
      { status: 500 }
    );
  }
}
