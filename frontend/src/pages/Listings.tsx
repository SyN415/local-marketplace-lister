import { Typography, Card, CardContent, CardMedia, Box, Container } from '@mui/material';

const Listings = () => {
  return (
    <Container maxWidth="lg">
      <Typography variant="h3" component="h1" gutterBottom>
        Browse Listings
      </Typography>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
        {/* Sample listing card - this will be replaced with real data */}
        <Card>
          <CardMedia
            component="img"
            height="200"
            image="/api/placeholder/300/200"
            alt="Sample listing"
          />
          <CardContent>
            <Typography variant="h6" component="h2">
              Sample Listing
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This is a sample listing description. In the real app, this will show actual listings from the database.
            </Typography>
            <Typography variant="h6" color="primary">
              $100
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default Listings;