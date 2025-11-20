import React from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';

const Hero: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '90vh',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        bgcolor: 'background.default',
        pt: { xs: 12, md: 0 },
        borderBottom: '2px solid #000',
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 8,
            alignItems: 'center',
          }}
        >
          {/* Text Content */}
          <Box>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Typography
                variant="h1"
                component="h1"
                sx={{
                  fontSize: { xs: '3.5rem', md: '4.5rem', lg: '5.5rem' },
                  fontWeight: 900,
                  lineHeight: 0.9,
                  mb: 4,
                  color: 'text.primary',
                  textTransform: 'uppercase',
                  letterSpacing: '-0.04em',
                }}
              >
                Dominate Local Marketplaces.
              </Typography>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Typography
                variant="h5"
                color="text.secondary"
                sx={{
                  mb: 6,
                  maxWidth: '600px',
                  fontWeight: 500,
                  lineHeight: 1.4,
                  fontSize: '1.25rem'
                }}
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
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/signup')}
                  disableElevation
                  sx={{
                    px: 5,
                    py: 2,
                    fontSize: '1rem',
                    fontWeight: 700,
                    borderRadius: 0,
                    textTransform: 'uppercase',
                    border: '2px solid',
                    borderColor: 'primary.main',
                    '&:hover': {
                        bgcolor: 'transparent',
                        color: 'primary.main'
                    }
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
                    px: 5,
                    py: 2,
                    fontSize: '1rem',
                    fontWeight: 700,
                    borderRadius: 0,
                    textTransform: 'uppercase',
                    border: '2px solid',
                    borderColor: 'text.primary',
                    color: 'text.primary',
                    '&:hover': {
                      bgcolor: 'text.primary',
                      color: 'background.paper',
                      borderColor: 'text.primary',
                    },
                  }}
                >
                  View Demo
                </Button>
              </Box>
            </motion.div>
          </Box>

          {/* Visual/Dashboard Mockup */}
          <Box>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "circOut" }}
            >
              <Box sx={{ position: 'relative' }}>
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '16/10',
                    bgcolor: 'background.paper',
                    borderRadius: 0,
                    border: '2px solid',
                    borderColor: 'text.primary',
                    boxShadow: '12px 12px 0px currentColor',
                    color: 'text.primary',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Mockup Header */}
                  <Box sx={{ p: 1.5, borderBottom: '2px solid', borderColor: 'inherit', display: 'flex', gap: 1, bgcolor: 'action.hover' }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: 0, border: '1px solid', borderColor: 'inherit', bgcolor: 'background.paper' }} />
                    <Box sx={{ width: 12, height: 12, borderRadius: 0, border: '1px solid', borderColor: 'inherit', bgcolor: 'background.paper' }} />
                    <Box sx={{ width: 12, height: 12, borderRadius: 0, border: '1px solid', borderColor: 'inherit', bgcolor: 'background.paper' }} />
                  </Box>
                  
                  {/* Mockup Content */}
                  <Box sx={{ p: 3, flex: 1, display: 'flex', gap: 2, bgcolor: 'background.paper' }}>
                    {/* Sidebar */}
                    <Box sx={{ width: '25%', borderRight: '2px solid', borderColor: 'divider', pr: 2 }}>
                        <Box sx={{ height: 20, width: '80%', bgcolor: 'text.primary', mb: 2 }} />
                        <Box sx={{ height: 10, width: '100%', bgcolor: 'action.hover', mb: 1 }} />
                        <Box sx={{ height: 10, width: '100%', bgcolor: 'action.hover', mb: 1 }} />
                        <Box sx={{ height: 10, width: '100%', bgcolor: 'action.hover', mb: 1 }} />
                    </Box>
                    
                    {/* Main Area */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ height: '20%', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }} />
                      <Box sx={{ display: 'flex', gap: 2, height: '40%' }}>
                        <Box sx={{ flex: 1, bgcolor: 'primary.main', border: '1px solid', borderColor: 'divider' }} />
                        <Box sx={{ flex: 1, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }} />
                      </Box>
                    </Box>
                  </Box>
                </Box>

                {/* Floating Badge */}
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    position: 'absolute',
                    bottom: '-20px',
                    left: '-20px',
                    background: '#fff',
                    padding: '16px 24px',
                    border: '2px solid #000',
                    boxShadow: '8px 8px 0px #000',
                    zIndex: 2,
                  }}
                >
                  <Typography variant="h6" fontWeight="900" sx={{ color: '#000', textTransform: 'uppercase' }}>
                    +127% Growth
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