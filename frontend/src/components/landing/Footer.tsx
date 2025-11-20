import React from 'react';
import { Box, Container, Grid, Typography, Link, IconButton, useTheme } from '@mui/material';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

const Footer: React.FC = () => {
  const theme = useTheme();

  return (
    <Box
      component="footer"
      sx={{
        py: 8,
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.9)' : 'rgba(248, 250, 252, 0.9)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Local Marketplace Lister
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              The ultimate tool for local sellers. Cross-post, manage inventory, and scale your business with ease.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton size="small" color="inherit">
                <TwitterIcon />
              </IconButton>
              <IconButton size="small" color="inherit">
                <InstagramIcon />
              </IconButton>
              <IconButton size="small" color="inherit">
                <LinkedInIcon />
              </IconButton>
            </Box>
          </Grid>

          <Grid size={{ xs: 6, md: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Product
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="#" color="text.secondary" underline="hover">Features</Link>
              <Link href="#" color="text.secondary" underline="hover">Pricing</Link>
              <Link href="#" color="text.secondary" underline="hover">Chrome Extension</Link>
              <Link href="#" color="text.secondary" underline="hover">Changelog</Link>
            </Box>
          </Grid>

          <Grid size={{ xs: 6, md: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Resources
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="#" color="text.secondary" underline="hover">Blog</Link>
              <Link href="#" color="text.secondary" underline="hover">Documentation</Link>
              <Link href="#" color="text.secondary" underline="hover">Community</Link>
              <Link href="#" color="text.secondary" underline="hover">Help Center</Link>
            </Box>
          </Grid>

          <Grid size={{ xs: 6, md: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Company
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="#" color="text.secondary" underline="hover">About</Link>
              <Link href="#" color="text.secondary" underline="hover">Careers</Link>
              <Link href="#" color="text.secondary" underline="hover">Legal</Link>
              <Link href="#" color="text.secondary" underline="hover">Contact</Link>
            </Box>
          </Grid>
          
          <Grid size={{ xs: 6, md: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Legal
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="#" color="text.secondary" underline="hover">Privacy</Link>
              <Link href="#" color="text.secondary" underline="hover">Terms</Link>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ mt: 8, pt: 4, borderTop: '1px solid rgba(255, 255, 255, 0.05)', textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} Local Marketplace Lister. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;