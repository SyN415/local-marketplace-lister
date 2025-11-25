/**
 * Home Page (Landing Page)
 * 
 * Wispr Flow Design System implementation
 * Main landing page for unauthenticated users
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';
import Trust from '../components/landing/Trust';
import PricingPreview from '../components/landing/PricingPreview';
import Footer from '../components/landing/Footer';
import { useAuth } from '../hooks/useAuth';

const Home: React.FC = () => {
  const { user, isLoading } = useAuth();

  // If user is authenticated, redirect to dashboard
  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-background text-foreground overflow-x-hidden"
    >
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 px-4 py-2 bg-primary text-white rounded-lg font-medium"
      >
        Skip to main content
      </a>

      <main id="main-content">
        {/* Hero Section */}
        <Hero />

        {/* Features Section */}
        <Features />

        {/* Trust/Testimonials Section */}
        <Trust />

        {/* Pricing Preview Section */}
        <PricingPreview />
      </main>

      {/* Footer */}
      <Footer />
    </motion.div>
  );
};

export default Home;