/**
 * Hero Section Component
 *
 * Design System implementation
 * Features:
 * - Full-viewport gradient background
 * - Mascot with entrance animation
 * - Typography aligned with design system
 * - CTA buttons with Pulse accents
 * - Responsive layout
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Mascot } from '../ui/Mascot';
import { useDefaultPalette } from '../../hooks/useLogoColors';

// Animation variants - using type assertion to avoid Framer Motion type issues
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
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
      duration: 0.6,
      ease: "easeOut" as const,
    },
  },
};

const heroImageVariants = {
  hidden: { opacity: 0, scale: 0.9, x: 50 },
  visible: {
    opacity: 1,
    scale: 1,
    x: 0,
    transition: {
      duration: 0.8,
      ease: "easeOut" as const,
      delay: 0.4,
    },
  },
};

const floatingBadgeVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      delay: 0.8,
    },
  },
  float: {
    y: [0, -8, 0],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
};

const Hero: React.FC = () => {
  const navigate = useNavigate();
  const palette = useDefaultPalette();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section 
      className="relative min-h-[92vh] flex items-center overflow-hidden"
      style={{
        background: `
          linear-gradient(
            180deg,
            ${palette.vibrant.rgba(0.08)} 0%,
            ${palette.muted.rgba(0.05)} 40%,
            transparent 80%
          ),
          var(--color-bg)
        `,
      }}
    >
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30z' fill='none' stroke='%239F88C8' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Floating gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-primary/10 to-secondary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-gradient-to-tr from-secondary/10 to-primary/5 blur-3xl pointer-events-none" />

      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column - Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isVisible ? "visible" : "hidden"}
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div variants={itemVariants} className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm border border-primary/20">
                <Sparkles className="w-4 h-4" />
                <span>AI-Powered Cross-Posting</span>
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1 
              variants={itemVariants}
              className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[0.95] tracking-tight mb-6"
            >
              <span className="block text-foreground">Sell Smarter,</span>
              <span className="block mt-2">
                <span className="bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
                  Reach Further.
                </span>
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p 
              variants={itemVariants}
              className="font-body text-lg md:text-xl text-foreground-muted leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0"
            >
              Cross-post to Facebook, Craigslist, and OfferUp in one click. 
              AI writes your descriptions. You focus on what matters — selling.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div 
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Button
                size="lg"
                onClick={() => navigate('/signup')}
                className="relative overflow-hidden bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-display font-semibold px-8 py-6 h-auto text-base rounded-xl shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 group"
              >
                <span className="relative z-10 flex items-center">
                  Start Free Today
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="border-2 border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 font-display font-semibold px-8 py-6 h-auto text-base rounded-xl transition-all duration-300 hover:-translate-y-0.5"
              >
                <Play className="mr-2 w-5 h-5" />
                Watch Demo
              </Button>
            </motion.div>

            {/* Social Proof */}
            <motion.div
              variants={itemVariants}
              className="flex items-center gap-4 mt-10 justify-center lg:justify-start"
            >
              <div className="flex -space-x-3">
                {['S', 'M', 'J', 'K'].map((initial, idx) => (
                  <div
                    key={idx}
                    className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-xs font-bold text-primary"
                  >
                    {initial}
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <span className="font-semibold text-foreground">2,500+</span>
                <span className="text-foreground-muted"> sellers growing daily</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - Visual */}
          <motion.div
            variants={heroImageVariants}
            initial="hidden"
            animate={isVisible ? "visible" : "hidden"}
            className="relative"
          >
            {/* Main Dashboard Card */}
            <div className="relative bg-card rounded-2xl shadow-2xl shadow-primary/10 border border-border/50 overflow-hidden">
              {/* Browser Chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-12 py-1 bg-background rounded-md text-xs text-foreground-muted font-mono">
                    jiggly.com
                  </div>
                </div>
              </div>

              {/* Dashboard Preview */}
              <div className="p-6 bg-background/50">
                <div className="flex gap-4">
                  {/* Sidebar */}
                  <div className="w-48 hidden md:block space-y-3">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/10">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary" />
                      <span className="text-sm font-medium text-primary">Dashboard</span>
                    </div>
                    {['Listings', 'Analytics', 'Connections'].map((item) => (
                      <div key={item} className="flex items-center gap-3 p-2 text-sm text-foreground-muted">
                        <div className="w-8 h-8 rounded-lg bg-muted" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 space-y-4">
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Active Listings', value: '42', color: 'from-primary/20 to-primary/5' },
                        { label: 'Total Views', value: '12.4k', color: 'from-secondary/20 to-secondary/5' },
                        { label: 'Revenue', value: '$8,420', color: 'from-green-500/20 to-green-500/5' },
                      ].map((stat) => (
                        <div key={stat.label} className={`p-4 rounded-xl bg-gradient-to-br ${stat.color} border border-border/30`}>
                          <div className="text-xs text-foreground-muted mb-1">{stat.label}</div>
                          <div className="text-xl font-bold font-display text-foreground">{stat.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Listing Cards */}
                    <div className="space-y-2">
                      {['iPhone 14 Pro Max', 'Vintage Leather Sofa', 'Mountain Bike'].map((item) => (
                        <div key={item} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-foreground">{item}</div>
                            <div className="text-xs text-foreground-muted">3 platforms</div>
                          </div>
                          <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Mascot Badge */}
            <AnimatePresence>
              {isVisible && (
                <motion.div
                  variants={floatingBadgeVariants}
                  initial="hidden"
                  animate={["visible", "float"]}
                  className="absolute -bottom-4 -left-4 md:-bottom-6 md:-left-8 z-20"
                >
                  <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-border">
                    <Mascot 
                      variation="happy" 
                      size="sm" 
                      animated 
                      animation="bounce"
                    />
                    <div>
                      <div className="text-xs text-foreground-muted">This month</div>
                      <div className="text-lg font-bold font-display text-primary">+127% Sales</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Badge */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="absolute -top-4 -right-2 md:-right-4 z-20"
            >
              <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg shadow-lg text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                <span>AI Writes For You</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};

export default Hero;