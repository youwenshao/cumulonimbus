'use client';

import Link from 'next/link';
import { 
  ArrowRight, 
  Newspaper, 
  Calendar,
  Clock,
  User,
  Tag,
  Sparkles,
  Lightbulb,
  Rocket,
  Heart
} from 'lucide-react';
import { Button, Card } from '@/components/ui';

const FEATURED_POST = {
  title: 'Why We Built Cumulonimbus',
  excerpt: 'The story behind our mission to democratize software creation. How a simple frustration turned into a platform that anyone can use to build apps without code.',
  author: 'Billy Zuo',
  date: 'January 15, 2026',
  readTime: '8 min read',
  category: 'Company',
  slug: 'why-we-built-cumulonimbus',
};

const RECENT_POSTS = [
  {
    title: 'Introducing Conversational Development',
    excerpt: 'What if building software was as natural as having a conversation? We explore the ideas behind our AI-powered approach.',
    author: 'Youwen Shao',
    date: 'January 10, 2026',
    readTime: '5 min read',
    category: 'Product',
    slug: 'introducing-conversational-development',
  },
  {
    title: 'The Future of No-Code is AI',
    excerpt: 'Why we believe traditional no-code tools are just the beginning. The real revolution happens when AI understands what you\'re trying to build.',
    author: 'Billy Zuo',
    date: 'January 5, 2026',
    readTime: '6 min read',
    category: 'Thoughts',
    slug: 'future-of-no-code-is-ai',
  },
  {
    title: 'Building in Public: Our First Month',
    excerpt: 'A transparent look at our first month of development. What worked, what didn\'t, and what we learned along the way.',
    author: 'Youwen Shao',
    date: 'December 28, 2025',
    readTime: '7 min read',
    category: 'Building in Public',
    slug: 'building-in-public-month-one',
  },
];

const CATEGORIES = [
  { name: 'All', count: 4 },
  { name: 'Product', count: 1 },
  { name: 'Company', count: 1 },
  { name: 'Thoughts', count: 1 },
  { name: 'Building in Public', count: 1 },
];

export default function BlogPage() {
  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-12">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-yellow/10 border border-accent-yellow/20 text-accent-yellow text-sm font-medium mb-6 animate-slide-down">
            <Newspaper className="w-4 h-4" />
            <span>Blog</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium text-text-primary mb-6 tracking-tight animate-slide-up">
            Stories & <span className="text-accent-yellow">ideas</span>
          </h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Thoughts on building products, democratizing technology, and the future of software creation. 
            We share openly because we believe in building in public.
          </p>
        </div>
      </section>

      {/* Featured Post */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <Link 
          href={`/blog/${FEATURED_POST.slug}`}
          className="group block p-8 md:p-12 rounded-2xl bg-gradient-to-br from-accent-yellow/10 to-transparent border border-accent-yellow/20 hover:border-accent-yellow/40 transition-all duration-300"
        >
          <div className="flex items-center gap-2 text-accent-yellow text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            <span>Featured</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-medium text-text-primary mb-4 group-hover:text-accent-yellow transition-colors">
            {FEATURED_POST.title}
          </h2>
          <p className="text-lg text-text-secondary mb-6 leading-relaxed max-w-3xl">
            {FEATURED_POST.excerpt}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-text-tertiary">
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {FEATURED_POST.author}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {FEATURED_POST.date}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {FEATURED_POST.readTime}
            </span>
            <span className="px-2 py-1 rounded-full bg-surface-elevated text-text-secondary text-xs">
              {FEATURED_POST.category}
            </span>
          </div>
        </Link>
      </section>

      {/* Categories and Recent Posts */}
      <section className="bg-surface-layer py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-4 gap-12">
            {/* Sidebar - Categories */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-medium text-text-primary mb-6">
                Categories
              </h3>
              <div className="space-y-2">
                {CATEGORIES.map((category, index) => (
                  <button 
                    key={index}
                    className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm transition-colors ${
                      index === 0 
                        ? 'bg-accent-yellow/10 text-accent-yellow' 
                        : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                    }`}
                  >
                    <span>{category.name}</span>
                    <span className="text-xs opacity-60">{category.count}</span>
                  </button>
                ))}
              </div>

              {/* Subscribe Box */}
              <div className="mt-8 p-6 rounded-xl bg-surface-base border border-outline-light">
                <h4 className="font-medium text-text-primary mb-2">
                  Stay updated
                </h4>
                <p className="text-sm text-text-secondary mb-4">
                  Get notified when we publish new posts.
                </p>
                <div className="space-y-3">
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-outline-light focus:border-accent-yellow focus:ring-1 focus:ring-accent-yellow outline-none transition-colors text-sm text-text-primary placeholder-text-tertiary"
                  />
                  <Button size="sm" className="w-full">
                    Subscribe
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Content - Recent Posts */}
            <div className="lg:col-span-3">
              <h3 className="text-lg font-medium text-text-primary mb-6">
                Recent Posts
              </h3>
              <div className="space-y-6">
                {RECENT_POSTS.map((post, index) => (
                  <Link
                    key={index}
                    href={`/blog/${post.slug}`}
                    className="group block p-6 rounded-xl bg-surface-base border border-outline-light hover:border-accent-yellow/30 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded-full bg-surface-elevated text-text-tertiary text-xs">
                            {post.category}
                          </span>
                        </div>
                        <h4 className="text-xl font-serif font-medium text-text-primary mb-2 group-hover:text-accent-yellow transition-colors">
                          {post.title}
                        </h4>
                        <p className="text-text-secondary mb-4 leading-relaxed line-clamp-2">
                          {post.excerpt}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-text-tertiary">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {post.author}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {post.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {post.readTime}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-text-tertiary group-hover:text-accent-yellow group-hover:translate-x-1 transition-all flex-shrink-0 mt-2" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="p-8 md:p-12 rounded-2xl bg-surface-elevated/50 border border-outline-light text-center">
            <div className="w-16 h-16 rounded-full bg-accent-yellow/10 flex items-center justify-center mx-auto mb-6">
              <Heart className="w-8 h-8 text-accent-yellow" />
            </div>
            <h2 className="text-2xl md:text-3xl font-serif font-medium text-text-primary mb-4">
              Like what you&apos;re reading?
            </h2>
            <p className="text-lg text-text-secondary mb-8 leading-relaxed max-w-2xl mx-auto">
              We write about product development, technology accessibility, and the journey of building a startup. 
              No spam, just honest thoughts.
            </p>
            <div className="max-w-md mx-auto">
              <div className="flex gap-3">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="flex-1 px-4 py-3 rounded-xl bg-surface-base border border-outline-light focus:border-accent-yellow focus:ring-1 focus:ring-accent-yellow outline-none transition-colors text-text-primary placeholder-text-tertiary"
                />
                <Button>
                  Subscribe
                </Button>
              </div>
              <p className="text-xs text-text-tertiary mt-3">
                No spam, unsubscribe anytime. We respect your inbox.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-surface-layer py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-medium text-text-primary mb-6">
            Ready to <span className="text-accent-yellow">build</span>?
          </h2>
          <p className="text-xl text-text-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
            Stop reading, start creating. Your next great idea is waiting.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="px-8">
              <Link href="/create" className="group">
                Start building
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/changelog">See what&apos;s new</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
