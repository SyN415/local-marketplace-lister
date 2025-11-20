import React from 'react';
import { Box, useTheme } from '@mui/material';
import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';
import Trust from '../components/landing/Trust';
import PricingPreview from '../components/landing/PricingPreview';
import Footer from '../components/landing/Footer';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

const Home: React.FC = () => {
  const theme = useTheme();
  const { user, isLoading } = useAuth();

  // If user is authenticated, redirect to dashboard (or listings for now)
  // This logic might be better placed in a route guard or App.tsx,
  // but for now we'll keep the Home page as the Landing page for non-auth users.
  if (!isLoading && user) {
    console.log('[Debug] Home page redirecting to /dashboard. Current path:', window.location.pathname);
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Box
      sx={{
        bgcolor: theme.palette.background.default,
        color: theme.palette.text.primary,
        minHeight: '100vh',
        overflowX: 'hidden',
      }}
    >
      <Hero />
      <Features />
      <Trust />
      <PricingPreview />
      <Footer />
    </Box>
  );
};

export default Home;