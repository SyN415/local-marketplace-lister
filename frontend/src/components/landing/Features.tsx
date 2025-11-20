import React from 'react';
import { Box, Container, Grid, Typography, Card, CardContent, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ShareIcon from '@mui/icons-material/Share';
import InventoryIcon from '@mui/icons-material/Inventory';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

const features = [
  {
    title: 'Cross-Listing Engine',
    description: 'Post your items to Facebook Marketplace, Craigslist, and OfferUp in seconds. Multiply your reach instantly.',
    icon: <ShareIcon fontSize="large" />,
    color: '#6366f1',
  },
  {
    title: 'Inventory Sync',
    description: 'Sell once, delist everywhere. Keep your inventory organized and avoid double-selling with our centralized dashboard.',
    icon: <InventoryIcon fontSize="large" />,
    color: '#ec4899',
  },
  {
    title: 'AI-Powered Listings',
    description: 'Stop writing descriptions. Our AI generates SEO-optimized titles and descriptions that sell faster.',
    icon: <AutoAwesomeIcon fontSize="large" />,
    color: '#8b5cf6',
  },
  {
    title: 'Analytics Dashboard',
    description: 'Track your profit, visualize growth, and identify your best-selling categories with detailed analytics.',
    icon: <TrendingUpIcon fontSize="large" />,
    color: '#10b981',
  },
];

const FeatureCard = ({ feature, index }: { feature: typeof features[0]; index: number }) => {
  const theme = useTheme();
  
  return (
    <Grid size={{ xs: 12, md: 6, lg: 3 }}>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
      >
        <Card
          sx={{
            height: '100%',
            background: theme.palette.mode === 'dark' 
              ? 'rgba(30, 41, 59, 0.4)' 
              : 'rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              transform: 'translateY(-8px)',
              boxShadow: `0 20px 40px -10px ${feature.color}30`,
              borderColor: `${feature.color}50`,
            },
          }}
        >
          <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(135deg, ${feature.color}20 0%, ${feature.color}10 100%)`,
                color: feature.color,
                mb: 2,
              }}
            >
              {feature.icon}
            </Box>
            <Typography variant="h5" component="h3" fontWeight="bold" gutterBottom>
              {feature.title}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              {feature.description}
            </Typography>
          </CardContent>
        </Card>
      </motion.div>
    </Grid>
  );
};

const Features: React.FC = () => {
  return (
    <Box sx={{ py: 12, position: 'relative', overflow: 'hidden' }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Typography
              variant="h2"
              component="h2"
              sx={{
                fontWeight: 800,
                mb: 2,
                background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Everything You Need to Scale
            </Typography>
            <Typography variant="h5" color="text.secondary" sx={{ maxWidth: '600px', mx: 'auto' }}>
              Powerful tools designed for the modern local marketplace seller.
            </Typography>
          </motion.div>
        </Box>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default Features;