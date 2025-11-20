import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import StatsCards from '../components/dashboard/StatsCards';
import RecentListings from '../components/dashboard/RecentListings';

const Dashboard: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 0, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
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