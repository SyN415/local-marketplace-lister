import React from 'react';
import { Box, Button, Container, Typography, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';

const Hero: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '90vh',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        background: `radial-gradient(circle at 50% 50%, ${theme.palette.primary.dark}20 0%, ${theme.palette.background.default} 100%)`,
        pt: { xs: 12, md: 0 },
      }}
    >
      {/* Background Elements */}
      <Box
        component={motion.div}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        sx={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.palette.primary.main}40 0%, transparent 70%)`,
          filter: 'blur(40px)',
          zIndex: 0,
        }}
      />
      <Box
        component={motion.div}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
        sx={{
          position: 'absolute',
          bottom: '10%',
          right: '5%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.palette.secondary.main}30 0%, transparent 70%)`,
          filter: 'blur(60px)',
          zIndex: 0,
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            gap: 6,
          }}
        >
          {/* Text Content */}
          <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Typography
                variant="h1"
                component="h1"
                sx={{
                  fontSize: { xs: '2.5rem', md: '3.5rem', lg: '4rem' },
                  fontWeight: 800,
                  lineHeight: 1.2,
                  mb: 2,
                  background: `linear-gradient(135deg, #fff 0%, ${theme.palette.primary.light} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Dominate Local Marketplaces. One Click.
              </Typography>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Typography
                variant="h5"
                color="text.secondary"
                sx={{ mb: 4, maxWidth: '600px', mx: { xs: 'auto', md: 0 } }}
              >
                Cross-post to Facebook, Craigslist, and OfferUp instantly. Manage inventory, track sales, and scale your hustle with AI-powered tools.
              </Typography>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  justifyContent: { xs: 'center', md: 'flex-start' },
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/signup')}
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    borderRadius: '50px',
                  }}
                >
                  Start for Free
                </Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  size="large"
                  startIcon={<PlayCircleOutlineIcon />}
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    borderRadius: '50px',
                    borderColor: 'rgba(255,255,255,0.2)',
                    '&:hover': {
                      borderColor: 'rgba(255,255,255,0.5)',
                      background: 'rgba(255,255,255,0.05)',
                    },
                  }}
                >
                  View Demo
                </Button>
              </Box>
            </motion.div>
          </Box>

          {/* Visual/Dashboard Mockup */}
          <Box sx={{ flex: 1, width: '100%', display: 'flex', justifyContent: 'center' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotateX: 20 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              transition={{ duration: 0.8, delay: 0.4, type: "spring" }}
              style={{ perspective: '1000px' }}
            >
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: '600px',
                  aspectRatio: '16/10',
                  background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
                  borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: `0 20px 50px -10px ${theme.palette.primary.main}40`,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Mockup Header */}
                <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 1 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ef4444' }} />
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#eab308' }} />
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#22c55e' }} />
                </Box>
                
                {/* Mockup Content */}
                <Box sx={{ p: 3, flex: 1, display: 'flex', gap: 2 }}>
                  {/* Sidebar */}
                  <Box sx={{ width: '20%', bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }} />
                  
                  {/* Main Area */}
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ height: '20%', bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, width: '60%' }} />
                    <Box sx={{ display: 'flex', gap: 2, height: '30%' }}>
                      <Box sx={{ flex: 1, bgcolor: theme.palette.primary.main, opacity: 0.2, borderRadius: 2 }} />
                      <Box sx={{ flex: 1, bgcolor: theme.palette.secondary.main, opacity: 0.2, borderRadius: 2 }} />
                      <Box sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }} />
                    </Box>
                    <Box sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }} />
                  </Box>
                </Box>

                {/* Floating Badge */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    position: 'absolute',
                    bottom: '20%',
                    left: '-5%',
                    background: 'rgba(15, 23, 42, 0.8)',
                    backdropFilter: 'blur(10px)',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#22c55e', boxShadow: '0 0 10px #22c55e' }} />
                  <Typography variant="subtitle2" fontWeight="bold">
                    +127% Sales
                  </Typography>
                </motion.div>
              </Box>
            </motion.div>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Hero;