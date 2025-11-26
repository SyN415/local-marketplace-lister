import React, { useState, useEffect } from 'react';
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
  Storefront as StorefrontIcon,
  Share as ShareIcon
} from '@mui/icons-material';
import { useGetListing, useDeleteListing } from '../hooks/useListings';
import CrossPostModal from '../components/listings/CrossPostModal';
import { postingsAPI } from '../services/api';
import type { PostingJob, MarketplacePlatform } from '../types';

const PLATFORMS: { id: MarketplacePlatform; name: string; icon: React.ReactNode }[] = [
  { id: 'craigslist', name: 'Craigslist', icon: <PublicIcon /> },
  { id: 'facebook', name: 'Facebook Marketplace', icon: <FacebookIcon /> },
  { id: 'offerup', name: 'OfferUp', icon: <StorefrontIcon /> },
];

const ListingDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [crossPostModalOpen, setCrossPostModalOpen] = useState(false);
  const [postingJobs, setPostingJobs] = useState<PostingJob[]>([]);

  const { data: listing, isLoading, error } = useGetListing(id || '');
  const deleteMutation = useDeleteListing(id || '');

  useEffect(() => {
    if (id) {
      fetchJobStatus();
    }
  }, [id]);

  const fetchJobStatus = async () => {
    if (!id) return;
    try {
      const jobs = await postingsAPI.getJobStatus(id);
      setPostingJobs(jobs);
    } catch (err) {
      console.error('Failed to fetch job status:', err);
    }
  };

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
      <CrossPostModal
        open={crossPostModalOpen}
        onClose={() => setCrossPostModalOpen(false)}
        listing={listing}
        onSuccess={fetchJobStatus}
      />

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
              onError={(e: any) => {
                e.target.onerror = null; // Prevent infinite loop
                e.target.src = '/api/placeholder/800/600';
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

            <Button
              fullWidth
              variant="contained"
              startIcon={<ShareIcon />}
              onClick={() => setCrossPostModalOpen(true)}
              sx={{ mb: 3 }}
            >
              Post to Marketplaces
            </Button>

            <Stack spacing={2}>
              {PLATFORMS.map((platform) => {
                const job = postingJobs.find(j => j.platform === platform.id);
                const status = job ? job.status : 'not_posted';
                const isLive = status === 'completed';
                const isPending = status === 'pending' || status === 'processing';
                const isFailed = status === 'failed';
                
                let statusColor = 'text.disabled';
                let statusText = 'Not Posted';
                let StatusIcon = CancelIcon;

                if (isLive) {
                  statusColor = 'success.main';
                  statusText = 'Live';
                  StatusIcon = CheckCircleIcon;
                } else if (isPending) {
                  statusColor = 'warning.main';
                  statusText = 'Processing';
                  StatusIcon = RefreshIcon; // Or a loading spinner
                } else if (isFailed) {
                  statusColor = 'error.main';
                  statusText = 'Failed';
                  StatusIcon = CancelIcon;
                }

                return (
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
                          {isPending && <CircularProgress size={10} />}
                          {!isPending && <StatusIcon sx={{ fontSize: 14, color: statusColor }} />}
                          <Typography variant="caption" color={statusColor} sx={{ textTransform: 'capitalize' }}>
                            {statusText}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Box>
                      {isLive && job?.result_data?.url && (
                        <Tooltip title="View Posting">
                          <IconButton size="small" component="a" href={job.result_data.url} target="_blank" color="primary">
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {isFailed && (
                         <Tooltip title="Retry">
                          <IconButton size="small" color="error" onClick={() => setCrossPostModalOpen(true)}>
                            <RefreshIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Paper>
                );
              })}
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