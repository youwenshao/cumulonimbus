'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { Logo, Button, Card } from '@/components/ui';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const error = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(error || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setErrorMessage(result.error);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setErrorMessage('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {errorMessage && (
        <div className="flex items-center gap-2 p-4 mb-6 rounded-xl bg-pastel-yellow text-text-primary border border-outline-light">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-outline-light bg-surface-light text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-yellow/50 focus:border-accent-yellow transition-all"
              placeholder="you@example.com"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-outline-light bg-surface-light text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-yellow/50 focus:border-accent-yellow transition-all"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        <Button type="submit" disabled={isLoading} size="lg" className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Signing In...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </form>
    </>
  );
}

function FormLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-accent-yellow" />
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        {/* Form Card */}
        <Card variant="outlined" padding="lg" className="animate-confident">
          <h1 className="text-3xl font-serif font-medium text-text-primary text-center mb-2">
            Welcome back
          </h1>
          <p className="text-text-secondary text-center mb-8">
            Sign in to access your apps
          </p>

          <Suspense fallback={<FormLoading />}>
            <SignInForm />
          </Suspense>

          <div className="mt-6 text-center">
            <p className="text-text-secondary">
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="text-accent-yellow hover:text-text-primary font-medium transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
