import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Box,
  Alert,
  IconButton,
  Tooltip,
  Button
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Loop as LoopIcon,
  OpenInNew as OpenInNewIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { postingsAPI } from '../services/api';
import { supabase } from '../lib/supabase';
import type { PostingJob } from '../types';
import { useAuthContext } from '../contexts/AuthContext';

const Jobs: React.FC = () => {
  const { user } = useAuthContext();
  const [jobs, setJobs] = useState<PostingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();

    // Subscribe to realtime updates
    if (user) {
      const subscription = supabase
        .channel('posting_jobs_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'posting_jobs',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            handleRealtimeUpdate(payload);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const data = await postingsAPI.getUserJobs();
      setJobs(data);
    } catch (err: any) {
      console.error('Failed to fetch jobs:', err);
      setError('Failed to load job history.');
    } finally {
      setLoading(false);
    }
  };

  const handleRealtimeUpdate = (payload: any) => {
    console.log('Realtime update:', payload);
    
    if (payload.eventType === 'INSERT') {
      setJobs(prev => [payload.new, ...prev]);
    } else if (payload.eventType === 'UPDATE') {
      setJobs(prev => prev.map(job => job.id === payload.new.id ? { ...job, ...payload.new } : job));
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'completed':
        return <Chip icon={<CheckCircleIcon />} label="Success" color="success" size="small" />;
      case 'failed':
        return <Chip icon={<ErrorIcon />} label="Failed" color="error" size="small" />;
      case 'processing':
        return <Chip icon={<LoopIcon />} label="Processing" color="info" size="small" />;
      case 'pending':
      default:
        return <Chip icon={<ScheduleIcon />} label="Pending" color="default" size="small" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Posting History
        </Typography>
        <Button startIcon={<RefreshIcon />} onClick={fetchJobs}>
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : jobs.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No posting history found.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Listing</TableCell>
                <TableCell>Platform</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id} hover>
                  <TableCell>{formatDate(job.created_at)}</TableCell>
                  <TableCell>{job.listings?.title || 'Unknown Listing'}</TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{job.platform}</TableCell>
                  <TableCell>{getStatusChip(job.status)}</TableCell>
                  <TableCell>
                    {job.status === 'completed' && job.result_data?.url && (
                      <Tooltip title="View Post">
                        <IconButton 
                          size="small" 
                          component="a" 
                          href={job.result_data.url} 
                          target="_blank" 
                          color="primary"
                        >
                          <OpenInNewIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {job.status === 'failed' && (
                      <Tooltip title={job.error_log || "Unknown error"}>
                         <IconButton size="small" color="error">
                           <ErrorIcon />
                         </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
};

export default Jobs;