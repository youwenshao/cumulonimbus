'use client';

import Link from 'next/link';
import { 
  ArrowRight, 
  BookOpen, 
  Zap, 
  Code2, 
  Database,
  Palette,
  Shield,
  MessageSquare,
  Lightbulb,
  ExternalLink,
  Search,
  Rocket,
  Settings,
  HelpCircle
} from 'lucide-react';
import { Button, Card } from '@/components/ui';

const GETTING_STARTED = [
  {
    icon: Rocket,
    title: 'Quick Start',
    description: 'Get up and running in under 5 minutes. Create your first app with a simple conversation.',
    href: '#quick-start',
  },
  {
    icon: MessageSquare,
    title: 'How Conversations Work',
    description: 'Learn how to describe your ideas effectively and iterate with the AI.',
    href: '#conversations',
  },
  {
    icon: Palette,
    title: 'Customizing Your App',
    description: 'Make it yours—colors, layouts, fonts, and more.',
    href: '#customization',
  },
];

const DOCUMENTATION_SECTIONS = [
  {
    icon: Code2,
    title: 'Core Concepts',
    description: 'Understand how Cumulonimbus works under the hood.',
    topics: ['App Architecture', 'Data Models', 'Views & Components', 'Actions & Workflows'],
  },
  {
    icon: Database,
    title: 'Data & Storage',
    description: 'Everything about databases, storage, and data management.',
    topics: ['Database Basics', 'Relationships', 'Queries', 'Data Import/Export'],
  },
  {
    icon: Shield,
    title: 'Security & Auth',
    description: 'Keep your apps and users secure.',
    topics: ['Authentication', 'Permissions', 'Data Privacy', 'API Security'],
  },
  {
    icon: Settings,
    title: 'Advanced Features',
    description: 'For power users who want to push the boundaries.',
    topics: ['Custom Code', 'Integrations', 'Webhooks', 'API Access'],
  },
];

const FAQ_ITEMS = [
  {
    question: 'Do I need to know how to code?',
    answer: 'Nope! Cumulonimbus is designed for everyone. Just describe what you want in plain language, and our AI handles the technical stuff. That said, if you do know how to code, you can always dive deeper and customize things.',
  },
  {
    question: 'What kinds of apps can I build?',
    answer: 'Almost anything! From simple personal tools and trackers to business apps, dashboards, and even full-featured web applications. Our AI is particularly good at data-driven apps, CRUD applications, and workflow tools.',
  },
  {
    question: 'Is there a limit to what I can build?',
    answer: 'The Free plan lets you store up to 50 apps. Beyond that, you can upgrade to Plus or Pro for more capacity and features. There\'s no hard limit on app complexity, though very large applications might need to be broken into smaller pieces.',
  },
  {
    question: 'Can I export my app\'s code?',
    answer: 'Yes! Your apps are built with standard web technologies. Pro users can export the full source code and host it anywhere they like.',
  },
];

export default function DocsPage() {
  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-12">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-yellow/10 border border-accent-yellow/20 text-accent-yellow text-sm font-medium mb-6 animate-slide-down">
            <BookOpen className="w-4 h-4" />
            <span>Documentation</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium text-text-primary mb-6 tracking-tight animate-slide-up">
            Learn to <span className="text-accent-yellow">build</span>
          </h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Everything you need to know about creating apps with Cumulonimbus. 
            From your first app to advanced customizations.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-16 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search documentation..."
              className="w-full pl-12 pr-4 py-4 rounded-xl bg-surface-elevated border border-outline-light focus:border-accent-yellow focus:ring-1 focus:ring-accent-yellow outline-none transition-colors text-text-primary placeholder-text-tertiary"
            />
          </div>
        </div>
      </section>

      {/* Getting Started Section */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="mb-12">
          <h2 className="text-2xl font-serif font-medium text-text-primary mb-4">
            Getting Started
          </h2>
          <p className="text-text-secondary">
            New to Cumulonimbus? Start here.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {GETTING_STARTED.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={index}
                href={item.href}
                className="group p-6 rounded-2xl bg-surface-elevated/50 border border-outline-light hover:border-accent-yellow/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-accent-yellow/10 text-accent-yellow flex items-center justify-center mb-4 group-hover:bg-accent-yellow group-hover:text-surface-base transition-colors">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-medium text-text-primary mb-2 group-hover:text-accent-yellow transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed mb-4">
                  {item.description}
                </p>
                <span className="inline-flex items-center gap-1 text-sm text-accent-yellow group-hover:gap-2 transition-all">
                  Read more
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Documentation Sections */}
      <section className="bg-surface-layer py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-medium text-text-primary mb-4">
              Explore the <span className="text-accent-yellow">docs</span>
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
              Dive deeper into specific topics.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {DOCUMENTATION_SECTIONS.map((section, index) => {
              const Icon = section.icon;
              return (
                <div 
                  key={index}
                  className="p-6 rounded-2xl bg-surface-base border border-outline-light hover:border-outline-mid transition-all duration-300"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-surface-elevated text-accent-yellow flex items-center justify-center">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-text-primary mb-1">
                        {section.title}
                      </h3>
                      <p className="text-sm text-text-secondary">
                        {section.description}
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-2 ml-16">
                    {section.topics.map((topic, topicIndex) => (
                      <li key={topicIndex}>
                        <Link 
                          href="#" 
                          className="text-sm text-text-secondary hover:text-accent-yellow transition-colors flex items-center gap-2"
                        >
                          <span className="w-1 h-1 rounded-full bg-outline-mid" />
                          {topic}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-elevated border border-outline-light text-text-secondary text-sm font-medium mb-6">
              <HelpCircle className="w-4 h-4" />
              <span>FAQ</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-serif font-medium text-text-primary mb-4">
              Common <span className="text-accent-yellow">questions</span>
            </h2>
          </div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((item, index) => (
              <div 
                key={index}
                className="p-6 rounded-xl bg-surface-elevated/50 border border-outline-light hover:border-outline-mid transition-colors"
              >
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  {item.question}
                </h3>
                <p className="text-text-secondary leading-relaxed">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Help Section */}
      <section className="bg-surface-layer py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="p-8 md:p-12 rounded-2xl bg-surface-base border border-outline-light text-center">
              <div className="w-16 h-16 rounded-full bg-accent-yellow/10 flex items-center justify-center mx-auto mb-6">
                <Lightbulb className="w-8 h-8 text-accent-yellow" />
              </div>
              <h2 className="text-2xl md:text-3xl font-serif font-medium text-text-primary mb-4">
                Can't find what you're looking for?
              </h2>
              <p className="text-lg text-text-secondary mb-8 leading-relaxed">
                Our documentation is always evolving. If you have a question that isn't answered here, 
                reach out and we'll help you out—and probably add it to the docs!
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild>
                  <Link href="/contact" className="group">
                    Contact support
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button variant="secondary" asChild>
                  <a 
                    href="https://github.com/sentimento-tech/cumulonimbus" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2"
                  >
                    GitHub Discussions
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-b from-surface-layer to-surface-base">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-medium text-text-primary mb-6">
            Ready to <span className="text-accent-yellow">create</span>?
          </h2>
          <p className="text-xl text-text-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
            The best way to learn is by doing. Jump in and start building—it's free.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="px-8">
              <Link href="/create" className="group">
                Start building
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/blog">Read our blog</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
