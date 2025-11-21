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

interface FacebookOfferUpFormProps {
  platform: MarketplacePlatform;
  onSubmit: (data: CreateConnectionData) => void;
  isLoading?: boolean;
  error?: string | null;
}

const FacebookOfferUpForm: React.FC<FacebookOfferUpFormProps> = ({ platform, onSubmit, isLoading, error }) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      if (selectedFile.type !== 'application/json') {
        setFileError('Please upload a JSON file');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setFileError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setFileError('Please upload a cookies.json file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const cookies = JSON.parse(event.target?.result as string);
        onSubmit({
          platform,
          credentials: {
            cookies,
          },
        });
      } catch (err) {
        setFileError('Invalid JSON file. Please check the file content.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={3}>
        {error && <Alert severity="error">{error}</Alert>}
        {fileError && <Alert severity="error">{fileError}</Alert>}
        
        <Alert severity="info">
          To connect {platform === 'facebook' ? 'Facebook Marketplace' : 'OfferUp'}, you need to upload your session cookies.
          Use a browser extension like "EditThisCookie" or "Get cookies.txt" to export your cookies as JSON.
        </Alert>

        <Box
          sx={{
            border: '2px dashed rgba(255, 255, 255, 0.2)',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            cursor: 'pointer',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'rgba(99, 102, 241, 0.05)',
            },
          }}
          component="label"
        >
          <input
            type="file"
            accept=".json"
            hidden
            onChange={handleFileChange}
          />
          {file ? (
            <Stack alignItems="center" spacing={1}>
              <Description fontSize="large" color="primary" />
              <Typography variant="h6">{file.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {(file.size / 1024).toFixed(2)} KB
              </Typography>
            </Stack>
          ) : (
            <Stack alignItems="center" spacing={1}>
              <CloudUpload fontSize="large" color="action" />
              <Typography variant="h6">Upload cookies.json</Typography>
              <Typography variant="body2" color="text.secondary">
                Click to browse
              </Typography>
            </Stack>
          )}
        </Box>

        <Button
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          disabled={isLoading || !file}
          fullWidth
        >
          {isLoading ? 'Connecting...' : `Connect ${platform === 'facebook' ? 'Facebook' : 'OfferUp'}`}
        </Button>
      </Stack>
    </form>
  );
};

export default FacebookOfferUpForm;