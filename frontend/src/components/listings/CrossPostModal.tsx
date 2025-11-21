import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip,
  Divider
} from '@mui/material';
import { 
  Facebook as FacebookIcon, 
  Storefront as StorefrontIcon, 
  Public as PublicIcon 
} from '@mui/icons-material';
import { connectionsAPI, postingsAPI } from '../../services/api';
import type { MarketplaceConnection, MarketplacePlatform } from '../../types';

interface CrossPostModalProps {
  open: boolean;
  onClose: () => void;
  listingId: string;
  onSuccess?: () => void;
}

const PLATFORM_LABELS: Record<MarketplacePlatform, string> = {
  facebook: 'Facebook Marketplace',
  offerup: 'OfferUp',
  craigslist: 'Craigslist',
};

const PLATFORM_DESCRIPTIONS: Record<MarketplacePlatform, string> = {
  facebook: 'Managed via Connected Account.',
  offerup: '',
  craigslist: 'Replies auto-forwarded to your email.',
};

const PLATFORM_ICONS: Record<MarketplacePlatform, React.ReactNode> = {
  facebook: <FacebookIcon color="primary" />,
  offerup: <StorefrontIcon color="success" />,
  craigslist: <PublicIcon color="secondary" />,
};

const CrossPostModal: React.FC<CrossPostModalProps> = ({ open, onClose, listingId, onSuccess }) => {
  const [connections, setConnections] = useState<MarketplaceConnection[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchConnections();
      setSelectedPlatforms([]);
      setError(null);
    }
  }, [open]);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const data = await connectionsAPI.getConnections();
      // Filter only active connections
      setConnections(data.filter(c => c.isActive));
    } catch (err: any) {
      setError(err.message || 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handlePublish = async () => {
    if (selectedPlatforms.length === 0) return;

    try {
      setPublishing(true);
      setError(null);
      
      await postingsAPI.publishListing(listingId, selectedPlatforms);
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to publish listing');
    } finally {
      setPublishing(false);
    }
  };

  // Calculate cost (mock logic: 1 credit per platform)
  const totalCost = selectedPlatforms.length;

  return (
    <Dialog open={open} onClose={!publishing ? onClose : undefined} maxWidth="sm" fullWidth>
      <DialogTitle>Post to Marketplaces</DialogTitle>
      
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        ) : connections.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography color="text.secondary" gutterBottom>
              No active connections found.
            </Typography>
            <Button variant="outlined" href="/dashboard/connections">
              Connect Accounts
            </Button>
          </Box>
        ) : (
          <>
            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              Select platforms to post to:
            </Typography>
            
            <FormGroup>
              {connections.map((conn) => (
                <Box 
                  key={conn.id} 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    p: 1.5,
                    mb: 1,
                    border: '1px solid',
                    borderColor: selectedPlatforms.includes(conn.platform) ? 'primary.main' : 'divider',
                    borderRadius: 2,
                    bgcolor: selectedPlatforms.includes(conn.platform) ? 'primary.lighter' : 'background.paper',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleTogglePlatform(conn.platform)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FormControlLabel
                      control={
                        <Checkbox 
                          checked={selectedPlatforms.includes(conn.platform)}
                          onChange={() => handleTogglePlatform(conn.platform)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      }
                      label=""
                      sx={{ mr: 0 }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {PLATFORM_ICONS[conn.platform]}
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          {PLATFORM_LABELS[conn.platform]}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {PLATFORM_DESCRIPTIONS[conn.platform] || 'Connected'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  
                  <Chip 
                    label="1 Credit" 
                    size="small" 
                    variant="outlined" 
                    color={selectedPlatforms.includes(conn.platform) ? "primary" : "default"}
                  />
                </Box>
              ))}
            </FormGroup>

            <Box sx={{ mt: 3, bgcolor: 'grey.50', p: 2, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Selected Platforms:</Typography>
                <Typography variant="body2" fontWeight="bold">{selectedPlatforms.length}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1" fontWeight="bold">Total Cost:</Typography>
                <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
                  {totalCost} Credits
                </Typography>
              </Box>
            </Box>
          </>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={onClose} disabled={publishing}>
          Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={handlePublish}
          disabled={publishing || selectedPlatforms.length === 0 || connections.length === 0}
          startIcon={publishing ? <CircularProgress size={20} color="inherit" /> : undefined}
        >
          {publishing ? 'Posting...' : `Post Now (${totalCost} Credits)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CrossPostModal;