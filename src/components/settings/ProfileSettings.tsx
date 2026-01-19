'use client';

import { useState } from 'react';
import { User, Mail, Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button, Card } from '@/components/ui';

export interface ProfileSettingsProps {
  user?: {
    name?: string | null;
    email?: string | null;
  };
}

export function ProfileSettings({ user }: ProfileSettingsProps) {
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  const [emailMessage, setEmailMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingEmail(true);
    setEmailMessage(null);

    try {
      const response = await fetch('/api/settings/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update_email',
          email,
          currentPassword 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmailMessage({ type: 'success', text: 'Email updated successfully.' });
        setCurrentPassword('');
      } else {
        setEmailMessage({ type: 'error', text: data.error || 'Failed to update email.' });
      }
    } catch (error) {
      setEmailMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPassword(true);
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
      setIsUpdatingPassword(false);
      return;
    }

    if (newPassword.length < 8) {
        setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters long.' });
        setIsUpdatingPassword(false);
        return;
    }

    try {
      const response = await fetch('/api/settings/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update_password',
          currentPassword,
          newPassword 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordMessage({ type: 'success', text: 'Password updated successfully.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMessage({ type: 'error', text: data.error || 'Failed to update password.' });
      }
    } catch (error) {
      setPasswordMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="p-6">
        <h2 className="text-xl font-serif font-medium mb-4 text-text-primary flex items-center gap-2">
          <User className="w-5 h-5 text-accent-yellow" />
          Profile Settings
        </h2>
        <p className="text-sm text-text-secondary mb-8 leading-relaxed max-w-2xl">
          Manage your account credentials. For security reasons, you must provide your current password to make changes.
        </p>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Email Update Section */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-text-primary border-b border-outline-light pb-2">
              Update Email
            </h3>
            <form onSubmit={handleUpdateEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2 bg-surface-elevated border border-outline-light rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-yellow/60 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Current Password (Required)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Confirm password to update email"
                    className="w-full pl-10 pr-4 py-2 bg-surface-elevated border border-outline-light rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-yellow/60 transition-all"
                  />
                </div>
              </div>

              {emailMessage && (
                <div className={`p-3 rounded-lg flex items-start gap-2 text-sm ${
                  emailMessage.type === 'success' 
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {emailMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  )}
                  {emailMessage.text}
                </div>
              )}

              <Button 
                variant="secondary" 
                type="submit" 
                disabled={isUpdatingEmail || !currentPassword}
                className="w-full"
              >
                {isUpdatingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Email'
                )}
              </Button>
            </form>
          </div>

          {/* Password Update Section */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-text-primary border-b border-outline-light pb-2">
              Change Password
            </h3>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2 bg-surface-elevated border border-outline-light rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-yellow/60 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full pl-10 pr-4 py-2 bg-surface-elevated border border-outline-light rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-yellow/60 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full pl-10 pr-4 py-2 bg-surface-elevated border border-outline-light rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-yellow/60 transition-all"
                  />
                </div>
              </div>

              {passwordMessage && (
                <div className={`p-3 rounded-lg flex items-start gap-2 text-sm ${
                  passwordMessage.type === 'success' 
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {passwordMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  )}
                  {passwordMessage.text}
                </div>
              )}

              <Button 
                variant="secondary" 
                type="submit" 
                disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="w-full"
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
