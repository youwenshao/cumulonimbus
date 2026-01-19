'use client';

import Link from 'next/link';
import { 
  ArrowRight, 
  History, 
  Sparkles,
  Bug,
  Zap,
  Shield,
  Palette,
  Database,
  Bell,
  Rocket,
  Star
} from 'lucide-react';
import { Button, Card } from '@/components/ui';

type ChangeType = 'feature' | 'improvement' | 'fix' | 'security';

interface Change {
  type: ChangeType;
  title: string;
  description?: string;
}

interface Release {
  version: string;
  date: string;
  title: string;
  description: string;
  changes: Change[];
  highlight?: boolean;
}

const RELEASES: Release[] = [
  {
    version: '0.5.0',
    date: 'January 15, 2026',
    title: 'Public Beta Launch',
    description: 'We\'re officially in public beta! Thanks to all our early testers for helping us get here.',
    highlight: true,
    changes: [
      { type: 'feature', title: 'Public sign-ups now open', description: 'Anyone can now create an account and start building.' },
      { type: 'feature', title: 'New pricing plans', description: 'Introduced Free, Plus, and Pro tiers with transparent pricing.' },
      { type: 'feature', title: 'App sharing', description: 'Share your apps with a public link or keep them private.' },
      { type: 'improvement', title: 'Faster app generation', description: 'Reduced average build time by 40%.' },
      { type: 'improvement', title: 'Improved error handling', description: 'More helpful error messages when things go wrong.' },
      { type: 'fix', title: 'Fixed dark mode inconsistencies', description: 'All UI elements now properly respect the theme.' },
    ],
  },
  {
    version: '0.4.2',
    date: 'January 8, 2026',
    title: 'Bug Fixes & Polish',
    description: 'Squashing bugs and polishing the experience based on tester feedback.',
    changes: [
      { type: 'fix', title: 'Fixed app preview freezing on complex layouts' },
      { type: 'fix', title: 'Fixed data loss when session expires' },
      { type: 'improvement', title: 'Better mobile responsiveness in the dashboard' },
      { type: 'security', title: 'Improved API rate limiting' },
    ],
  },
  {
    version: '0.4.0',
    date: 'December 20, 2025',
    title: 'AI Conversation Improvements',
    description: 'Major improvements to how the AI understands and responds to your requests.',
    changes: [
      { type: 'feature', title: 'Multi-turn conversation support', description: 'The AI now remembers context from earlier in the conversation.' },
      { type: 'feature', title: 'Design suggestions', description: 'Get AI-powered suggestions for colors, layouts, and UX.' },
      { type: 'improvement', title: 'Better handling of ambiguous requests' },
      { type: 'improvement', title: 'Faster response times' },
      { type: 'fix', title: 'Fixed issues with special characters in prompts' },
    ],
  },
  {
    version: '0.3.0',
    date: 'December 5, 2025',
    title: 'Dashboard & App Management',
    description: 'A complete overhaul of how you manage your apps.',
    changes: [
      { type: 'feature', title: 'New dashboard design', description: 'A cleaner, more organized view of all your apps.' },
      { type: 'feature', title: 'App folders', description: 'Organize your apps into folders.' },
      { type: 'feature', title: 'Duplicate apps', description: 'Clone any app as a starting point for a new project.' },
      { type: 'improvement', title: 'Search and filter apps' },
      { type: 'fix', title: 'Fixed app deletion not freeing up storage' },
    ],
  },
];

const CHANGE_TYPE_CONFIG: Record<ChangeType, { icon: typeof Sparkles; color: string; label: string }> = {
  feature: { icon: Sparkles, color: 'text-accent-yellow bg-accent-yellow/10', label: 'New' },
  improvement: { icon: Zap, color: 'text-pastel-blue bg-pastel-blue/10', label: 'Improved' },
  fix: { icon: Bug, color: 'text-pastel-green bg-pastel-green/10', label: 'Fixed' },
  security: { icon: Shield, color: 'text-pastel-purple bg-pastel-purple/10', label: 'Security' },
};

