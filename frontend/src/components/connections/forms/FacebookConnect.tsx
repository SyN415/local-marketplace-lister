import React from 'react';
import { Button, Alert, Stack, Box } from '@mui/material';
import { Facebook as FacebookIcon } from '@mui/icons-material';
import { connectionsAPI } from '../../../services/api';

interface FacebookConnectProps {
  onError?: (error: string) => void;
}

const FacebookConnect: React.FC<FacebookConnectProps> = ({ onError }) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const authUrl = await connectionsAPI.getFacebookAuthUrl();
      window.location.href = authUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate Facebook connection';
      setError(errorMessage);
      if (onError) onError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        
        <Alert severity="info">
          Connect your Facebook account to automatically post listings to Facebook Marketplace and Groups.
        </Alert>

        <Button
          variant="contained"
          size="large"
          startIcon={<FacebookIcon />}
          onClick={handleConnect}
          disabled={isLoading}
          fullWidth
          sx={{
            bgcolor: '#1877F2',
            '&:hover': {
              bgcolor: '#166fe5',
            },
          }}
        >
          {isLoading ? 'Redirecting...' : 'Connect with Facebook'}
        </Button>
      </Stack>
    </Box>
  );
};

export default FacebookConnect;