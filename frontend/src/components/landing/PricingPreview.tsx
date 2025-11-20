import React from 'react';
import { Box, Container, Typography, Grid, Card, CardContent, Button, List, ListItem, ListItemIcon, ListItemText, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';

const PricingPreview: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Box sx={{ py: 12 }}>
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
              sx={{ fontWeight: 800, mb: 2 }}
            >
              Flexible Credit System
            </Typography>
            <Typography variant="h5" color="text.secondary">
              No monthly subscriptions. Pay only when you sell.
            </Typography>
          </motion.div>
        </Box>

        <Grid container spacing={4} justifyContent="center">
          {/* Starter Pack */}
          <Grid size={{ xs: 12, md: 5 }}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card
                sx={{
                  height: '100%',
                  background: theme.palette.mode === 'dark'
                    ? 'rgba(30, 41, 59, 0.4)'
                    : 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 4,
                }}
              >
                <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Starter Pack
                  </Typography>
                  <Typography variant="h3" fontWeight="800" sx={{ mb: 1 }}>
                    $10
                    <Typography component="span" variant="h6" color="text.secondary">
                      /10 credits
                    </Typography>
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                    Perfect for testing the waters.
                  </Typography>

                  <List sx={{ mb: 4, flex: 1 }}>
                    {['$1.00 per post', 'Credits never expire', 'Access to all features', 'Community Support'].map((item, index) => (
                      <ListItem key={index} disableGutters>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <CheckCircleIcon color="primary" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={item} />
                      </ListItem>
                    ))}
                  </List>

                  <Button
                    variant="outlined"
                    color="primary"
                    size="large"
                    fullWidth
                    onClick={() => navigate('/signup')}
                    sx={{ borderRadius: '50px', py: 1.5 }}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Hustler Pack */}
          <Grid size={{ xs: 12, md: 5 }}>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card
                sx={{
                  height: '100%',
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark}20 0%, ${theme.palette.secondary.dark}20 100%)`,
                  backdropFilter: 'blur(12px)',
                  border: `1px solid ${theme.palette.primary.main}50`,
                  borderRadius: 4,
                  position: 'relative',
                  overflow: 'visible',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: -12,
                    right: 24,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    color: '#fff',
                    px: 2,
                    py: 0.5,
                    borderRadius: '20px',
                    fontSize: '0.875rem',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  }}
                >
                  BEST VALUE
                </Box>
                <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Hustler Pack
                  </Typography>
                  <Typography variant="h3" fontWeight="800" sx={{ mb: 1 }}>
                    $20
                    <Typography component="span" variant="h6" color="text.secondary">
                      /25 credits
                    </Typography>
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                    Best value for regular sellers.
                  </Typography>

                  <List sx={{ mb: 4, flex: 1 }}>
                    {['$0.80 per post (20% off)', 'Credits never expire', 'Priority Listing', 'AI Description Generator', 'Premium Support'].map((item, index) => (
                      <ListItem key={index} disableGutters>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <CheckCircleIcon color="secondary" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={item} />
                      </ListItem>
                    ))}
                  </List>

                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    fullWidth
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => navigate('/signup')}
                    sx={{ borderRadius: '50px', py: 1.5 }}
                  >
                    Buy Credits
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default PricingPreview;