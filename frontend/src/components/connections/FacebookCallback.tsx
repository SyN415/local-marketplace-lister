import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert, Container } from '@mui/material';
import { connectionsAPI } from '../../services/api';
import { Mascot } from '../ui/Mascot';

const FacebookCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (errorParam) {
      setStatus('error');
      setError(errorDescription || 'Facebook authentication failed');
      return;
    }

    if (!code) {
      setStatus('error');
      setError('No authorization code received from Facebook');
      return;
    }

    const handleCallback = async () => {
      try {
        await connectionsAPI.facebookCallback(code);
        setStatus('success');
        // Redirect after a brief success message
        setTimeout(() => {
          navigate('/dashboard/connections');
        }, 2000);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Failed to complete Facebook connection');
        // Redirect back to connections after a longer delay on error so user can read message
        setTimeout(() => {
          navigate('/dashboard/connections');
        }, 5000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        {status === 'loading' && (
          <>
            <Mascot variant="sleepy" size="xl" animated animation="pulse" />
            <CircularProgress size={60} />
            <Typography variant="h6">Completing Facebook connection...</Typography>
          </>
        )}

        {status === 'success' && (
          <>
            <Mascot variant="superhero" size="xl" animated animation="bounce" />
            <Alert severity="success" sx={{ width: '100%' }}>
              Facebook connected successfully! Redirecting...
            </Alert>
            <CircularProgress size={40} />
          </>
        )}

        {status === 'error' && (
          <>
            <Mascot variant="cries" size="xl" animated animation="shake" />
            <Alert severity="error" sx={{ width: '100%' }}>
              {error || 'An error occurred during connection'}
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Redirecting back to connections page...
            </Typography>
          </>
        )}
      </Box>
    </Container>
  );
};

export default FacebookCallback;