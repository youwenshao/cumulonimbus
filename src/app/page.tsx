import Link from 'next/link';
import { ArrowRight, Sparkles, Zap, Layers } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-50 via-surface-100 to-primary-50">
      {/* Background pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-accent-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-primary-300/20 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold font-display text-surface-900">Cumulonimbus</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/auth/signin"
            className="px-4 py-2 text-surface-600 hover:text-surface-900 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="px-5 py-2.5 bg-surface-900 text-white rounded-xl hover:bg-surface-800 transition-colors font-medium"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered App Generation</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold font-display text-surface-900 leading-tight mb-6 animate-slide-up">
            Describe your problem.
            <br />
            <span className="gradient-text">Get a working app.</span>
          </h1>
          
          <p className="text-xl text-surface-600 max-w-2xl mx-auto mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Transform your ideas into personalized web applications through natural conversation. 
            No coding required. Just describe what you need.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Link
              href="/create"
              className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-2xl font-semibold text-lg hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30"
            >
              Start Building
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-4 text-surface-700 hover:text-surface-900 font-medium transition-colors"
            >
              View Dashboard
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-32">
          <FeatureCard
            icon={<Sparkles className="w-6 h-6" />}
            title="Natural Conversation"
            description="Just describe your tracking needs in plain English. Our AI understands your intent and asks smart clarifying questions."
            delay="0.3s"
          />
          <FeatureCard
            icon={<Zap className="w-6 h-6" />}
            title="Instant Generation"
            description="Your personalized app is generated in seconds, complete with data entry forms, tables, and visualizations."
            delay="0.4s"
          />
          <FeatureCard
            icon={<Layers className="w-6 h-6" />}
            title="Full Functionality"
            description="Each generated app supports full CRUD operations, data persistence, and beautiful chart visualizations."
            delay="0.5s"
          />
        </div>

        {/* Example prompt */}
        <div className="mt-32 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.6s' }}>
          <div className="glass rounded-3xl p-8 shadow-xl">
            <p className="text-sm text-surface-500 mb-4 font-medium uppercase tracking-wide">Try something like...</p>
            <div className="space-y-4">
              <ExamplePrompt text="I want to track my daily expenses and see where my money goes each month" />
              <ExamplePrompt text="Help me build a habit tracker to monitor my morning routine" />
              <ExamplePrompt text="I need to manage my freelance projects and track hours worked" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-surface-200 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-surface-500">
          <p>Built with AI. Powered by your imagination.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: string;
}) {
  return (
    <div
      className="glass rounded-2xl p-6 hover:shadow-lg transition-shadow animate-slide-up"
      style={{ animationDelay: delay }}
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center text-primary-600 mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold font-display text-surface-900 mb-2">{title}</h3>
      <p className="text-surface-600">{description}</p>
    </div>
  );
}

function ExamplePrompt({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-surface-50 hover:bg-surface-100 transition-colors cursor-pointer group">
      <div className="w-2 h-2 rounded-full bg-primary-400 mt-2 group-hover:bg-primary-500" />
      <p className="text-surface-700 group-hover:text-surface-900">{text}</p>
    </div>
  );
}
