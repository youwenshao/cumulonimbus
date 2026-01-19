'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { Button, Logo, NavigationRail } from '@/components/ui';

/**
 * Error boundary for the main authenticated section of the app
 * Provides context-aware error handling with navigation options
 */
export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to error reporting service
    console.error('Main app error caught:', error);
  }, [error]);

  // Check if it's a database error
  const isDatabaseError = 
    error.message.includes('denied access') ||
    error.message.includes('database') ||
    error.message.includes('Prisma') ||
    error.message.includes('connection') ||
    error.message.includes('timeout');

  // Check if it's an authorization error
  const isAuthError = 
    error.message.includes('Unauthorized') ||
    error.message.includes('unauthorized') ||
    error.message.includes('not found') ||
    error.message.includes('User');

  return (
    <div className="h-screen bg-surface-base flex">
      {/* Navigation Rail */}
      <div className="hidden md:block">
        <NavigationRail />
      </div>

      {/* Error Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {/* Error Card */}
          <div className="bg-surface-elevated rounded-2xl border border-outline-light p-8 md:p-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>

              <h1 className="text-3xl font-serif font-medium text-text-primary mb-4">
                {isDatabaseError ? 'Service Temporarily Unavailable' : isAuthError ? 'Access Issue' : 'Something Went Wrong'}
              </h1>

              <p className="text-text-secondary mb-8 leading-relaxed max-w-md">
                {isDatabaseError ? (
                  <>
                    We&apos;re having trouble connecting to our database. This is usually temporary.
                    Your work is safe, and you can try again in a moment.
                  </>
                ) : isAuthError ? (
                  <>
                    There was an issue verifying your access. This might be due to a temporary
                    service interruption. Please sign in again or try refreshing the page.
                  </>
                ) : (
                  <>
                    An unexpected error occurred while loading this page. Our team has been
                    notified and is working on a fix.
                  </>
                )}
              </p>

              {error.digest && (
                <div className="mb-8 px-4 py-2 bg-surface-base rounded-lg">
                  <p className="text-xs text-text-tertiary font-mono">
                    Error ID: {error.digest}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                {!isAuthError && (
                  <Button
                    onClick={reset}
                    variant="primary"
                    size="lg"
                    className="flex-1 sm:flex-initial"
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Try Again
                  </Button>
                )}
                
                <Button
                  asChild
                  variant="secondary"
                  size="lg"
                  className="flex-1 sm:flex-initial"
                >
                  <Link href="/dashboard">
                    <Home className="w-5 h-5 mr-2" />
                    Go to Dashboard
                  </Link>
                </Button>

                {isAuthError && (
                  <Button
                    asChild
                    variant="ghost"
                    size="lg"
                    className="flex-1 sm:flex-initial"
                  >
                    <Link href="/auth/signin">
                      <ArrowLeft className="w-5 h-5 mr-2" />
                      Sign In Again
                    </Link>
                  </Button>
                )}
              </div>

              {process.env.NODE_ENV === 'development' && (
                <details className="mt-8 w-full text-left">
                  <summary className="cursor-pointer text-sm text-text-secondary hover:text-text-primary mb-2">
                    Technical Details (Development Only)
                  </summary>
                  <div className="p-4 bg-surface-base rounded-lg border border-outline-light overflow-auto max-h-64">
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
            Need help? Visit our{' '}
            <Link href="/support" className="text-accent-yellow hover:text-text-primary transition-colors">
              support page
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
