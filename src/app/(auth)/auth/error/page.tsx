'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, RefreshCw, Home, Loader2 } from 'lucide-react';
import { Logo, Button, Card } from '@/components/ui';

/**
 * Map NextAuth error codes to user-friendly messages
 */
const errorMessages: Record<string, { title: string; description: string }> = {
  Configuration: {
    title: 'Service Configuration Error',
    description: 'There is a problem with the server configuration. This is usually temporary. Please try again in a few moments.',
  },
  AccessDenied: {
    title: 'Access Denied',
    description: 'You do not have permission to access this resource. Please contact support if you believe this is an error.',
  },
  Verification: {
    title: 'Verification Failed',
    description: 'The verification token has expired or has already been used. Please request a new one.',
  },
  OAuthSignin: {
    title: 'OAuth Sign In Error',
    description: 'There was an error during the OAuth sign in process. Please try again.',
  },
  OAuthCallback: {
    title: 'OAuth Callback Error',
    description: 'There was an error during the OAuth callback. Please try signing in again.',
  },
  OAuthCreateAccount: {
    title: 'OAuth Account Creation Error',
    description: 'Could not create an OAuth account. Please try again or use a different sign in method.',
  },
  EmailCreateAccount: {
    title: 'Email Account Creation Error',
    description: 'Could not create an email account. Please try again or contact support.',
  },
  Callback: {
    title: 'Callback Error',
    description: 'There was an error during the authentication callback. Please try signing in again.',
  },
  OAuthAccountNotLinked: {
    title: 'Account Not Linked',
    description: 'This email is already associated with another account. Please sign in using your original method.',
  },
  EmailSignin: {
    title: 'Email Sign In Error',
    description: 'There was an error sending the sign in email. Please check your email address and try again.',
  },
  CredentialsSignin: {
    title: 'Invalid Credentials',
    description: 'The email or password you entered is incorrect. Please check your credentials and try again.',
  },
  SessionRequired: {
    title: 'Session Required',
    description: 'You must be signed in to access this page. Please sign in to continue.',
  },
  Default: {
    title: 'Authentication Error',
    description: 'An unexpected authentication error occurred. Please try signing in again.',
  },
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const errorType = searchParams.get('error') || 'Default';
  
  const errorInfo = errorMessages[errorType] || errorMessages.Default;
  
  // Check if it's a database-related error
  const isDatabaseError = errorType === 'Configuration';

  return (
    <>
      {/* Error Icon */}
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>

      {/* Error Title */}
      <h1 className="text-3xl font-serif font-medium text-text-primary text-center mb-4">
        {errorInfo.title}
      </h1>

      {/* Error Description */}
      <p className="text-text-secondary text-center mb-8 leading-relaxed">
        {errorInfo.description}
      </p>

      {/* Action Buttons */}
      <div className="space-y-3">
        {isDatabaseError ? (
          <>
            <Button
              asChild
              variant="primary"
              size="lg"
              className="w-full"
            >
              <Link href="/auth/signin">
                <RefreshCw className="w-5 h-5 mr-2" />
                Try Again
              </Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              size="lg"
              className="w-full"
            >
              <Link href="/">
                <Home className="w-5 h-5 mr-2" />
                Go Home
              </Link>
            </Button>
          </>
        ) : (
          <>
            <Button
              asChild
              variant="primary"
              size="lg"
              className="w-full"
            >
              <Link href="/auth/signin">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Sign In
              </Link>
            </Button>
            {errorType === 'CredentialsSignin' && (
              <Button
                asChild
                variant="secondary"
                size="lg"
                className="w-full"
              >
                <Link href="/auth/signup">
                  Don&apos;t have an account? Sign Up
                </Link>
              </Button>
            )}
          </>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-8 pt-6 border-t border-outline-light">
        <p className="text-text-secondary text-sm text-center leading-relaxed">
          If the problem persists, please contact{' '}
          <a 
            href="mailto:support@cumulonimbus.dev" 
            className="text-accent-yellow hover:text-text-primary transition-colors"
          >
            support@cumulonimbus.dev
          </a>
        </p>
      </div>

      {/* Developer Info */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-6">
          <summary className="cursor-pointer text-xs text-text-tertiary hover:text-text-secondary text-center">
            Error Code (Development Only)
          </summary>
          <div className="mt-2 p-3 bg-surface-base rounded-lg border border-outline-light">
            <code className="text-xs text-text-secondary font-mono">
              {errorType}
            </code>
          </div>
        </details>
      )}
    </>
  );
}

function ErrorLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-accent-yellow mb-4" />
      <p className="text-text-secondary text-sm">Loading error details...</p>
    </div>
  );
}

/**
 * Authentication error page
 * Handles various NextAuth error scenarios with user-friendly messages
 */
export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        {/* Error Card */}
        <Card variant="outlined" padding="lg" className="animate-confident">
          <Suspense fallback={<ErrorLoading />}>
            <ErrorContent />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}
