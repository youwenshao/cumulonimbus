'use client';

import { useState } from 'react';
import { Check, CreditCard, Sparkles, Zap, Shield, Globe, Lock, Crown, Server, LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui';

export type Plan = 'FREE' | 'PLUS' | 'PRO';

export interface SubscriptionSettingsProps {
  currentPlan?: Plan;
  onUpgrade?: (plan: Plan, isYearly: boolean) => void;
}

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

export function SubscriptionSettings({ currentPlan = 'FREE', onUpgrade }: SubscriptionSettingsProps) {
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);

  const handleUpgrade = async (plan: Plan) => {
    if (plan === currentPlan) return;
    setLoadingPlan(plan);
    try {
      await onUpgrade?.(plan, isYearly);
    } finally {
      setLoadingPlan(null);
    }
  };

  const calculatePrice = (basePrice: number) => {
    if (isYearly) {
      return Math.round(basePrice * 0.9); // 10% off
    }
    return basePrice;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="p-6 pb-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-serif font-medium mb-2 text-text-primary flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-accent-yellow" />
              Subscription & Billing
            </h2>
            <p className="text-sm text-text-secondary">
              Choose the plan that fits your needs. Upgrade or downgrade at any time.
            </p>
          </div>
          
          {/* Billing Cycle Toggle */}
          <div className="flex items-center gap-3 bg-surface-elevated p-1 rounded-xl border border-outline-light self-start">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                !isYearly 
                  ? 'bg-surface-layer text-text-primary shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                isYearly 
                  ? 'bg-surface-layer text-text-primary shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Yearly
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent-yellow bg-accent-yellow/10 px-1.5 py-0.5 rounded">
                -10%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const price = calculatePrice(plan.price);
            const Icon = plan.icon || Zap;

            return (
              <div 
                key={plan.id}
                className={`
                  relative flex flex-col p-6 rounded-2xl border transition-all duration-300
                  ${plan.highlight 
                    ? 'border-accent-yellow/50 bg-accent-yellow/5 shadow-[0_0_30px_-10px_rgba(252,160,0,0.1)]' 
                    : 'border-outline-light bg-surface-base hover:border-outline-mid'
                  }
                  ${isCurrent ? 'ring-2 ring-accent-yellow ring-offset-2 ring-offset-surface-base' : ''}
                `}
              >
                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-serif font-medium text-text-primary">
                      {plan.name}
                    </h3>
                    {plan.highlight && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent-yellow bg-accent-yellow/10 px-2 py-1 rounded-full border border-accent-yellow/20">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 text-text-primary">
                    <span className="text-3xl font-bold tracking-tight">
                      HKD ${price}
                    </span>
                    <span className="text-text-secondary text-sm">
                      /month
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mt-3 leading-relaxed">
                    {plan.description}
                  </p>
                </div>

                {/* Features */}
                <div className="flex-1 space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-text-secondary">
                      <div className="mt-0.5 p-0.5 rounded-full bg-surface-elevated text-accent-yellow">
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="leading-snug">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                <Button
                  variant={isCurrent ? "secondary" : plan.highlight ? "primary" : "outline"}
                  className={`w-full ${isCurrent ? 'opacity-100 cursor-default' : ''}`}
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCurrent || loadingPlan !== null}
                >
                  {loadingPlan === plan.id ? (
                    'Processing...'
                  ) : isCurrent ? (
                    'Current Plan'
                  ) : (
                    `Upgrade to ${plan.name}`
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mt-12 p-6 rounded-xl bg-surface-elevated border border-outline-light">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-surface-layer text-accent-yellow">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-medium text-text-primary mb-1">
                Enterprise Security & Privacy
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
                All plans include our enterprise-grade security features. Your data is encrypted at rest and in transit.
                We never train our models on your private data without your explicit permission.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
