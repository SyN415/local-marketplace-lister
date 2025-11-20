import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Divider,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Logout, Settings, Person, Brightness4, Brightness7 } from '@mui/icons-material';
import { useAuthContext } from '../contexts/AuthContext';
import { useThemeContext } from '../contexts/ThemeContext';
import { getUserDisplayName, getUserInitials } from '../utils/auth';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, isLoggingOut } = useAuthContext();
  const { mode, toggleTheme } = useThemeContext();
  
  // Menu states
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  
  // Handle user menu open
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };
  
  // Handle user menu close
  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };
  
  // Handle logout confirmation
  const handleLogoutClick = () => {
    setLogoutDialogOpen(true);
    handleUserMenuClose();
  };
  
  // Confirm logout
  const handleLogoutConfirm = () => {
    logout();
    setLogoutDialogOpen(false);
  };
  
  // Cancel logout
  const handleLogoutCancel = () => {
    setLogoutDialogOpen(false);
  };
  
  // Get user display info
  const userDisplayName = user ? getUserDisplayName(user) : 'User';
  const userInitials = user ? getUserInitials(user) : 'U';
  
  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'text.primary'
        }}
      >
        <Toolbar>
          {/* Logo/Home Link */}
          <Typography
            variant="h5"
            component={RouterLink}
            to="/"
            sx={{
              flexGrow: 1,
              textDecoration: 'none',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 800,
              letterSpacing: '-0.5px',
              '&:hover': {
                opacity: 0.9,
              },
            }}
          >
            Marketplace Hustle
          </Typography>
          
          {/* Navigation Links */}
          <Box sx={{ display: 'flex', gap: 1, mr: 2, alignItems: 'center' }}>
            <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color="inherit">
              {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
            <Button
              color="inherit"
              component={RouterLink}
              to="/"
              sx={{ minWidth: 'auto', fontWeight: 600 }}
            >
              Home
            </Button>
            
            {/* Show authenticated user only links */}
            {isAuthenticated && (
              <>
                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/create-listing"
                  sx={{
                    minWidth: 'auto',
                    fontWeight: 600,
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: 'primary.main',
                    '&:hover': {
                      background: 'rgba(99, 102, 241, 0.2)',
                    }
                  }}
                >
                  Sell
                </Button>
                
                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/my-listings"
                  sx={{ minWidth: 'auto', fontWeight: 600 }}
                >
                  My Listings
                </Button>
              </>
            )}
          </Box>
          
          {/* Auth Section */}
          {isAuthenticated && user ? (
            // User Menu (when authenticated)
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title={`${userDisplayName}`}>
                <IconButton
                  color="inherit"
                  onClick={handleUserMenuOpen}
                  sx={{ p: 0.5 }}
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      fontSize: '0.875rem',
                      bgcolor: 'secondary.main',
                    }}
                  >
                    {userInitials}
                  </Avatar>
                </IconButton>
              </Tooltip>
              
              <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={handleUserMenuClose}
                onClick={handleUserMenuClose}
                PaperProps={{
                  elevation: 3,
                  sx: {
                    mt: 1.5,
                    minWidth: 200,
                  },
                }}
              >
                <MenuItem disabled>
                  <Box>
                    <Typography variant="subtitle2">{userDisplayName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user.email}
                    </Typography>
                  </Box>
                </MenuItem>

                <Divider />

                <MenuItem onClick={() => navigate('/pricing')}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <Typography variant="body2" fontWeight="bold" color="primary">
                      Credits: {user?.credits ?? 0}
                    </Typography>
                    <Typography variant="caption" color="primary" sx={{ ml: 1, textDecoration: 'underline' }}>
                      Add
                    </Typography>
                  </Box>
                </MenuItem>
                
                <Divider />
                
                <MenuItem onClick={() => navigate('/profile')}>
                  <Person sx={{ mr: 1 }} />
                  Profile
                </MenuItem>
                
                <MenuItem onClick={() => navigate('/settings')}>
                  <Settings sx={{ mr: 1 }} />
                  Settings
                </MenuItem>
                
                <Divider />
                
                <MenuItem onClick={handleLogoutClick} disabled={isLoggingOut}>
                  <Logout sx={{ mr: 1 }} />
                  {isLoggingOut ? 'Signing out...' : 'Sign out'}
                </MenuItem>
              </Menu>
            </Box>
          ) : (
            // Login/Register buttons (when not authenticated)
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                color="inherit"
                component={RouterLink}
                to="/login"
                variant="text"
                size="small"
                sx={{ fontWeight: 600 }}
              >
                Sign In
              </Button>
              
              <Button
                color="primary"
                component={RouterLink}
                to="/signup"
                variant="contained"
                size="small"
                sx={{
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                }}
              >
                Sign Up
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      
      {/* Logout Confirmation Dialog */}
      <Dialog
        open={logoutDialogOpen}
        onClose={handleLogoutCancel}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Confirm Sign Out
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to sign out of your account?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLogoutCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleLogoutConfirm}
            variant="contained"
            color="error"
            disabled={isLoggingOut}
          >
            Sign Out
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Navbar;