export default function ChangelogPage() {
  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-12">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-yellow/10 border border-accent-yellow/20 text-accent-yellow text-sm font-medium mb-6 animate-slide-down">
            <History className="w-4 h-4" />
            <span>Changelog</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium text-text-primary mb-6 tracking-tight animate-slide-up">
            What&apos;s <span className="text-accent-yellow">new</span>
          </h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
            We ship fast and improve constantly. Here&apos;s everything that&apos;s changed, 
            from major features to small fixes.
          </p>
        </div>

        {/* Subscribe to Updates */}
        <div className="max-w-xl mx-auto mb-16 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Bell className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
              <input
                type="email"
                placeholder="Get notified about updates"
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-surface-elevated border border-outline-light focus:border-accent-yellow focus:ring-1 focus:ring-accent-yellow outline-none transition-colors text-text-primary placeholder-text-tertiary"
              />
            </div>
            <Button>Subscribe</Button>
          </div>
        </div>
      </section>

      {/* Releases */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="space-y-12">
          {RELEASES.map((release, releaseIndex) => (
            <div 
              key={releaseIndex}
              className={`relative ${releaseIndex !== RELEASES.length - 1 ? 'pb-12' : ''}`}
            >
              {/* Timeline line */}
              {releaseIndex !== RELEASES.length - 1 && (
                <div className="absolute left-[7px] top-8 bottom-0 w-px bg-outline-light" />
              )}

              {/* Release Header */}
              <div className="flex items-start gap-4">
                {/* Timeline dot */}
                <div className={`relative z-10 w-4 h-4 rounded-full mt-1.5 flex-shrink-0 ${
                  release.highlight 
                    ? 'bg-accent-yellow shadow-lg shadow-accent-yellow/25' 
                    : 'bg-surface-elevated border-2 border-outline-light'
                }`} />

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className="text-sm font-mono text-accent-yellow font-medium">
                      v{release.version}
                    </span>
                    <span className="text-sm text-text-tertiary">
                      {release.date}
                    </span>
                    {release.highlight && (
                      <span className="flex items-center gap-1 text-xs font-medium text-accent-yellow bg-accent-yellow/10 px-2 py-0.5 rounded-full">
                        <Star className="w-3 h-3" />
                        Latest
                      </span>
                    )}
                  </div>

                  <h2 className="text-2xl font-serif font-medium text-text-primary mb-2">
                    {release.title}
                  </h2>
                  <p className="text-text-secondary mb-6 leading-relaxed">
                    {release.description}
                  </p>

                  {/* Changes */}
                  <div className="space-y-3">
                    {release.changes.map((change, changeIndex) => {
                      const config = CHANGE_TYPE_CONFIG[change.type];
                      const Icon = config.icon;
                      return (
                        <div 
                          key={changeIndex}
                          className="flex items-start gap-3 p-4 rounded-xl bg-surface-elevated/50 border border-outline-light"
                        >
                          <div className={`p-1.5 rounded-lg ${config.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium uppercase tracking-wider ${config.color.split(' ')[0]}`}>
                                {config.label}
                              </span>
                            </div>
                            <p className="text-text-primary font-medium">
                              {change.title}
                            </p>
                            {change.description && (
                              <p className="text-sm text-text-secondary mt-1">
                                {change.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* More Coming Soon */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 text-text-secondary">
            <Rocket className="w-5 h-5" />
            <span>More updates coming soon. Stay tuned!</span>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-surface-layer py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-medium text-text-primary mb-6">
            Try the <span className="text-accent-yellow">latest</span> features
          </h2>
          <p className="text-xl text-text-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
            We&apos;re constantly improving. Jump in and see what&apos;s new.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="px-8">
              <Link href="/create" className="group">
                Start building
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/docs">Read the docs</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
