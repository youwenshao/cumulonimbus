'use client';

import Link from 'next/link';
import { 
  ArrowRight, 
  Heart, 
  Globe, 
  Users, 
  Zap,
  Building2,
  MapPin,
  Mail,
  Phone,
  Sparkles,
  Target,
  Lightbulb
} from 'lucide-react';
import { Button, Card } from '@/components/ui';

const TEAM = [
  {
    name: 'Billy Zuo',
    role: 'Founder & CEO',
    bio: 'Visionary leader passionate about democratizing technology and making powerful tools accessible to everyone.',
    image: null, // Placeholder for future image
  },
  {
    name: 'Youwen Shao',
    role: 'Founder, Director & CTO',
    bio: 'Tech enthusiast with a deep commitment to building elegant, user-centric solutions that just work.',
    image: null,
  },
];

const VALUES = [
  {
    icon: Heart,
    title: 'Technology for Everyone',
    description: 'We believe powerful technology should be accessible to all, not just those with deep pockets or years of coding experience.',
  },
  {
    icon: Globe,
    title: 'Open & Transparent',
    description: 'We build in the open, share our learnings, and maintain honest relationships with our users and community.',
  },
  {
    icon: Lightbulb,
    title: 'Innovation with Purpose',
    description: 'Every feature we build solves a real problem. We don\'t chase trends—we focus on what genuinely helps people create.',
  },
  {
    icon: Users,
    title: 'Community First',
    description: 'Our users aren\'t just customers—they\'re collaborators. Their feedback shapes every decision we make.',
  },
];

export default function AboutPage() {
  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-yellow/10 border border-accent-yellow/20 text-accent-yellow text-sm font-medium mb-6 animate-slide-down">
            <Heart className="w-4 h-4" />
            <span>Our Story</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium text-text-primary mb-6 tracking-tight animate-slide-up">
            Building the future of <span className="text-accent-yellow">creation</span>
          </h1>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
            We started Cumulonimbus with a simple belief: everyone should be able to bring their ideas to life, 
            regardless of their technical background. Technology should empower, not gatekeep.
          </p>
        </div>

        {/* Mission Statement */}
        <div className="max-w-4xl mx-auto mb-20 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="relative p-8 md:p-12 rounded-2xl bg-gradient-to-br from-accent-yellow/10 to-transparent border border-accent-yellow/20">
            <div className="absolute top-6 left-6">
              <Target className="w-8 h-8 text-accent-yellow" />
            </div>
            <div className="pl-0 md:pl-16">
              <h2 className="text-2xl md:text-3xl font-serif font-medium text-text-primary mb-4 mt-10 md:mt-0">
                Our Mission
              </h2>
              <p className="text-lg text-text-secondary leading-relaxed">
                To democratize software creation by making it as natural as having a conversation. 
                We&apos;re building tools that let anyone—from students to entrepreneurs to dreamers—turn 
                their ideas into reality without writing a single line of code.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="bg-surface-layer py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-medium text-text-primary mb-4">
              What we <span className="text-accent-yellow">believe</span>
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
              Our values aren&apos;t just words on a wall—they guide every decision we make, 
              from product features to how we treat our community.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {VALUES.map((value, index) => {
              const Icon = value.icon;
              return (
                <div 
                  key={index}
                  className="p-6 rounded-2xl bg-surface-base border border-outline-light hover:border-accent-yellow/30 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-accent-yellow/10 text-accent-yellow flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-serif font-medium text-text-primary mb-3">
                    {value.title}
                  </h3>
                  <p className="text-text-secondary leading-relaxed">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-elevated border border-outline-light text-text-secondary text-sm font-medium mb-6">
              <Users className="w-4 h-4" />
              <span>The Team</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-serif font-medium text-text-primary mb-4">
              Meet the <span className="text-accent-yellow">founders</span>
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
              A small team with big dreams. We&apos;re building Cumulonimbus from Hong Kong, 
              with a vision that spans the globe.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {TEAM.map((member, index) => (
              <div 
                key={index}
                className="group p-8 rounded-2xl bg-surface-elevated/50 border border-outline-light hover:border-accent-yellow/30 transition-all duration-300"
              >
                {/* Avatar Placeholder */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-yellow/30 to-accent-yellow/10 flex items-center justify-center mb-6 mx-auto group-hover:scale-105 transition-transform">
                  <span className="text-3xl font-bold text-accent-yellow">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-serif font-medium text-text-primary mb-1">
                    {member.name}
                  </h3>
                  <p className="text-sm text-accent-yellow font-medium mb-4">
                    {member.role}
                  </p>
                  <p className="text-text-secondary leading-relaxed">
                    {member.bio}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Company Info Section */}
      <section className="bg-surface-layer py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-elevated border border-outline-light text-text-secondary text-sm font-medium mb-6">
              <Building2 className="w-4 h-4" />
              <span>Company Details</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-serif font-medium text-text-primary mb-4">
              Based in <span className="text-accent-yellow">Hong Kong</span>
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
              We&apos;re proud to be building from one of Asia&apos;s most vibrant tech hubs, 
              serving creators around the world.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="p-8 rounded-2xl bg-surface-base border border-outline-light">
              <h3 className="text-lg font-medium text-text-primary mb-6">
                Sentimento Technologies Limited
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4 text-text-secondary">
                  <div className="p-2 rounded-lg bg-surface-elevated">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-text-tertiary mb-1">Company Registration</p>
                    <p>79623564</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 text-text-secondary">
                  <div className="p-2 rounded-lg bg-surface-elevated">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-text-tertiary mb-1">Address</p>
                    <p>Unit B, 11/F, 23 Thomson Road<br />Wan Chai, Hong Kong SAR China</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 text-text-secondary">
                  <div className="p-2 rounded-lg bg-surface-elevated">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-text-tertiary mb-1">Phone</p>
                    <p>+852 6779 0523</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 text-text-secondary">
                  <div className="p-2 rounded-lg bg-surface-elevated">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-text-tertiary mb-1">Email</p>
                    <p>sentimento.tech@gmail.com</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-b from-surface-layer to-surface-base">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-medium text-text-primary mb-6">
            Join us on this <span className="text-accent-yellow">journey</span>
          </h2>
          <p className="text-xl text-text-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
            We&apos;re just getting started, and we&apos;d love for you to be part of the story. 
            <span className="text-text-primary font-medium"> Let&apos;s build something amazing together.</span>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="px-8">
              <Link href="/create" className="group">
                Start creating
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/careers">Join our team</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
