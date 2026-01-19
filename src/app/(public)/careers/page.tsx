'use client';

import Link from 'next/link';
import { 
  ArrowRight, 
  Briefcase, 
  Heart, 
  Globe, 
  Zap,
  Coffee,
  Clock,
  MapPin,
  Mail,
  Users,
  Sparkles,
  Rocket
} from 'lucide-react';
import { Button, Card } from '@/components/ui';

const PERKS = [
  {
    icon: Globe,
    title: 'Remote-First',
    description: 'Work from anywhere in the world. We care about results, not office hours.',
  },
  {
    icon: Clock,
    title: 'Flexible Hours',
    description: 'Structure your day around your life, not the other way around.',
  },
  {
    icon: Coffee,
    title: 'Competitive Pay',
    description: 'We pay Hong Kong rates regardless of where you\'re based.',
  },
  {
    icon: Rocket,
    title: 'Early Stage Impact',
    description: 'Shape the direction of the product and company from day one.',
  },
  {
    icon: Heart,
    title: 'Health & Wellness',
    description: 'Comprehensive health coverage and wellness benefits.',
  },
  {
    icon: Sparkles,
    title: 'Learning Budget',
    description: 'Annual budget for courses, conferences, and books.',
  },
];

const OPEN_POSITIONS = [
  // Currently no open positions - we're a small team!
];

export default function CareersPage() {
  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-yellow/10 border border-accent-yellow/20 text-accent-yellow text-sm font-medium mb-6 animate-slide-down">
            <Briefcase className="w-4 h-4" />
            <span>Join Our Team</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium text-text-primary mb-6 tracking-tight animate-slide-up">
            Help us build the <span className="text-accent-yellow">future</span>
          </h1>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
            We're a small team with big ambitions. We believe that the best ideas can come from anywhere, 
            and that technology should be a force for good. Sound like your kind of place?
          </p>
        </div>

        {/* Why Join Us */}
        <div className="max-w-4xl mx-auto mb-20 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="relative p-8 md:p-12 rounded-2xl bg-gradient-to-br from-accent-yellow/10 to-transparent border border-accent-yellow/20">
            <h2 className="text-2xl md:text-3xl font-serif font-medium text-text-primary mb-4">
              Why Cumulonimbus?
            </h2>
            <p className="text-lg text-text-secondary leading-relaxed mb-6">
              We're not just building another tech product. We're on a mission to democratize software creation—to 
              make it possible for anyone to bring their ideas to life, regardless of their technical background.
            </p>
            <p className="text-lg text-text-secondary leading-relaxed">
              If you're passionate about making technology accessible, love tackling hard problems, and want to 
              work with a team that values creativity and autonomy, we'd love to hear from you.
            </p>
          </div>
        </div>
      </section>

      {/* Perks Section */}
      <section className="bg-surface-layer py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-medium text-text-primary mb-4">
              What we <span className="text-accent-yellow">offer</span>
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
              We're building a workplace where talented people can do their best work. 
              Here's what you can expect.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PERKS.map((perk, index) => {
              const Icon = perk.icon;
              return (
                <div 
                  key={index}
                  className="p-6 rounded-2xl bg-surface-base border border-outline-light hover:border-accent-yellow/30 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-accent-yellow/10 text-accent-yellow flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-medium text-text-primary mb-2">
                    {perk.title}
                  </h3>
                  <p className="text-text-secondary leading-relaxed">
                    {perk.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Open Positions Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-elevated border border-outline-light text-text-secondary text-sm font-medium mb-6">
              <Users className="w-4 h-4" />
              <span>Open Positions</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-serif font-medium text-text-primary mb-4">
              Current <span className="text-accent-yellow">openings</span>
            </h2>
          </div>

          {OPEN_POSITIONS.length > 0 ? (
            <div className="max-w-3xl mx-auto space-y-4">
              {/* Positions would be listed here */}
            </div>
          ) : (
            <div className="max-w-2xl mx-auto text-center">
              <div className="p-12 rounded-2xl bg-surface-elevated/50 border border-outline-light">
                <div className="w-20 h-20 rounded-full bg-surface-layer flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-accent-yellow" />
                </div>
                <h3 className="text-xl font-medium text-text-primary mb-3">
                  No open positions right now
                </h3>
                <p className="text-text-secondary leading-relaxed mb-6">
                  We're a small, focused team at the moment. But we're always interested in meeting 
                  talented people who share our vision. If you think you'd be a great fit, don't let 
                  the lack of listings stop you—reach out anyway!
                </p>
                <p className="text-sm text-text-tertiary mb-8">
                  We especially love hearing from people with backgrounds in:
                </p>
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                  {['Full-Stack Development', 'AI/ML Engineering', 'Product Design', 'Developer Relations', 'Technical Writing'].map((skill) => (
                    <span 
                      key={skill}
                      className="px-3 py-1 rounded-full bg-surface-layer text-text-secondary text-sm border border-outline-light"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                <Button asChild>
                  <a href="mailto:sentimento.tech@gmail.com?subject=Career%20Inquiry">
                    Get in touch
                    <Mail className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Culture Section */}
      <section className="bg-surface-layer py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif font-medium text-text-primary mb-6">
                Our <span className="text-accent-yellow">culture</span>
              </h2>
              <div className="space-y-6 text-text-secondary leading-relaxed">
                <p>
                  We're builders at heart. We believe in shipping fast, learning from feedback, and iterating 
                  constantly. Perfection is the enemy of progress—we'd rather put something in users' hands 
                  and improve it than spend months polishing in isolation.
                </p>
                <p>
                  We trust each other. That means autonomy and ownership. You won't find micromanagement here. 
                  We hire smart people, give them context, and let them figure out the best way forward.
                </p>
                <p>
                  We're optimistic about the future. Technology has the power to make the world better, 
                  and we're excited to be part of that. We celebrate wins, learn from failures, and 
                  never lose sight of why we're doing this.
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-surface-base border border-outline-light">
                <h3 className="text-lg font-medium text-text-primary mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-accent-yellow" />
                  Ship it
                </h3>
                <p className="text-text-secondary">
                  Done is better than perfect. We value momentum and iteration over endless planning.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-surface-base border border-outline-light">
                <h3 className="text-lg font-medium text-text-primary mb-3 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-accent-yellow" />
                  Care deeply
                </h3>
                <p className="text-text-secondary">
                  About our users, our craft, and each other. Quality matters, and so do people.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-surface-base border border-outline-light">
                <h3 className="text-lg font-medium text-text-primary mb-3 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-accent-yellow" />
                  Stay curious
                </h3>
                <p className="text-text-secondary">
                  The best ideas come from exploring. Never stop learning and questioning.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-b from-surface-layer to-surface-base">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-medium text-text-primary mb-6">
            Let's build <span className="text-accent-yellow">together</span>
          </h2>
          <p className="text-xl text-text-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
            Even if there's no open position that fits, we'd love to hear from you. 
            Great people are always welcome.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="px-8">
              <a href="mailto:sentimento.tech@gmail.com?subject=Career%20Inquiry" className="group">
                Send us your story
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </a>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/about">Learn about us</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
