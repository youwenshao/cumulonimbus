'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  ArrowRight, 
  Sparkles, 
  Cloud, 
  Cpu, 
  Eye,
  Zap,
  Server,
  Palette,
  Shield,
  ChevronUp,
  Play,
  ExternalLink,
  Twitter,
  Github,
  Linkedin,
  MessageSquare,
  Code2,
  Database,
  Layers
} from 'lucide-react';
import { Logo, Button, Card, ParticleBackground, ThemeToggle } from '@/components/ui';

// Idea suggestions for the chat input
const IDEA_SUGGESTIONS = [
  { label: 'AI Chat App', category: 'AI Apps' },
  { label: 'Portfolio Website', category: 'Websites' },
  { label: 'Inventory Tracker', category: 'Business Apps' },
  { label: 'Habit Tracker', category: 'Personal Software' },
];

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [host, setHost] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setHost(window.location.host);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      // Navigate to create page with the prompt
      router.push(`/create?prompt=${encodeURIComponent(inputValue.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    textareaRef.current?.focus();
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  return (
    <div className="min-h-screen bg-surface-base text-text-primary overflow-hidden">
      {/* Particle Background - The Stratosphere */}
      <ParticleBackground />

      {/* Navigation */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <Logo size="md" />
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {session ? (
            <Button asChild size="sm" variant="secondary">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Link 
                href="/auth/signin" 
                className="text-text-secondary hover:text-text-primary transition-colors text-sm font-medium"
              >
                Sign in
              </Link>
              <Button asChild size="sm">
                <Link href="/auth/signup">Create account</Link>
              </Button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section - Chat First */}
      <section className="relative z-20 max-w-4xl mx-auto px-6 pt-20 pb-16">
        {/* Main Heading */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-yellow/10 border border-accent-yellow/20 text-accent-yellow text-sm font-medium mb-6 animate-slide-down">
            <Sparkles className="w-4 h-4" />
            <span>Powered by DeepSeek</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-medium text-text-primary mb-6 tracking-tight animate-slide-up">
            What will you <span className="text-accent-yellow">build</span>?
          </h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Describe your idea and watch it come to life. 
            <span className="text-text-primary font-medium"> No setup required.</span>
          </p>
        </div>

        {/* Chat Input - Hero Element */}
        <div className="max-w-3xl mx-auto mb-8 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <form onSubmit={handleSubmit}>
            <div 
              className={`
                relative bg-surface-elevated/80 backdrop-blur-md border rounded-2xl p-4 
                transition-all duration-300 
                ${isFocused 
                  ? 'border-accent-yellow/60 shadow-lg shadow-accent-yellow/10' 
                  : 'border-outline-light/50 hover:border-outline-mid/70'
                }
              `}
            >
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Describe your app idea..."
                    rows={1}
                    className="w-full resize-none bg-transparent border-0 outline-none text-text-primary placeholder-text-tertiary text-lg leading-relaxed min-h-[52px] max-h-[120px] focus:ring-0"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className={`
                    w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 shrink-0
                    ${inputValue.trim()
                      ? 'bg-accent-yellow hover:bg-accent-yellow/90 shadow-lg shadow-accent-yellow/25 hover:shadow-xl hover:shadow-accent-yellow/30 text-surface-base'
                      : 'bg-surface-layer text-text-tertiary cursor-not-allowed'
                    }
                  `}
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Idea Suggestions */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-16 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          {IDEA_SUGGESTIONS.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion.label)}
              className="group flex items-center gap-2 px-4 py-2 bg-surface-elevated/60 hover:bg-surface-elevated border border-outline-light/30 hover:border-accent-yellow/40 rounded-full text-sm transition-all duration-200"
            >
              <Sparkles className="w-4 h-4 text-accent-yellow opacity-70 group-hover:opacity-100" />
              <span className="text-text-secondary group-hover:text-text-primary">{suggestion.label}</span>
              <span className="text-text-tertiary text-xs">({suggestion.category})</span>
            </button>
          ))}
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section className="relative z-20 py-20 bg-gradient-to-b from-surface-base to-surface-layer">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-medium text-text-primary mb-4">
              See the <span className="text-accent-yellow">storm</span> in action
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
              This restaurant management app was built entirely through conversation. 
              <span className="text-text-primary font-medium"> Interact with it below.</span>
            </p>
          </div>

          {/* Browser Frame with Demo */}
          <div className="max-w-5xl mx-auto">
            <div className="bg-surface-elevated rounded-2xl border border-outline-light/30 shadow-2xl overflow-hidden">
              {/* Browser Header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-surface-layer border-b border-outline-light/20">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-surface-base/50 rounded-lg text-sm text-text-tertiary">
                    <span>demo.{host || 'cumulonimbus.app'}</span>
                  </div>
                </div>
                <Link 
                  href="/create" 
                  className="flex items-center gap-1 text-xs text-text-tertiary hover:text-accent-yellow transition-colors"
                >
                  <Play className="w-3 h-3" />
                  Build your own
                </Link>
              </div>

              {/* Demo iframe */}
              <div className="relative bg-black aspect-[16/10]">
                <iframe 
                  src="/demo-static/index.html"
                  className="w-full h-full border-0"
                  title="Cha Chaan Teng LaoBan Demo"
                  loading="lazy"
                />
                {/* Fallback overlay if iframe fails to load */}
                <div className="absolute inset-0 flex items-center justify-center bg-surface-base/95 opacity-0 hover:opacity-0 pointer-events-none">
                  <div className="text-center">
                    <Sparkles className="w-12 h-12 text-accent-yellow mx-auto mb-4" />
                    <p className="text-text-secondary">Interactive demo loading...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Build Smarter */}
      <section className="relative z-20 py-24 bg-surface-layer">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-medium text-text-primary mb-4">
              Build <span className="text-accent-yellow">smarter</span>, ship faster
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
              Everything you need to go from idea to production, 
              <span className="text-text-primary font-medium"> powered by AI</span>
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <FeatureCard
              icon={<MessageSquare className="w-6 h-6" />}
              title="Conversational Development"
              description="Describe it. Watch it build. Iterate naturally. Our AI agent writes production-ready code while you focus on what matters."
              accent="accent-yellow"
            />
            <FeatureCard
              icon={<Palette className="w-6 h-6" />}
              title="Design That Matches Your Vision"
              description="Granular controls so your app looks exactly how you imagine. Refine in real-time with live visual feedback."
              accent="pastel-blue"
            />
            <FeatureCard
              icon={<Database className="w-6 h-6" />}
              title="Instant Infrastructure"
              description="Built-in database, authentication, and hosting - ready from day one. No configuration, no DevOps headaches."
              accent="pastel-green"
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Enterprise Ready"
              description="Security controls that scale. Build confidently knowing your apps meet production standards from the start."
              accent="pastel-purple"
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative z-20 py-24 bg-surface-base">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-medium text-text-primary mb-4">
              From <span className="text-accent-yellow">thought</span> to reality
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
              Three steps. <span className="text-text-primary font-medium">No coding required.</span>
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Describe"
              description="Tell us what you want to build in plain language. Be as detailed or as vague as you like."
              icon={<MessageSquare className="w-8 h-8" />}
            />
            <StepCard
              number="2"
              title="Watch"
              description="Our AI architect designs and builds your app in real-time. See every decision, every line of code."
              icon={<Code2 className="w-8 h-8" />}
            />
            <StepCard
              number="3"
              title="Launch"
              description="Your app is live instantly. Share it with the world or keep iterating - it's up to you."
              icon={<Zap className="w-8 h-8" />}
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-20 py-24 bg-gradient-to-b from-surface-base to-surface-layer">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-medium text-text-primary mb-6">
            Ready to <span className="text-accent-yellow">create</span>?
          </h2>
          <p className="text-xl text-text-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
            Join creators who build apps at the <span className="text-text-primary font-medium">speed of thought</span>.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {session ? (
              <Button size="lg" asChild className="px-8 bg-accent-yellow hover:bg-accent-yellow/90 text-surface-base border-none">
                <Link href="/dashboard" className="group">
                  Continue to Dashboard
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            ) : (
              <>
                <Button size="lg" asChild className="px-8">
                  <Link href="/create" className="group">
                    Start building for free
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/auth/signin">Sign in</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 bg-surface-layer border-t border-outline-light/20 py-16">
        <div className="max-w-7xl mx-auto px-6">
          {/* Slogan */}
          <div className="text-center mb-12">
            <p className="text-2xl md:text-3xl text-text-secondary font-medium leading-relaxed">
              Solving problems at the speed of thought.
            </p>
          </div>

          {/* Footer Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">Product</h4>
              <ul className="space-y-3">
                <li><Link href="/create" className="text-text-tertiary hover:text-text-primary transition-colors text-sm">Create</Link></li>
                <li><Link href="/dashboard" className="text-text-tertiary hover:text-text-primary transition-colors text-sm">Dashboard</Link></li>
                <li><Link href="/pricing" className="text-text-tertiary hover:text-text-primary transition-colors text-sm">Pricing</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">Resources</h4>
              <ul className="space-y-3">
                <li><Link href="/docs" className="text-text-tertiary hover:text-text-primary transition-colors text-sm">Documentation</Link></li>
                <li><Link href="/blog" className="text-text-tertiary hover:text-text-primary transition-colors text-sm">Blog</Link></li>
                <li><Link href="/changelog" className="text-text-tertiary hover:text-text-primary transition-colors text-sm">Changelog</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">Company</h4>
              <ul className="space-y-3">
                <li><Link href="/about" className="text-text-tertiary hover:text-text-primary transition-colors text-sm">About</Link></li>
                <li><Link href="/careers" className="text-text-tertiary hover:text-text-primary transition-colors text-sm">Careers</Link></li>
                <li><Link href="/contact" className="text-text-tertiary hover:text-text-primary transition-colors text-sm">Contact</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">Legal</h4>
              <ul className="space-y-3">
                <li><Link href="/terms" className="text-text-tertiary hover:text-text-primary transition-colors text-sm">Terms of Service</Link></li>
                <li><Link href="/privacy" className="text-text-tertiary hover:text-text-primary transition-colors text-sm">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-outline-light/20">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <Logo size="sm" />
              <span className="text-text-tertiary text-sm">
                © 2026 Sentimento Technologies Limited. All rights reserved.
              </span>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              <a 
                href="https://twitter.com/cumulonimbusapp" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-surface-elevated hover:bg-surface-base flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://github.com/sentimento-tech"
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-surface-elevated hover:bg-surface-base flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://linkedin.com/company/sentimento-tech"
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-surface-elevated hover:bg-surface-base flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Feature Card Component
function FeatureCard({
  icon,
  title,
  description,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
}) {
  const accentClasses: Record<string, string> = {
    'accent-yellow': 'bg-accent-yellow/10 text-accent-yellow border-accent-yellow/20',
    'pastel-blue': 'bg-pastel-blue/10 text-pastel-blue border-pastel-blue/20',
    'pastel-green': 'bg-pastel-green/10 text-pastel-green border-pastel-green/20',
    'pastel-purple': 'bg-pastel-purple/10 text-pastel-purple border-pastel-purple/20',
  };

  return (
    <div className="group p-6 bg-surface-elevated/50 hover:bg-surface-elevated border border-outline-light/30 hover:border-outline-mid/50 rounded-2xl transition-all duration-300">
      <div className={`w-12 h-12 rounded-xl ${accentClasses[accent]} border flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="text-xl font-serif font-medium text-text-primary mb-3">{title}</h3>
      <p className="text-text-secondary leading-relaxed">{description}</p>
    </div>
  );
}

// Step Card Component
function StepCard({
  number,
  title,
  description,
  icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="relative text-center group">
      {/* Step Number */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-accent-yellow text-surface-base font-bold text-sm flex items-center justify-center shadow-lg shadow-accent-yellow/25">
        {number}
      </div>
      
      <Card variant="outlined" padding="lg" className="pt-8 hover:border-accent-yellow/50 transition-all duration-300">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-surface-elevated flex items-center justify-center text-accent-yellow group-hover:bg-accent-yellow group-hover:text-surface-base transition-all duration-300">
          {icon}
        </div>
        <h3 className="text-2xl font-serif font-medium text-text-primary mb-4">{title}</h3>
        <p className="text-text-secondary leading-relaxed">{description}</p>
      </Card>
    </div>
  );
}
