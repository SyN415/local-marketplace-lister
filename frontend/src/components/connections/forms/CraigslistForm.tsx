import React from 'react';
import { Button, Stack, Alert, Typography, Box } from '@mui/material';
import type { CreateConnectionData } from '../../../types/index';

interface CraigslistFormProps {
  onSubmit: (data: CreateConnectionData) => void;
  isLoading?: boolean;
  error?: string | null;
}

const CraigslistForm: React.FC<CraigslistFormProps> = ({ onSubmit, isLoading, error }) => {
  const handleEnable = () => {
    onSubmit({
      platform: 'craigslist',
      credentials: {
        enabled: true
      },
    });
  };

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}
      
      <Box>
        <Typography variant="body1" gutterBottom>
          Enable Craigslist integration to manage your listings.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          We use email routing to handle your postings anonymously. No password required.
        </Typography>
      </Box>

      <Button
        variant="contained"
        color="primary"
        size="large"
        onClick={handleEnable}
        disabled={isLoading}
        fullWidth
      >
        {isLoading ? 'Enabling...' : 'Enable Craigslist Integration'}
      </Button>
    </Stack>
  );
};

export default CraigslistForm;