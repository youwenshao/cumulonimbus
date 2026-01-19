import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Database error types for structured error handling
 */
export enum DBErrorType {
  CONNECTION = 'CONNECTION',
  TIMEOUT = 'TIMEOUT',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION = 'VALIDATION',
  CONSTRAINT = 'CONSTRAINT',
  PERMISSION = 'PERMISSION',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Structured database error information
 */
export interface DBError {
  type: DBErrorType;
  message: string;
  originalError?: unknown;
  code?: string;
  retryable: boolean;
}

/**
 * Parse Prisma errors into structured error information
 */
export function parsePrismaError(error: unknown): DBError {
  // Handle Prisma-specific errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return {
          type: DBErrorType.CONSTRAINT,
          message: 'A record with this value already exists',
          code: error.code,
          retryable: false,
          originalError: error,
        };
      case 'P2025':
        return {
          type: DBErrorType.NOT_FOUND,
          message: 'Record not found',
          code: error.code,
          retryable: false,
          originalError: error,
        };
      case 'P2024':
        return {
          type: DBErrorType.TIMEOUT,
          message: 'Database operation timed out',
          code: error.code,
          retryable: true,
          originalError: error,
        };
      default:
        return {
          type: DBErrorType.UNKNOWN,
          message: error.message || 'Database operation failed',
          code: error.code,
          retryable: false,
          originalError: error,
        };
    }
  }

  // Handle connection errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      type: DBErrorType.CONNECTION,
      message: 'Unable to connect to the database',
      retryable: true,
      originalError: error,
    };
  }

  // Handle validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      type: DBErrorType.VALIDATION,
      message: 'Invalid data provided',
      retryable: false,
      originalError: error,
    };
  }

  // Handle permission/access errors
  if (error instanceof Error && error.message.includes('denied access')) {
    return {
      type: DBErrorType.PERMISSION,
      message: 'Database access denied. Please check your connection.',
      retryable: true,
      originalError: error,
    };
  }

  // Handle generic errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('connection') || message.includes('connect')) {
      return {
        type: DBErrorType.CONNECTION,
        message: 'Database connection failed',
        retryable: true,
        originalError: error,
      };
    }
    
    if (message.includes('timeout')) {
      return {
        type: DBErrorType.TIMEOUT,
        message: 'Database operation timed out',
        retryable: true,
        originalError: error,
      };
    }
  }

  // Unknown error
  return {
    type: DBErrorType.UNKNOWN,
    message: 'An unexpected database error occurred',
    retryable: false,
    originalError: error,
  };
}

/**
 * Check if the database is accessible
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  error?: string;
}> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { healthy: true };
  } catch (error) {
    const dbError = parsePrismaError(error);
    return {
      healthy: false,
      error: dbError.message,
    };
  }
}

/**
 * Execute a database operation with error handling and optional retry
 */
export async function withDBErrorHandling<T>(
  operation: () => Promise<T>,
  options: {
    retryAttempts?: number;
    retryDelayMs?: number;
  } = {}
): Promise<{ data?: T; error?: DBError }> {
  const { retryAttempts = 0, retryDelayMs = 1000 } = options;
  let lastError: DBError | undefined;

  for (let attempt = 0; attempt <= retryAttempts; attempt++) {
    try {
      const data = await operation();
      return { data };
    } catch (error) {
      lastError = parsePrismaError(error);
      
      // Log the error
      console.error(`Database operation failed (attempt ${attempt + 1}/${retryAttempts + 1}):`, {
        type: lastError.type,
        message: lastError.message,
        code: lastError.code,
      });

      // Don't retry if error is not retryable or if this was the last attempt
      if (!lastError.retryable || attempt === retryAttempts) {
        break;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelayMs * (attempt + 1)));
    }
  }

  return { error: lastError };
}

export default prisma;
