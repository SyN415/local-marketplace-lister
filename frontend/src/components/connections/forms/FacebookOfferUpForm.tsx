import React, { useState } from 'react';
import {
  Button,
  Stack,
  Alert,
  Typography,
  Box,
} from '@mui/material';
import { CloudUpload, Description } from '@mui/icons-material';
import type { CreateConnectionData, MarketplacePlatform } from '../../../types/index';

import { Extension } from '@mui/icons-material';

interface FacebookOfferUpFormProps {
  platform: MarketplacePlatform;
  onSubmit: (data: CreateConnectionData) => void;
  isLoading?: boolean;
  error?: string | null;
}

const FacebookOfferUpForm: React.FC<FacebookOfferUpFormProps> = ({ platform, error }) => {
  return (
    <Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}
      
      <Alert severity="info">
        We've simplified the connection process! You no longer need to upload cookies manually.
      </Alert>

      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          bgcolor: 'background.paper',
        }}
      >
        <Stack alignItems="center" spacing={2}>
          <Extension fontSize="large" color="primary" />
          <Typography variant="h6">Use the Browser Extension</Typography>
          <Typography variant="body2" color="text.secondary">
            To connect {platform === 'facebook' ? 'Facebook Marketplace' : 'OfferUp'}, simply use our Chrome Extension.
            It handles the connection securely and automatically.
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>How it works:</Typography>
            <ol style={{ textAlign: 'left', margin: '0 auto', maxWidth: '300px', paddingLeft: '20px' }}>
              <li>Install the Chrome Extension</li>
              <li>Go to a listing details page</li>
              <li>Click "Cross-Post" to start posting</li>
            </ol>
          </Box>

          <Button
            variant="contained"
            color="primary"
            href="#" // TODO: Add link to Chrome Store when available
            onClick={(e) => {
                e.preventDefault();
                alert("Extension link coming soon! For now, please load the 'extension' folder in Chrome Developer Mode.");
            }}
          >
            Get the Extension
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
};

export default FacebookOfferUpForm;