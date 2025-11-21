import React from 'react';
import { useForm } from 'react-hook-form';
import {
  TextField,
  Button,
  Stack,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import type { CreateConnectionData } from '../../../types/index';

interface CraigslistFormProps {
  onSubmit: (data: CreateConnectionData) => void;
  isLoading?: boolean;
  error?: string | null;
}

const CraigslistForm: React.FC<CraigslistFormProps> = ({ onSubmit, isLoading, error }) => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [showPassword, setShowPassword] = React.useState(false);

  const handleFormSubmit = (data: any) => {
    onSubmit({
      platform: 'craigslist',
      credentials: {
        username: data.username,
        password: data.password,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <Stack spacing={3}>
        {error && <Alert severity="error">{error}</Alert>}
        
        <Alert severity="info">
          Your credentials are encrypted and stored securely. We use them only to post your listings to Craigslist.
        </Alert>

        <TextField
          label="Craigslist Email / Username"
          fullWidth
          {...register('username', { required: 'Username is required' })}
          error={!!errors.username}
          helperText={errors.username?.message as string}
          disabled={isLoading}
        />

        <TextField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          {...register('password', { required: 'Password is required' })}
          error={!!errors.password}
          helperText={errors.password?.message as string}
          disabled={isLoading}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          disabled={isLoading}
          fullWidth
        >
          {isLoading ? 'Connecting...' : 'Connect Craigslist Account'}
        </Button>
      </Stack>
    </form>
  );
};

export default CraigslistForm;