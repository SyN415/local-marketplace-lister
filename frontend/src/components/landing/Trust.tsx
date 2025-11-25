/**
 * Trust/Testimonials Section Component
 * 
 * Wispr Flow Design System implementation
 * Features:
 * - Testimonial cards with glass effect
 * - Star ratings
 * - Avatar with gradient fallbacks
 * - Scroll reveal animations
 * - Social proof metrics
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote, Users, TrendingUp, Award } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Mascot } from '../ui/Mascot';
import { cn } from '../../lib/utils';
import { useDefaultPalette } from '../../hooks/useLogoColors';

interface Testimonial {
  name: string;
  role: string;
  content: string;
  avatar: string;
  rating: number;
  gradient: string;
}

const testimonials: Testimonial[] = [
  {
    name: 'Sarah Johnson',
    role: 'Power Seller • $50k+ Sales',
    content: "I used to spend hours posting to different sites. Now it takes me 5 minutes. My sales have literally doubled since I started using Jigglepost. It's a game-changer.",
    avatar: 'SJ',
    rating: 5,
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    name: 'Mike Thompson',
    role: 'Furniture Flipper',
    content: "The inventory sync is incredible. I never accidentally double-sell items anymore. And the AI descriptions? They're better than what I used to write myself!",
    avatar: 'MT',
    rating: 5,
    gradient: 'from-blue-500 to-cyan-600',
  },
  {
    name: 'Jessica Rivera',
    role: 'Vintage Clothing Seller',
    content: "The AI descriptions are surprisingly good. They actually sound human, but optimized for search. I've seen a 40% increase in inquiries since switching.",
    avatar: 'JR',
    rating: 5,
    gradient: 'from-pink-500 to-rose-600',
  },
];

const stats = [
  { icon: <Users className="w-6 h-6" />, value: '2,500+', label: 'Active Sellers' },
  { icon: <TrendingUp className="w-6 h-6" />, value: '$2M+', label: 'Items Sold' },
  { icon: <Award className="w-6 h-6" />, value: '4.9/5', label: 'Average Rating' },
];

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
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
};

const TestimonialCard: React.FC<{ testimonial: Testimonial; index: number }> = ({ testimonial }) => {
  return (
    <motion.div variants={itemVariants} className="h-full">
      <Card className={cn(
        'h-full relative overflow-hidden group',
        'bg-card border-border/50',
        'hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10',
        'transition-all duration-300',
      )}>
        <CardContent className="p-6 md:p-8 flex flex-col h-full">
          {/* Quote Icon */}
          <div className="mb-6">
            <Quote className="w-8 h-8 text-primary/30" />
          </div>

          {/* Rating */}
          <div className="flex gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'w-4 h-4 transition-colors',
                  i < testimonial.rating
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-gray-300'
                )}
              />
            ))}
          </div>

          {/* Content */}
          <blockquote className="font-body text-foreground leading-relaxed flex-1 mb-6 italic">
            "{testimonial.content}"
          </blockquote>

          {/* Author */}
          <div className="flex items-center gap-4 mt-auto pt-4 border-t border-border/50">
            <Avatar className={cn('h-12 w-12 border-2 border-white dark:border-gray-800 shadow-lg')}>
              <AvatarFallback 
                className={cn(
                  'bg-gradient-to-br text-white font-bold',
                  testimonial.gradient
                )}
              >
                {testimonial.avatar}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-display font-bold text-foreground">{testimonial.name}</div>
              <div className="text-sm text-foreground-muted">{testimonial.role}</div>
            </div>
          </div>
        </CardContent>

        {/* Hover Gradient */}
        <div className={cn(
          'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none',
          'bg-gradient-to-t from-primary/5 to-transparent'
        )} />
      </Card>
    </motion.div>
  );
};

const Trust: React.FC = () => {
  const palette = useDefaultPalette();

  return (
    <section 
      className="section-wispr relative overflow-hidden"
      style={{
        background: `
          linear-gradient(
            180deg,
            ${palette.vibrant.rgba(0.03)} 0%,
            ${palette.muted.rgba(0.05)} 50%,
            transparent 100%
          )
        `,
      }}
    >
      {/* Background Elements */}
      <div className="absolute top-1/4 right-0 w-96 h-96 rounded-full bg-gradient-to-br from-primary/5 to-secondary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-80 h-80 rounded-full bg-gradient-to-tr from-secondary/5 to-primary/5 blur-3xl pointer-events-none" />

      <div className="container-wispr relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-3 mb-6">
            <Mascot variation="happy" size="sm" animated animation="bounce" />
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium text-sm">
              <Star className="w-4 h-4 fill-current" />
              <span>Loved by Sellers</span>
            </span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6">
            Trusted by{' '}
            <span className="bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
              Top Sellers
            </span>
          </h2>

          <p className="font-body text-lg md:text-xl text-foreground-muted max-w-2xl mx-auto">
            Join thousands of sellers who are scaling their local marketplace business with Jigglepost.
          </p>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="flex items-center justify-center gap-4 p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                {stat.icon}
              </div>
              <div>
                <div className="font-display text-2xl md:text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-foreground-muted">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Testimonials Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
        >
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={testimonial.name} testimonial={testimonial} index={index} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Trust;