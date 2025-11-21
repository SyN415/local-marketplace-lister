import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import { connectionsAPI } from '../services/api';
import type { MarketplaceConnection, CreateConnectionData, MarketplacePlatform } from '../types/index';
import ConnectionList from '../components/connections/ConnectionList';
import CraigslistForm from '../components/connections/forms/CraigslistForm';
import FacebookOfferUpForm from '../components/connections/forms/FacebookOfferUpForm';

const Connections: React.FC = () => {
  const [connections, setConnections] = useState<MarketplaceConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<MarketplacePlatform>('facebook');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const data = await connectionsAPI.getConnections();
      setConnections(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch connections:', err);
      setError(err.message || 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleAddConnection = () => {
    setOpenDialog(true);
    setFormError(null);
    setSelectedPlatform('facebook');
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormError(null);
  };

  const handleCreateConnection = async (data: CreateConnectionData) => {
    try {
      setFormLoading(true);
      setFormError(null);
      await connectionsAPI.createConnection(data);
      await fetchConnections();
      handleCloseDialog();
    } catch (err: any) {
      console.error('Failed to create connection:', err);
      setFormError(err.message || 'Failed to create connection');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConnection = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this connection?')) {
      return;
    }

    try {
      // Optimistic update
      setConnections(prev => prev.filter(c => c.id !== id));
      await connectionsAPI.deleteConnection(id);
    } catch (err: any) {
      console.error('Failed to delete connection:', err);
      // Revert on failure
      await fetchConnections();
      alert(err.message || 'Failed to delete connection');
    }
  };

  const renderForm = () => {
    switch (selectedPlatform) {
      case 'craigslist':
        return (
          <CraigslistForm
            onSubmit={handleCreateConnection}
            isLoading={formLoading}
            error={formError}
          />
        );
      case 'facebook':
      case 'offerup':
        return (
          <FacebookOfferUpForm
            platform={selectedPlatform}
            onSubmit={handleCreateConnection}
            isLoading={formLoading}
            error={formError}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h3"
          component="h1"
          sx={{
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            mb: 1,
          }}
        >
          Connections
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your connected marketplace accounts for cross-posting.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : (
        <ConnectionList
          connections={connections}
          onDelete={handleDeleteConnection}
          onAdd={handleAddConnection}
        />
      )}

      {/* Add Connection Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Connection</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel id="platform-select-label">Platform</InputLabel>
              <Select
                labelId="platform-select-label"
                value={selectedPlatform}
                label="Platform"
                onChange={(e) => setSelectedPlatform(e.target.value as MarketplacePlatform)}
              >
                <MenuItem value="facebook">Facebook Marketplace</MenuItem>
                <MenuItem value="offerup">OfferUp</MenuItem>
                <MenuItem value="craigslist">Craigslist</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          {renderForm()}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleCloseDialog} disabled={formLoading}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Connections;