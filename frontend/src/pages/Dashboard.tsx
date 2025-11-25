/**
 * Dashboard Page
 *
 * Wispr Flow Design System implementation
 * Features:
 * - Welcome section with user greeting and mascot
 * - Quick actions for common tasks
 * - Stats overview with animated cards
 * - Recent listings with empty state handling
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Link as LinkIcon,
  BarChart3,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { useDefaultPalette } from '../hooks/useLogoColors';
import { useDashboard } from '../hooks/useDashboard';
import { getUserDisplayName } from '../utils/auth';
import StatsCards from '../components/dashboard/StatsCards';
import { EmailProxyStats } from '../components/dashboard/EmailProxyStats';
import RecentListings from '../components/dashboard/RecentListings';
import { Mascot } from '../components/ui/Mascot';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { cn } from '../lib/utils';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
};

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  description: string;
  href: string;
  gradient: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const palette = useDefaultPalette();
  const { isRefetching, refetch } = useDashboard();

  const displayName = user ? getUserDisplayName(user) : 'there';
  const credits = user?.credits ?? 0;

  // Determine greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Determine mascot variation based on stats
  const getMascotVariation = () => {
    if (credits === 0) return 'sad';
    if (credits < 3) return 'sleepy';
    return 'happy';
  };

  const quickActions: QuickAction[] = [
    {
      icon: <Plus className="w-5 h-5" />,
      label: 'Create Listing',
      description: 'List a new item',
      href: '/create-listing',
      gradient: 'from-[var(--color-pulse)] to-[var(--color-drift)]',
    },
    {
      icon: <LinkIcon className="w-5 h-5" />,
      label: 'Connections',
      description: 'Manage platforms',
      href: '/connections',
      gradient: 'from-[var(--color-calm)] to-emerald-500',
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      label: 'My Listings',
      description: 'View all items',
      href: '/listings',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      label: 'Buy Credits',
      description: 'Get more posts',
      href: '/pricing',
      gradient: 'from-orange-500 to-amber-500',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle gradient background */}
      <div
        className="fixed inset-0 pointer-events-none -z-10"
        style={{
          background: `radial-gradient(ellipse at top, ${palette.vibrant.rgba(0.03)} 0%, transparent 50%)`,
        }}
      />

      <div className="container-wispr py-6 md:py-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Welcome Section */}
          <motion.section variants={itemVariants} className="relative">
            <Card className="overflow-hidden bg-gradient-to-br from-card to-[var(--color-pulse-10)] border-border/50 rounded-2xl">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  {/* Greeting */}
                  <div className="flex items-center gap-4 md:gap-6">
                    <Mascot
                      variation={getMascotVariation()}
                      size="lg"
                      animated
                      responsive
                    />
                    <div>
                      <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                        {getGreeting()}, {displayName}!
                      </h1>
                      <p className="text-foreground-muted mt-1">
                        {credits > 0
                          ? `You have ${credits} credit${credits !== 1 ? 's' : ''} available to post.`
                          : 'You need credits to post listings. Get some now!'}
                      </p>
                    </div>
                  </div>

                  {/* Refresh Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isRefetching}
                    className="rounded-xl border-primary/20 hover:bg-primary/5"
                  >
                    <RefreshCw className={cn(
                      "w-4 h-4 mr-2",
                      isRefetching && "animate-spin"
                    )} />
                    Refresh
                  </Button>
                </div>

                {/* Low Credits Warning */}
                {credits <= 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 bg-warning/10 border border-warning/20 rounded-xl flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                        <span className="text-lg">⚡</span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {credits === 0 ? 'Out of credits!' : 'Running low on credits'}
                        </p>
                        <p className="text-sm text-foreground-muted">
                          Get more credits to keep posting to multiple platforms.
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate('/pricing')}
                      className="bg-gradient-to-r from-[var(--color-pulse)] to-[var(--color-drift)] hover:opacity-90 text-white rounded-xl whitespace-nowrap"
                    >
                      Buy Credits
                    </Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.section>

          {/* Quick Actions */}
          <motion.section variants={itemVariants}>
            <h2 className="text-lg font-display font-semibold text-foreground mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <motion.button
                  key={action.label}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(action.href)}
                  className={cn(
                    "group relative overflow-hidden rounded-xl p-4 text-left transition-all",
                    "bg-card border border-border/50 hover:border-primary/30",
                    "hover:shadow-lg hover:shadow-primary/5"
                  )}
                >
                  {/* Gradient background on hover */}
                  <div
                    className={cn(
                      "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity",
                      `bg-gradient-to-br ${action.gradient}`
                    )}
                  />
                  
                  <div className="relative z-10">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center mb-3",
                      `bg-gradient-to-br ${action.gradient}`,
                      "text-white shadow-md"
                    )}>
                      {action.icon}
                    </div>
                    <h3 className="font-display font-semibold text-foreground text-sm">
                      {action.label}
                    </h3>
                    <p className="text-xs text-foreground-muted mt-0.5">
                      {action.description}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.section>

          {/* Stats Overview */}
          <motion.section variants={itemVariants}>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="md:col-span-2 lg:col-span-2">
                <StatsCards />
              </div>
              <div className="md:col-span-2 lg:col-span-1">
                <EmailProxyStats />
              </div>
            </div>
          </motion.section>

          {/* Recent Listings */}
          <motion.section variants={itemVariants}>
            <RecentListings limit={5} />
          </motion.section>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;