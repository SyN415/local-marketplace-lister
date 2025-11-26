/**
 * Pricing Preview Section Component
 *
 * Design System implementation
 * Features:
 * - Credit-based pricing display
 * - Gradient cards with hover effects
 * - Best value badge
 * - Animated check icons
 * - CTA buttons
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Sparkles, Zap, Crown } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Mascot } from '../ui/Mascot';
import { cn } from '../../lib/utils';
import { useDefaultPalette } from '../../hooks/useLogoColors';

interface PricingPlan {
  name: string;
  price: string;
  credits: string;
  perCredit: string;
  description: string;
  features: string[];
  popular?: boolean;
  icon: React.ReactNode;
  gradient: string;
  buttonVariant: 'default' | 'outline';
}

const plans: PricingPlan[] = [
  {
    name: 'Starter Pack',
    price: '$10',
    credits: '10 credits',
    perCredit: '$1.00 per post',
    description: 'Perfect for trying things out',
    features: [
      'Post to all platforms',
      'Credits never expire',
      'Basic analytics',
      'Email support',
    ],
    icon: <Zap className="w-6 h-6" />,
    gradient: 'from-blue-500/10 to-cyan-500/10',
    buttonVariant: 'outline',
  },
  {
    name: 'Hustler Pack',
    price: '$20',
    credits: '25 credits',
    perCredit: '$0.80 per post • 20% off',
    description: 'Best value for regular sellers',
    features: [
      'Everything in Starter',
      'AI Description Generator',
      'Priority posting',
      'Advanced analytics',
      'Priority support',
    ],
    popular: true,
    icon: <Crown className="w-6 h-6" />,
    gradient: 'from-primary/20 to-secondary/20',
    buttonVariant: 'default',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
};

const PricingCard: React.FC<{ plan: PricingPlan }> = ({ plan }) => {
  const navigate = useNavigate();

  return (
    <motion.div variants={itemVariants} className="h-full">
      <Card className={cn(
        'h-full relative overflow-hidden group',
        'bg-card border-2',
        plan.popular 
          ? 'border-primary shadow-xl shadow-primary/10' 
          : 'border-border/50 hover:border-primary/30',
        'transition-all duration-300',
      )}>
        {/* Popular Badge */}
        {plan.popular && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
            <div className="px-4 py-1.5 bg-gradient-to-r from-primary to-secondary text-white text-sm font-bold rounded-full shadow-lg flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Best Value
            </div>
          </div>
        )}

        {/* Background Gradient */}
        <div className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-50',
          plan.gradient
        )} />

        <CardContent className="relative p-6 md:p-8 flex flex-col h-full">
          {/* Header */}
          <div className="mb-6">
            <div className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center mb-4',
              'bg-gradient-to-br',
              plan.popular ? 'from-primary to-secondary text-white' : 'from-primary/10 to-secondary/10 text-primary'
            )}>
              {plan.icon}
            </div>
            
            <h3 className="font-display text-xl font-bold text-foreground mb-1">
              {plan.name}
            </h3>
            <p className="text-sm text-foreground-muted">{plan.description}</p>
          </div>

          {/* Price */}
          <div className="mb-6">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-display text-4xl md:text-5xl font-bold text-foreground">
                {plan.price}
              </span>
              <span className="text-foreground-muted">/ {plan.credits}</span>
            </div>
            <div className={cn(
              'text-sm font-medium',
              plan.popular ? 'text-primary' : 'text-foreground-muted'
            )}>
              {plan.perCredit}
            </div>
          </div>

          {/* Features */}
          <ul className="space-y-3 mb-8 flex-1">
            {plan.features.map((feature, index) => (
              <motion.li
                key={feature}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3"
              >
                <CheckCircle2 className={cn(
                  'w-5 h-5 flex-shrink-0 mt-0.5',
                  plan.popular ? 'text-primary' : 'text-green-500'
                )} />
                <span className="text-foreground/90">{feature}</span>
              </motion.li>
            ))}
          </ul>

          {/* CTA Button */}
          <Button
            size="lg"
            variant={plan.buttonVariant}
            onClick={() => navigate('/signup')}
            className={cn(
              'w-full font-display font-semibold rounded-xl h-12',
              plan.popular
                ? 'bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white border-0 shadow-lg shadow-primary/25'
                : 'border-2 border-primary/30 text-primary hover:bg-primary/5'
            )}
          >
            {plan.popular ? (
              <span className="flex items-center gap-2">
                Get Started <ArrowRight className="w-4 h-4" />
              </span>
            ) : (
              'Start with Starter'
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const PricingPreview: React.FC = () => {
  const navigate = useNavigate();
  const palette = useDefaultPalette();

  return (
    <section
      className="py-16 md:py-24 relative overflow-hidden"
      style={{
        background: `
          linear-gradient(
            180deg,
            transparent 0%,
            ${palette.muted.rgba(0.03)} 50%,
            ${palette.vibrant.rgba(0.05)} 100%
          )
        `,
      }}
    >
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none' stroke='%239F88C8' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Simple Pricing</span>
          </span>

          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6">
            Pay As You{' '}
            <span className="bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
              Sell
            </span>
          </h2>

          <p className="font-body text-lg md:text-xl text-foreground-muted max-w-2xl mx-auto">
            No monthly subscriptions. No hidden fees. Just buy credits and start posting. 
            Credits never expire, so you can sell at your own pace.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
        >
          {plans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </motion.div>

        {/* Bottom Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-4 px-6 py-4 rounded-2xl bg-card border border-border">
            <Mascot variation="superhero" size="sm" animated animation="bounce" />
            <div className="text-left">
              <div className="font-display font-semibold text-foreground">Need more credits?</div>
              <div className="text-sm text-foreground-muted">
                Check out our <button onClick={() => navigate('/pricing')} className="text-primary hover:underline">full pricing page</button> for bulk discounts.
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingPreview;