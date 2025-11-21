import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Paper,
  Chip,
  Divider,
  Stack,
  CircularProgress,
  Alert,
  Card,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  LocationOn as LocationIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  OpenInNew as OpenInNewIcon,
  Refresh as RefreshIcon,
  Public as PublicIcon,
  Facebook as FacebookIcon,
  Storefront as StorefrontIcon
} from '@mui/icons-material';
import { useGetListing, useDeleteListing } from '../hooks/useListings';

// Mock data for cross-posting status (since it's not in the DB yet based on the types)
const MOCK_CROSS_POSTS = [
  { id: 'craigslist', name: 'Craigslist', status: 'live', url: 'https://sfbay.craigslist.org', icon: <PublicIcon /> },
  { id: 'facebook', name: 'Facebook Marketplace', status: 'not_posted', url: null, icon: <FacebookIcon /> },
  { id: 'offerup', name: 'OfferUp', status: 'not_posted', url: null, icon: <StorefrontIcon /> },
];

const ListingDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: listing, isLoading, error } = useGetListing(id || '');
  const deleteMutation = useDeleteListing(id || '');

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this listing?')) {
      setIsDeleting(true);
      try {
        await deleteMutation.mutateAsync();
        navigate('/listings');
      } catch (error) {
        console.error('Failed to delete listing:', error);
        setIsDeleting(false);
      }
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !listing) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">
          {error ? (error as Error).message : 'Listing not found'}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/listings')} sx={{ mt: 2 }}>
          Back to Listings
        </Button>
      </Container>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'sold': return 'error';
      case 'expired': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header Navigation */}
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate('/listings')} 
        sx={{ mb: 3, color: 'text.secondary' }}
      >
        Back to Listings
      </Button>

      {/* Main Header */}
      <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Chip 
                label={listing.status} 
                color={getStatusColor(listing.status) as any} 
                size="small" 
                sx={{ textTransform: 'capitalize', fontWeight: 'bold' }}
              />
              <Typography variant="caption" color="text.secondary">
                Posted {new Date(listing.createdAt).toLocaleDateString()}
              </Typography>
            </Box>
            <Typography variant="h4" component="h1" fontWeight="bold">
              {listing.title}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
             <Typography variant="h4" fontWeight="bold" color="primary.main">
              ${listing.price.toLocaleString()}
            </Typography>
            <Divider orientation="vertical" flexItem />
            <Button 
              variant="outlined" 
              startIcon={<EditIcon />} 
              onClick={() => navigate(`/listings/${id}/edit`)}
            >
              Edit
            </Button>
            <Button 
              variant="outlined" 
              color="error" 
              startIcon={<DeleteIcon />} 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              Delete
            </Button>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={4}>
        {/* Left Column: Images & Details */}
        <Grid size={{ xs: 12, md: 8 }}>
          {/* Main Image */}
          <Card sx={{ mb: 4, borderRadius: 3, overflow: 'hidden', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
             <Box
              component="img"
              src={listing.images?.[0] || '/api/placeholder/800/600'}
              alt={listing.title}
              sx={{
                width: '100%',
                height: 500, 
                objectFit: 'cover',
                bgcolor: 'grey.100' 
              }}
            />
          </Card>

          {/* Details Section */}
          <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              About this item
            </Typography>
            
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{ xs: 6, sm: 4 }}>
                <Typography variant="subtitle2" color="text.secondary">Category</Typography>
                <Chip label={listing.category} size="small" sx={{ mt: 0.5, borderRadius: 1 }} />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <Typography variant="subtitle2" color="text.secondary">Condition</Typography>
                <Typography variant="body1" textTransform="capitalize">{listing.condition.replace('_', ' ')}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="subtitle2" color="text.secondary">Location</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LocationIcon fontSize="small" color="action" />
                  <Typography variant="body1">{listing.location || 'Location not specified'}</Typography>
                </Box>
              </Grid>
            </Grid>

            <Divider sx={{ mb: 3 }} />

            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Description
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {listing.description || 'No description provided.'}
            </Typography>
          </Paper>
        </Grid>

        {/* Right Column: Cross-Posting & Map */}
        <Grid size={{ xs: 12, md: 4 }}>
          {/* Active Postings Panel */}
          <Paper
            elevation={0} 
            sx={{ 
              p: 3, 
              mb: 3, 
              borderRadius: 3, 
              bgcolor: '#f8fafc', 
              border: '1px solid', 
              borderColor: 'divider' 
            }}
          >
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PublicIcon color="primary" />
              Cross-Post Status
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Manage your listings across different platforms.
            </Typography>

            <Stack spacing={2}>
              {MOCK_CROSS_POSTS.map((platform) => (
                <Paper 
                  key={platform.id} 
                  elevation={0}
                  sx={{ 
                    p: 2, 
                    borderRadius: 2, 
                    border: '1px solid', 
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ color: 'text.secondary' }}>{platform.icon}</Box>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {platform.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {platform.status === 'live' ? (
                          <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                        ) : (
                          <CancelIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        )}
                        <Typography variant="caption" color={platform.status === 'live' ? 'success.main' : 'text.disabled'}>
                          {platform.status === 'live' ? 'Live' : 'Not Posted'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Box>
                    {platform.status === 'live' ? (
                      <Tooltip title="View Posting">
                        <IconButton size="small" component="a" href={platform.url!} target="_blank" color="primary">
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Post Now">
                        <IconButton size="small" color="secondary">
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Paper>
              ))}
            </Stack>
          </Paper>

          {/* Map Placeholder */}
          <Paper elevation={0} sx={{ p: 0, borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider', height: 250, position: 'relative' }}>
            <Box 
              sx={{ 
                width: '100%', 
                height: '100%', 
                bgcolor: '#e0e0e0', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexDirection: 'column',
                color: 'text.secondary'
              }}
            >
              <LocationIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
              <Typography variant="body2" fontWeight="bold">Map View</Typography>
              <Typography variant="caption">Location preview coming soon</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ListingDetails;