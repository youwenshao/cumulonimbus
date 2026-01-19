'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, User, Bell, Monitor, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { NavigationRail, Button, Card, ThemeToggle } from '@/components/ui';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { SubscriptionSettings, type Plan } from '@/components/settings/SubscriptionSettings';

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<{ name?: string; email?: string; plan?: Plan } | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoadError(null);
      const response = await fetch('/api/settings/profile');
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.user);
      } else {
        setLoadError('Failed to load profile');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      setLoadError('Unable to connect to the server');
    }
  };

  const handleSubscriptionUpgrade = async (plan: Plan, isYearly: boolean) => {
    try {
        const response = await fetch('/api/settings/subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan, isYearly }),
        });

        if (response.ok) {
            const data = await response.json();
            setUserProfile(prev => prev ? { ...prev, plan: data.plan } : null);
            setSaveMessage(`Successfully upgraded to ${plan} plan!`);
            setTimeout(() => setSaveMessage(null), 3000);
        } else {
            const data = await response.json();
            setSaveMessage(data.error || 'Failed to update subscription');
        }
    } catch (error) {
        setSaveMessage('Failed to connect to server');
    }
  };

  return (
    <div className="h-screen bg-surface-base flex">
      <div className="hidden md:block">
        <NavigationRail />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-outline-mid bg-surface-base/95 backdrop-blur-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="btn-ghost p-2">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <User className="w-6 h-6 text-accent-yellow" />
                <div className="flex flex-col">
                  <h1 className="text-2xl font-serif font-medium text-text-primary leading-tight">
                    Profile
                  </h1>
                  <p className="text-xs text-text-secondary">
                    Manage your account and subscription
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
            {loadError && (
              <div className="p-4 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium mb-1">Unable to Load Profile</p>
                    <p className="text-sm opacity-90 mb-3">{loadError}</p>
                    <Button
                      onClick={loadProfile}
                      variant="secondary"
                      size="sm"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {saveMessage && (
              <div className={`p-3 rounded-lg text-sm ${
                saveMessage.includes('success') 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {saveMessage}
              </div>
            )}

            <div className="space-y-12">
               <ProfileSettings user={userProfile || undefined} />
               <SubscriptionSettings 
                  currentPlan={userProfile?.plan || 'FREE'} 
                  onUpgrade={handleSubscriptionUpgrade}
               />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
