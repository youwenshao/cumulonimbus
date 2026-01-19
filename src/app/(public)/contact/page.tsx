'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  Mail, 
  Phone, 
  MapPin, 
  MessageSquare,
  Send,
  Clock,
  Sparkles,
  Building2,
  HelpCircle
} from 'lucide-react';
import { Button, Card } from '@/components/ui';

const CONTACT_METHODS = [
  {
    icon: Mail,
    title: 'Email Us',
    description: 'Drop us a line anytime. We typically respond within 24 hours.',
    value: 'sentimento.tech@gmail.com',
    action: 'mailto:sentimento.tech@gmail.com',
    cta: 'Send email',
  },
  {
    icon: Phone,
    title: 'Call Us',
    description: 'Available during Hong Kong business hours (9am - 6pm HKT).',
    value: '+852 6779 0523',
    action: 'tel:+85267790523',
    cta: 'Call now',
  },
  {
    icon: MapPin,
    title: 'Visit Us',
    description: 'Our office is in the heart of Wan Chai, Hong Kong.',
    value: 'Unit B, 11/F, 23 Thomson Road, Wan Chai',
    action: 'https://maps.google.com/?q=23+Thomson+Road,+Wan+Chai,+Hong+Kong',
    cta: 'Get directions',
  },
];

const HELP_TOPICS = [
  {
    title: 'Getting Started',
    description: 'New to Cumulonimbus? Check out our docs.',
    link: '/docs',
  },
  {
    title: 'Billing Questions',
    description: 'Questions about plans, payments, or refunds.',
    link: '/pricing',
  },
  {
    title: 'Technical Support',
    description: 'Having issues? We\'re here to help.',
    link: '/docs',
  },
  {
    title: 'Feature Requests',
    description: 'Got an idea? We\'d love to hear it.',
    link: '/blog',
  },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission - replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSubmitting(false);
    setSubmitted(true);
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-12">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-yellow/10 border border-accent-yellow/20 text-accent-yellow text-sm font-medium mb-6 animate-slide-down">
            <MessageSquare className="w-4 h-4" />
            <span>Get in touch</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium text-text-primary mb-6 tracking-tight animate-slide-up">
            We&apos;d love to <span className="text-accent-yellow">hear</span> from you
          </h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Whether you have a question, feedback, or just want to say hi—we&apos;re always happy to chat. 
            No question is too small, no idea too big.
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          {CONTACT_METHODS.map((method, index) => {
            const Icon = method.icon;
            return (
              <a
                key={index}
                href={method.action}
                target={method.action.startsWith('http') ? '_blank' : undefined}
                rel={method.action.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="group p-6 rounded-2xl bg-surface-elevated/50 border border-outline-light hover:border-accent-yellow/30 transition-all duration-300 block"
              >
                <div className="w-12 h-12 rounded-xl bg-surface-layer text-accent-yellow flex items-center justify-center mb-4 group-hover:bg-accent-yellow group-hover:text-surface-base transition-colors">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  {method.title}
                </h3>
                <p className="text-sm text-text-secondary mb-3 leading-relaxed">
                  {method.description}
                </p>
                <p className="text-sm text-text-primary font-medium mb-4">
                  {method.value}
                </p>
                <span className="inline-flex items-center gap-1 text-sm text-accent-yellow group-hover:gap-2 transition-all">
                  {method.cta}
                  <ArrowRight className="w-4 h-4" />
                </span>
              </a>
            );
          })}
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="bg-surface-layer py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Form */}
            <div>
              <h2 className="text-3xl font-serif font-medium text-text-primary mb-4">
                Send us a <span className="text-accent-yellow">message</span>
              </h2>
              <p className="text-text-secondary mb-8 leading-relaxed">
                Fill out the form and we&apos;ll get back to you as soon as we can. 
                Usually within a business day or two.
              </p>

              {submitted ? (
                <div className="p-8 rounded-2xl bg-pastel-green/10 border border-pastel-green/30 text-center">
                  <div className="w-16 h-16 rounded-full bg-pastel-green/20 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-pastel-green" />
                  </div>
                  <h3 className="text-xl font-medium text-text-primary mb-2">
                    Message sent!
                  </h3>
                  <p className="text-text-secondary">
                    Thanks for reaching out. We&apos;ll be in touch soon.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Your name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-surface-base border border-outline-light focus:border-accent-yellow focus:ring-1 focus:ring-accent-yellow outline-none transition-colors text-text-primary placeholder-text-tertiary"
                        placeholder="Jane Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Email address
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-surface-base border border-outline-light focus:border-accent-yellow focus:ring-1 focus:ring-accent-yellow outline-none transition-colors text-text-primary placeholder-text-tertiary"
                        placeholder="jane@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-surface-base border border-outline-light focus:border-accent-yellow focus:ring-1 focus:ring-accent-yellow outline-none transition-colors text-text-primary placeholder-text-tertiary"
                      placeholder="How can we help?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Message
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-surface-base border border-outline-light focus:border-accent-yellow focus:ring-1 focus:ring-accent-yellow outline-none transition-colors text-text-primary placeholder-text-tertiary resize-none"
                      placeholder="Tell us more..."
                    />
                  </div>
                  <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      'Sending...'
                    ) : (
                      <>
                        Send message
                        <Send className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>

            {/* Help Topics */}
            <div>
              <h2 className="text-3xl font-serif font-medium text-text-primary mb-4">
                Quick <span className="text-accent-yellow">help</span>
              </h2>
              <p className="text-text-secondary mb-8 leading-relaxed">
                Before reaching out, you might find what you&apos;re looking for in these resources.
              </p>

              <div className="space-y-4">
                {HELP_TOPICS.map((topic, index) => (
                  <Link
                    key={index}
                    href={topic.link}
                    className="group flex items-start gap-4 p-4 rounded-xl bg-surface-base border border-outline-light hover:border-accent-yellow/30 transition-all"
                  >
                    <div className="p-2 rounded-lg bg-surface-elevated text-text-secondary group-hover:text-accent-yellow transition-colors">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-text-primary mb-1">
                        {topic.title}
                      </h3>
                      <p className="text-sm text-text-secondary">
                        {topic.description}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-text-tertiary group-hover:text-accent-yellow group-hover:translate-x-1 transition-all" />
                  </Link>
                ))}
              </div>

              {/* Response Time */}
              <div className="mt-8 p-6 rounded-xl bg-surface-base border border-outline-light">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-accent-yellow/10 text-accent-yellow">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-text-primary mb-1">
                      Response Time
                    </h3>
                    <p className="text-sm text-text-secondary">
                      We typically respond within 24-48 hours during business days. 
                      For urgent matters, give us a call.
                    </p>
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
            Ready to get <span className="text-accent-yellow">started</span>?
          </h2>
          <p className="text-xl text-text-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
            Jump right in and start building. It&apos;s free, and you don&apos;t need a credit card.
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
