/**
 * Features Section Component
 *
 * Design System implementation
 * Features:
 * - Grid layout with logo-styled cards
 * - Mascot icons per feature
 * - Soft corners and gradients
 * - Scroll reveal animations
 * - Responsive design
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Layers,
  Sparkles,
  RefreshCw,
  Zap,
  Shield,
  Globe,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Mascot } from '../ui/Mascot';
import { cn } from '../../lib/utils';
import { useDefaultPalette } from '../../hooks/useLogoColors';

interface Feature {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  mascotVariation?: 'happy' | 'excited' | 'superhero';
}

const features: Feature[] = [
  {
    title: 'Cross-Post Everywhere',
    description: 'List on Facebook Marketplace, Craigslist, and OfferUp with a single click. Reach millions of buyers instantly.',
    icon: <Layers className="w-6 h-6" />,
    gradient: 'from-primary/20 to-secondary/10',
    mascotVariation: 'happy',
  },
  {
    title: 'AI-Powered Listings',
    description: 'Our AI writes SEO-optimized titles and descriptions that sell faster. No more staring at a blank page.',
    icon: <Sparkles className="w-6 h-6" />,
    gradient: 'from-violet-500/20 to-purple-500/10',
    mascotVariation: 'excited',
  },
  {
    title: 'Smart Inventory Sync',
    description: 'Sell once, delist everywhere automatically. Never double-sell an item again with our real-time sync.',
    icon: <RefreshCw className="w-6 h-6" />,
    gradient: 'from-emerald-500/20 to-green-500/10',
    mascotVariation: 'superhero',
  },
  {
    title: 'Analytics Dashboard',
    description: 'Track views, messages, and sales across all platforms. Identify your best sellers and optimize your strategy.',
    icon: <BarChart3 className="w-6 h-6" />,
    gradient: 'from-blue-500/20 to-cyan-500/10',
    mascotVariation: 'happy',
  },
  {
    title: 'Lightning Fast',
    description: 'Create and post listings in under 60 seconds. Our streamlined workflow gets you selling faster.',
    icon: <Zap className="w-6 h-6" />,
    gradient: 'from-amber-500/20 to-orange-500/10',
    mascotVariation: 'excited',
  },
  {
    title: 'Secure & Reliable',
    description: 'Your data is encrypted and backed up. We never share your information with third parties.',
    icon: <Shield className="w-6 h-6" />,
    gradient: 'from-indigo-500/20 to-blue-500/10',
    mascotVariation: 'superhero',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
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

const FeatureCard: React.FC<{ feature: Feature; index: number }> = ({ feature }) => {
  return (
    <motion.div
      variants={itemVariants}
      className="h-full"
    >
      <Card className={cn(
        'h-full relative overflow-hidden group',
        'bg-card border-border/50',
        'hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5',
        'transition-all duration-300',
      )}>
        {/* Gradient Background */}
        <div className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500',
          feature.gradient
        )} />
        
        <CardContent className="relative p-6 md:p-8 flex flex-col h-full">
          {/* Icon Container */}
          <div className="flex items-start justify-between mb-6">
            <div className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center',
              'bg-gradient-to-br',
              feature.gradient,
              'border border-border/30',
              'group-hover:scale-110 transition-transform duration-300',
            )}>
              <div className="text-foreground">
                {feature.icon}
              </div>
            </div>
            
            {/* Mascot (visible on hover) */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-x-2 group-hover:translate-x-0">
              <Mascot 
                variation={feature.mascotVariation || 'happy'} 
                size="xs" 
                animated 
                animation="bounce"
              />
            </div>
          </div>

          {/* Content */}
          <h3 className="font-display text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors duration-300">
            {feature.title}
          </h3>
          
          <p className="font-body text-foreground-muted leading-relaxed flex-1">
            {feature.description}
          </p>

          {/* Bottom Accent Line */}
          <div className="mt-6 h-1 w-12 rounded-full bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:w-20" />
        </CardContent>
      </Card>
    </motion.div>
  );
};

const Features: React.FC = () => {
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
            transparent 100%
          )
        `,
      }}
    >
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='2' fill='%239F88C8'/%3E%3C/svg%3E")`,
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
            <Globe className="w-4 h-4" />
            <span>Powerful Features</span>
          </span>
          
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6">
            Everything You Need to{' '}
            <span className="bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
              Scale
            </span>
          </h2>
          
          <p className="font-body text-lg md:text-xl text-foreground-muted max-w-2xl mx-auto">
            Powerful tools designed for modern marketplace sellers. 
            Stop juggling platforms and start growing your business.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
        >
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </motion.div>

        {/* Bottom CTA Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-4 px-6 py-4 rounded-2xl bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20">
            <Mascot variation="excited" size="sm" animated animation="bounce" />
            <div className="text-left">
              <div className="font-display font-bold text-foreground">Ready to get started?</div>
              <div className="text-sm text-foreground-muted">Join 2,500+ sellers already using Jiggly</div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href = '/signup'}
              className="px-6 py-2.5 bg-gradient-to-r from-primary to-secondary text-white font-display font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
            >
              Start Free
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Features;