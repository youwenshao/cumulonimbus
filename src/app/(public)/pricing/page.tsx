'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, CreditCard, Sparkles, Zap, Shield, Crown, ArrowRight, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui';

type Plan = 'FREE' | 'PLUS' | 'PRO';

const PLANS = [
  {
    id: 'FREE' as Plan,
    name: 'Free',
    price: 0,
    description: 'Essential tools for hobbyists and students.',
    features: [
      'Full access to site features',
      'Unlimited DeepSeek LLM access',
      'Max 50 apps stored',
      'Basic cybersecurity',
      'Community support'
    ],
    highlight: false
  },
  {
    id: 'PLUS' as Plan,
    name: 'Plus',
    price: 100,
    description: 'Advanced features for creators and developers.',
    features: [
      'Everything in Free',
      'Premium design templates',
      'Select specific LLM models',
      'Priority generation queue',
      'Bring your own API keys (Coming soon)'
    ],
    highlight: true,
    icon: Sparkles
  },
  {
    id: 'PRO' as Plan,
    name: 'Pro',
    price: 500,
    description: 'Maximum power for businesses and power users.',
    features: [
      'Everything in Plus',
      'Permanently running app hosting',
      'Advanced usage & traffic analytics',
      'Priority 24/7 support',
      'Early access to new features'
    ],
    highlight: false,
    icon: Crown
  }
];

const FAQ = [
  {
    question: 'Can I change my plan later?',
    answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate any payments.'
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, MasterCard, American Express) and PayPal. For enterprise customers, we also support bank transfers.'
  },
  {
    question: 'Is there a free trial for paid plans?',
    answer: 'We offer a 14-day free trial for the Plus plan. No credit card required to start.'
  },
  {
    question: 'What happens when I reach my app limit?',
    answer: 'You\'ll receive a notification when you\'re approaching your limit. You can either upgrade your plan or archive some existing apps to make room.'
  },
  {
    question: 'Can I get a refund?',
    answer: 'Yes, we offer a 30-day money-back guarantee. If you\'re not satisfied, contact our support team for a full refund.'
  }
];

export default function PricingPage() {
  const router = useRouter();
  const [isYearly, setIsYearly] = useState(false);

  const calculatePrice = (basePrice: number) => {
    if (isYearly) {
      return Math.round(basePrice * 0.9); // 10% off
    }
    return basePrice;
  };

  const handleSelectPlan = (plan: Plan) => {
    // Redirect to signup with selected plan for new users
    // or to profile settings for existing users
    router.push(`/auth/signup?plan=${plan}&billing=${isYearly ? 'yearly' : 'monthly'}`);
  };

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-yellow/10 border border-accent-yellow/20 text-accent-yellow text-sm font-medium mb-6 animate-slide-down">
            <CreditCard className="w-4 h-4" />
            <span>Simple, transparent pricing</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium text-text-primary mb-6 tracking-tight animate-slide-up">
            Choose your <span className="text-accent-yellow">plan</span>
          </h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Start building for free. Upgrade when you need more power.
            <span className="text-text-primary font-medium"> No hidden fees, ever.</span>
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center gap-3 bg-surface-elevated p-1 rounded-xl border border-outline-light">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                !isYearly 
                  ? 'bg-surface-layer text-text-primary shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                isYearly 
                  ? 'bg-surface-layer text-text-primary shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Yearly
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent-yellow bg-accent-yellow/10 px-1.5 py-0.5 rounded">
                Save 10%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Plans Grid */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          {PLANS.map((plan) => {
            const price = calculatePrice(plan.price);
            const Icon = plan.icon || Zap;

            return (
              <div 
                key={plan.id}
                className={`
                  relative flex flex-col p-8 rounded-2xl border transition-all duration-300 hover:scale-[1.02]
                  ${plan.highlight 
                    ? 'border-accent-yellow/50 bg-accent-yellow/5 shadow-[0_0_40px_-10px_rgba(252,160,0,0.15)]' 
                    : 'border-outline-light bg-surface-base/50 backdrop-blur-sm hover:border-outline-mid'
                  }
                `}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="text-xs font-bold uppercase tracking-wider text-surface-base bg-accent-yellow px-4 py-1.5 rounded-full shadow-lg shadow-accent-yellow/25">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl ${plan.highlight ? 'bg-accent-yellow/20 text-accent-yellow' : 'bg-surface-elevated text-text-secondary'} flex items-center justify-center`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-serif font-medium text-text-primary mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1 text-text-primary mb-3">
                    <span className="text-4xl font-bold tracking-tight">
                      {price === 0 ? 'Free' : `HKD $${price}`}
                    </span>
                    {price > 0 && (
                      <span className="text-text-secondary text-sm">
                        /month
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {plan.description}
                  </p>
                </div>

                {/* Features */}
                <div className="flex-1 space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-text-secondary">
                      <div className={`mt-0.5 p-0.5 rounded-full ${plan.highlight ? 'bg-accent-yellow/20 text-accent-yellow' : 'bg-surface-elevated text-pastel-green'}`}>
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className="leading-snug">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                <Button
                  variant={plan.highlight ? "primary" : "secondary"}
                  className="w-full group"
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {plan.price === 0 ? 'Get Started Free' : `Upgrade to ${plan.name}`}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            );
          })}
        </div>

        {/* Security Note */}
        <div className="mt-16 p-6 rounded-2xl bg-surface-elevated/50 border border-outline-light">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="p-4 rounded-xl bg-surface-layer text-accent-yellow">
              <Shield className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-text-primary text-lg mb-2">
                Enterprise-Grade Security & Privacy
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed max-w-3xl">
                All plans include our enterprise-grade security features. Your data is encrypted at rest and in transit.
                We never train our models on your private data without your explicit permission. SOC 2 Type II compliant.
              </p>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/privacy">Learn more</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-surface-layer py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-elevated border border-outline-light text-text-secondary text-sm font-medium mb-6">
              <HelpCircle className="w-4 h-4" />
              <span>Got questions?</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-serif font-medium text-text-primary mb-4">
              Frequently asked <span className="text-accent-yellow">questions</span>
            </h2>
          </div>

          <div className="space-y-4">
            {FAQ.map((item, index) => (
              <div 
                key={index}
                className="p-6 rounded-xl bg-surface-base border border-outline-light hover:border-outline-mid transition-colors"
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

          <div className="text-center mt-12">
            <p className="text-text-secondary mb-4">
              Still have questions? We're here to help.
            </p>
            <Button variant="secondary" asChild>
              <Link href="/contact">Contact Support</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-b from-surface-layer to-surface-base">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-medium text-text-primary mb-6">
            Ready to <span className="text-accent-yellow">build</span>?
          </h2>
          <p className="text-xl text-text-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
            Join thousands of creators building at the <span className="text-text-primary font-medium">speed of thought</span>.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="px-8">
              <Link href="/create" className="group">
                Start building for free
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
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
