import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Grid,
  Chip,
  Box,
  Button,
  Stack,
  Paper,
} from '@mui/material';
import { Delete, CheckCircle, Error, Add, Store } from '@mui/icons-material';
import type { MarketplaceConnection } from '../../types/index';

interface ConnectionListProps {
  connections: MarketplaceConnection[];
  onDelete: (id: string) => void;
  onAdd: () => void;
}

const PlatformIcon = ({ platform }: { platform: string }) => {
  // You can replace these with actual logos or specific icons if available
  return <Store />;
};

const ConnectionList: React.FC<ConnectionListProps> = ({ connections, onDelete, onAdd }) => {
  if (connections.length === 0) {
    return (
      <Paper
        sx={{
          p: 4,
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Typography variant="h6" gutterBottom>
          No Marketplace Connections
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Connect your accounts to start cross-posting your listings.
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onAdd}
          sx={{
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
          }}
        >
          Add Connection
        </Button>
      </Paper>
    );
  }

  return (
    <Grid container spacing={3}>
      {connections.map((connection) => (
        <Grid item xs={12} sm={6} md={4} key={connection.id}>
          <Card
            sx={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
              },
            }}
          >
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box display="flex" alignItems="center" gap={1}>
                  <PlatformIcon platform={connection.platform} />
                  <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                    {connection.platform}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onDelete(connection.id)}
                  aria-label="delete connection"
                >
                  <Delete />
                </IconButton>
              </Stack>

              <Box sx={{ mt: 2 }}>
                <Chip
                  icon={connection.isActive ? <CheckCircle /> : <Error />}
                  label={connection.isActive ? 'Connected' : 'Disconnected'}
                  color={connection.isActive ? 'success' : 'error'}
                  size="small"
                  variant="outlined"
                />
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                Connected: {new Date(connection.connectedAt).toLocaleDateString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
      <Grid item xs={12} sm={6} md={4}>
        <Button
          fullWidth
          variant="outlined"
          onClick={onAdd}
          sx={{
            height: '100%',
            minHeight: 160,
            border: '2px dashed rgba(255, 255, 255, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <Add fontSize="large" />
          Add Connection
        </Button>
      </Grid>
    </Grid>
  );
};

export default ConnectionList;