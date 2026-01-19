'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button, Logo } from '@/components/ui';

/**
 * Global error boundary for the entire application
 * Catches unhandled errors in Server Components and provides recovery options
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to error reporting service
    console.error('Global error caught:', error);
  }, [error]);

  // Check if it's a database error
  const isDatabaseError = 
    error.message.includes('denied access') ||
    error.message.includes('database') ||
    error.message.includes('Prisma') ||
    error.message.includes('connection');

  return (
    <html>
      <body>
        <div className="min-h-screen bg-surface-base flex items-center justify-center p-6">
          <div className="w-full max-w-2xl">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <Logo size="lg" />
            </div>

            {/* Error Card */}
            <div className="bg-surface-elevated rounded-2xl border border-outline-light p-8 md:p-12">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>

                <h1 className="text-3xl font-serif font-medium text-text-primary mb-4">
                  {isDatabaseError ? 'Service Temporarily Unavailable' : 'Something Went Wrong'}
                </h1>

                <p className="text-text-secondary mb-8 leading-relaxed max-w-md">
                  {isDatabaseError
                    ? 'We\'re having trouble connecting to our database. This is usually temporary. Please try again in a moment.'
                    : 'An unexpected error occurred. Our team has been notified and is working on a fix.'}
                </p>

                {error.digest && (
                  <div className="mb-8 px-4 py-2 bg-surface-base rounded-lg">
                    <p className="text-xs text-text-tertiary font-mono">
                      Error ID: {error.digest}
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  <Button
                    onClick={reset}
                    variant="primary"
                    size="lg"
                    className="flex-1 sm:flex-initial"
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Try Again
                  </Button>
                  <Button
                    asChild
                    variant="secondary"
                    size="lg"
                    className="flex-1 sm:flex-initial"
                  >
                    <Link href="/">
                      <Home className="w-5 h-5 mr-2" />
                      Go Home
                    </Link>
                  </Button>
                </div>

                {process.env.NODE_ENV === 'development' && (
                  <details className="mt-8 w-full text-left">
                    <summary className="cursor-pointer text-sm text-text-secondary hover:text-text-primary mb-2">
                      Technical Details (Development Only)
                    </summary>
                    <div className="p-4 bg-surface-base rounded-lg border border-outline-light overflow-auto">
                      <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap">
                        {error.message}
                        {error.stack && `\n\n${error.stack}`}
                      </pre>
                    </div>
                  </details>
                )}
              </div>
            </div>

            <p className="text-center text-text-tertiary text-sm mt-6">
              If the problem persists, please contact support
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
