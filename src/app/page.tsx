import Link from 'next/link';
import { ArrowRight, Sparkles, Cloud, Cpu, Eye } from 'lucide-react';
import { Logo, Button, Card, ParticleBackground, ThemeToggle } from '@/components/ui';

export default function Home() {
  return (
    <div className="min-h-screen bg-surface-base text-text-primary overflow-hidden">
      {/* Particle Background - The Stratosphere */}
      <ParticleBackground />

      {/* Navigation */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <Logo size="md" />
        <div className="flex items-center gap-6">
          <ThemeToggle />
          <Link href="/auth/signin" className="text-text-secondary hover:text-text-primary transition-colors">
            Sign In
          </Link>
          <Button asChild>
            <Link href="/auth/signup">Get Started</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section - The Stratosphere */}
      <section className="relative z-20 max-w-5xl mx-auto px-6 pt-32 pb-32">
        {/* Definition Block */}
        <div className="mb-20 max-w-5xl">
          <div className="bg-surface-base/50 backdrop-blur-sm rounded-lg p-12 border border-outline-light/20">
            <h2 className="text-4xl md:text-5xl font-serif font-medium text-text-primary mb-6 leading-relaxed">
              Cumulonimbus
            </h2>
            <p className="text-xl text-accent-yellow font-medium mb-4 italic">
              /ˌkjuːmjəloʊˈnɪmbəs/
            </p>
            <p className="text-lg text-text-secondary italic mb-6">noun METEROLOGY</p>
            <p className="text-xl text-text-primary leading-relaxed pl-6 border-l-4 border-accent-yellow/40 mb-6">
              Cloud forming a towering mass with a flat base at fairly low altitude and often a flat top, as in thunderstorms.
            </p>
            <blockquote className="text-lg text-text-secondary italic">
              &quot;From a whisper of intent to a thunderstorm of creation — where thoughts become worlds, and ideas manifest as reality.&quot;
            </blockquote>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="text-center mb-20">
          <Button size="lg" asChild className="px-12 py-6 text-xl">
            <Link href="/create" className="group">
              Enter the Atmosphere
              <ArrowRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Value Proposition Layer - The Cumulus Deck */}
      <section className="relative z-20 bg-gradient-to-b from-surface-base to-surface-layer py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <ValueCard
              icon={<Cpu className="w-8 h-8" />}
              title="The Architect"
              description="The AI that doesn't just assist - it designs, plans, and builds alongside you."
            />
            <ValueCard
              icon={<Cloud className="w-8 h-8" />}
              title="The Cloud"
              description="Fully realized in the cloud. No setup, no limits. Your work is stored, processed, and ready everywhere."
            />
            <ValueCard
              icon={<Eye className="w-8 h-8" />}
              title="The Clarity"
              description="Vibe coding, realized. A frictionless interface for thinkers and creators, not just engineers."
            />
          </div>
        </div>
      </section>

      {/* Social Proof Layer - The Cirrus */}
      <section className="relative z-20 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-text-secondary mb-12">Trusted by builders at</p>
          <div className="flex items-center justify-center gap-12 opacity-60">
            {/* Company logo placeholders with logo-style appearance */}
            <div className="w-20 h-8 bg-surface-elevated rounded flex items-center justify-center group hover:bg-surface-layer transition-colors">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-text-tertiary group-hover:bg-white transition-colors"></div>
                <span className="text-text-tertiary text-xs font-bold group-hover:text-text-primary transition-colors">GitHub</span>
              </div>
            </div>
            <div className="w-20 h-8 bg-surface-elevated rounded flex items-center justify-center group hover:bg-surface-layer transition-colors">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-text-tertiary group-hover:bg-white transition-colors" style={{clipPath: 'polygon(0 0, 100% 0, 50% 100%)'}}></div>
                <span className="text-text-tertiary text-xs font-bold group-hover:text-text-primary transition-colors">Microsoft</span>
              </div>
            </div>
            <div className="w-20 h-8 bg-surface-elevated rounded flex items-center justify-center group hover:bg-surface-layer transition-colors">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full border border-text-tertiary group-hover:border-white transition-colors"></div>
                <span className="text-text-tertiary text-xs font-bold group-hover:text-text-primary transition-colors">Vercel</span>
              </div>
            </div>
            <div className="w-20 h-8 bg-surface-elevated rounded flex items-center justify-center group hover:bg-surface-layer transition-colors">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-text-tertiary group-hover:bg-white transition-colors"></div>
                <span className="text-text-tertiary text-xs font-bold group-hover:text-text-primary transition-colors">OpenAI</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - The Earth */}
      <footer className="relative z-20 bg-surface-layer py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-2xl text-text-secondary font-medium mb-8 leading-relaxed">
            Solving problems at the speed of thought.
          </p>
          <div className="flex items-center justify-center gap-8 mb-8">
            <div className="flex items-center gap-4">
              <Logo size="sm" />
              <span className="text-text-tertiary text-sm">© 2026 Cumulonimbus</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 text-sm text-text-tertiary">
            <Link href="/blog" className="hover:text-text-primary transition-colors">Blog</Link>
            <Link href="/terms" className="hover:text-text-primary transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-text-primary transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ValueCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card variant="outlined" padding="lg" className="text-center group hover:border-accent-yellow/50 transition-all duration-300">
      <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-surface-elevated flex items-center justify-center text-accent-yellow group-hover:bg-accent-yellow group-hover:text-text-primary transition-all duration-300">
        {icon}
      </div>
      <h3 className="text-3xl font-serif font-medium text-text-primary mb-6">{title}</h3>
      <p className="text-text-secondary leading-relaxed">{description}</p>
    </Card>
  );
}
