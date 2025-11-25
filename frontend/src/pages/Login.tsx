import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Container,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Link,
  Divider,
} from '@mui/material';
import { useAuthContext } from '../contexts/AuthContext';
import { handleApiError } from '../services/api';
import { isRememberMeEnabled } from '../utils/auth';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const {
    login,
    isLoggingIn,
    loginError,
    clearErrors,
    isAuthenticated,
  } = useAuthContext();
  
  // Form state
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });
  
  const [validationErrors, setValidationErrors] = useState<Partial<LoginFormData>>({});
  
  // Get redirect URL from location state or query params
  const from = location.state?.from?.pathname || new URLSearchParams(location.search).get('redirect') || '/';
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);
  
  // Load remembered email
  useEffect(() => {
    if (isRememberMeEnabled()) {
      // You could pre-fill email here if stored separately
      // For security, we don't pre-fill passwords
      setTimeout(() => {
        setFormData(prev => ({ ...prev, rememberMe: true }));
      }, 0);
    }
  }, []);
  
  // Clear errors when component mounts
  useEffect(() => {
    clearErrors();
  }, [clearErrors]);
  
  // Validate form
  const validateForm = (): boolean => {
    const errors: Partial<LoginFormData> = {};
    
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle input changes
  const handleInputChange = (field: keyof LoginFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'rememberMe' ? event.target.checked : event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Clear login error when user starts typing
    if (loginError) {
      clearErrors();
    }
  };
  
  // Handle form submission
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Submit login request
    login({
      email: formData.email,
      password: formData.password,
      rememberMe: formData.rememberMe,
    });
  };
  
  // Get error message from login error
  const getErrorMessage = (): string => {
    if (!loginError) return '';
    return handleApiError(loginError as any);
  };
  
  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Welcome Back
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Sign in to your account to continue
        </Typography>
        
        {/* Login Error Alert */}
        {loginError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {getErrorMessage()}
          </Alert>
        )}
        
        {/* Google Sign In */}
        <GoogleSignInButton className="w-full mb-4" />

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
          </div>
        </div>

        {/* Login Form */}
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            error={!!validationErrors.email}
            helperText={validationErrors.email}
            disabled={isLoggingIn}
            autoComplete="email"
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={formData.password}
            onChange={handleInputChange('password')}
            error={!!validationErrors.password}
            helperText={validationErrors.password}
            disabled={isLoggingIn}
            autoComplete="current-password"
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.rememberMe}
                  onChange={handleInputChange('rememberMe')}
                  disabled={isLoggingIn}
                  color="primary"
                />
              }
              label="Remember me"
            />
            
            <Link
              href="#"
              variant="body2"
              sx={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.preventDefault();
                // TODO: Implement forgot password functionality
                console.log('Forgot password clicked');
              }}
            >
              Forgot password?
            </Link>
          </Box>
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isLoggingIn}
            sx={{ mb: 3 }}
          >
            {isLoggingIn ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} color="inherit" />
                Signing in...
              </Box>
            ) : (
              'Sign In'
            )}
          </Button>
          
          <Divider sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?
            </Typography>
          </Divider>
          
          <Button
            fullWidth
            variant="outlined"
            size="large"
            component={RouterLink}
            to="/signup"
            disabled={isLoggingIn}
          >
            Create Account
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login;