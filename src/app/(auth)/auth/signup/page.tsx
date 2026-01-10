'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create account');
        return;
      }

      // Auto sign in after successful signup
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError('Account created but failed to sign in. Please sign in manually.');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = password.length >= 8 ? 'strong' : password.length >= 4 ? 'medium' : 'weak';

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-50 via-surface-100 to-primary-50 flex items-center justify-center p-6">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-200/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold font-display text-surface-900">Cumulonimbus</span>
        </Link>

        {/* Form Card */}
        <div className="glass rounded-3xl p-8 shadow-xl animate-scale-in">
          <h1 className="text-2xl font-bold font-display text-surface-900 text-center mb-2">
            Create your account
          </h1>
          <p className="text-surface-600 text-center mb-8">
            Start building apps from your ideas
          </p>

          {error && (
            <div className="flex items-center gap-2 p-4 mb-6 rounded-xl bg-red-50 text-red-700 border border-red-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-surface-700 mb-2">
                Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-surface-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                  placeholder="Your name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-surface-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-surface-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-surface-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-surface-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
              {password && (
                <div className="flex items-center gap-2 mt-2">
                  <div className={`h-1 flex-1 rounded-full ${passwordStrength === 'strong' ? 'bg-green-500' : passwordStrength === 'medium' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                  <span className="text-xs text-surface-500">
                    {passwordStrength === 'strong' ? 'Strong' : passwordStrength === 'medium' ? 'Medium' : 'Weak'}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-surface-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-surface-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                  placeholder="••••••••"
                  required
                />
                {confirmPassword && password === confirmPassword && (
                  <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-surface-600">
              Already have an account?{' '}
              <Link href="/auth/signin" className="text-primary-600 hover:text-primary-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
