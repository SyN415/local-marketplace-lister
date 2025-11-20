import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import StatsCards from '../components/dashboard/StatsCards';
import RecentListings from '../components/dashboard/RecentListings';

const Dashboard: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" component="h1" sx={{ fontWeight: 900, mb: 4, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
        Dashboard
      </Typography>
      
      <StatsCards />
      
      <Box sx={{ mt: 4 }}>
        <RecentListings limit={5} />
      </Box>
    </Container>
  );
};

export default Dashboard;