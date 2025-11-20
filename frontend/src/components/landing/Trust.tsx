import React from 'react';
import { Box, Container, Typography, Grid, Avatar, Card, CardContent, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import StarIcon from '@mui/icons-material/Star';

const testimonials = [
  {
    name: 'Sarah J.',
    role: 'Power Seller',
    content: "I used to spend hours posting to different sites. Now it takes me 5 minutes. My sales have doubled since I started using this tool.",
    avatar: 'S',
    color: '#6366f1',
  },
  {
    name: 'Mike T.',
    role: 'Furniture Flipper',
    content: "The inventory management is a game changer. I never accidentally double-sell items anymore. Highly recommended!",
    avatar: 'M',
    color: '#ec4899',
  },
  {
    name: 'Jessica R.',
    role: 'Vintage Clothing',
    content: "The AI descriptions are surprisingly good. They actually sound like a human wrote them, but better optimized for search.",
    avatar: 'J',
    color: '#10b981',
  },
];

const Trust: React.FC = () => {
  const theme = useTheme();

  return (
    <Box sx={{ py: 12, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
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
              Trusted by Top Sellers
            </Typography>
            <Typography variant="h5" color="text.secondary">
              Join thousands of sellers scaling their local marketplace business.
            </Typography>
          </motion.div>
        </Box>

        <Grid container spacing={4}>
          {testimonials.map((testimonial, index) => (
            <Grid size={{ xs: 12, md: 4 }} key={index}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card
                  sx={{
                    height: '100%',
                    background: theme.palette.mode === 'dark' 
                      ? 'rgba(30, 41, 59, 0.4)' 
                      : 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 2, color: '#eab308' }}>
                      {[...Array(5)].map((_, i) => (
                        <StarIcon key={i} fontSize="small" />
                      ))}
                    </Box>
                    <Typography variant="body1" paragraph sx={{ mb: 3, minHeight: '80px' }}>
                      "{testimonial.content}"
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: testimonial.color,
                          width: 48,
                          height: 48,
                          fontWeight: 'bold',
                        }}
                      >
                        {testimonial.avatar}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {testimonial.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {testimonial.role}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default Trust;