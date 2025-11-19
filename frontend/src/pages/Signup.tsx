import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Container,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { useAuthContext } from '../contexts/AuthContext';
import { handleApiError } from '../services/api';

interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
}

const Signup = () => {
  const navigate = useNavigate();
  
  const {
    signup,
    isSigningUp,
    signupError,
    clearErrors,
    isAuthenticated,
  } = useAuthContext();
  
  // Form state
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  
  const [validationErrors, setValidationErrors] = useState<Partial<SignupFormData>>({});
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);
  
  // Clear errors when component mounts
  useEffect(() => {
    clearErrors();
  }, [clearErrors]);
  
  // Validate form
  const validateForm = (): boolean => {
    const errors: Partial<SignupFormData> = {};
    
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
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle input changes
  const handleInputChange = (field: keyof SignupFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Clear signup error when user starts typing
    if (signupError) {
      clearErrors();
    }
  };
  
  // Handle form submission
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Submit signup request
    signup({
      email: formData.email,
      password: formData.password,
      fullName: formData.fullName,
    });
  };
  
  // Get error message from signup error
  const getErrorMessage = (): string => {
    if (!signupError) return '';
    return handleApiError(signupError as any);
  };
  
  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Create Account
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Join Local Marketplace Lister today
        </Typography>
        
        {/* Signup Error Alert */}
        {signupError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {getErrorMessage()}
          </Alert>
        )}
        
        {/* Signup Form */}
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            fullWidth
            label="Full Name"
            value={formData.fullName}
            onChange={handleInputChange('fullName')}
            disabled={isSigningUp}
            autoComplete="name"
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            error={!!validationErrors.email}
            helperText={validationErrors.email}
            disabled={isSigningUp}
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
            disabled={isSigningUp}
            autoComplete="new-password"
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="Confirm Password"
            type="password"
            value={formData.confirmPassword}
            onChange={handleInputChange('confirmPassword')}
            error={!!validationErrors.confirmPassword}
            helperText={validationErrors.confirmPassword}
            disabled={isSigningUp}
            autoComplete="new-password"
            sx={{ mb: 3 }}
          />
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isSigningUp}
            sx={{ mb: 3 }}
          >
            {isSigningUp ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} color="inherit" />
                Creating Account...
              </Box>
            ) : (
              'Sign Up'
            )}
          </Button>
          
          <Divider sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?
            </Typography>
          </Divider>
          
          <Button
            fullWidth
            variant="outlined"
            size="large"
            component={RouterLink}
            to="/login"
            disabled={isSigningUp}
          >
            Sign In
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Signup;