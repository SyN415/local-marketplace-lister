import { Typography, Box, Container } from '@mui/material';

const Home = () => {
  return (
    <Container maxWidth="md">
      <Box sx={{ textAlign: 'center', mt: 8 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          Welcome to Local Marketplace
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph>
          Buy and sell items in your local community
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Browse listings, create your own, and connect with local buyers and sellers.
        </Typography>
      </Box>
    </Container>
  );
};

export default Home;