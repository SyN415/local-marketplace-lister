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
      <AppBar position="static">
        <Toolbar>
          {/* Logo/Home Link */}
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              flexGrow: 1,
              textDecoration: 'none',
              color: 'inherit',
              fontWeight: 'bold',
              '&:hover': {
                opacity: 0.8,
              },
            }}
          >
            Local Marketplace
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
              sx={{ minWidth: 'auto' }}
            >
              Home
            </Button>
            
            <Button
              color="inherit"
              component={RouterLink}
              to="/listings"
              sx={{ minWidth: 'auto' }}
            >
              Browse
            </Button>
            
            {/* Show authenticated user only links */}
            {isAuthenticated && (
              <>
                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/create-listing"
                  sx={{ minWidth: 'auto' }}
                >
                  Sell
                </Button>
                
                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/my-listings"
                  sx={{ minWidth: 'auto' }}
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
                variant="outlined"
                size="small"
                sx={{
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                Sign In
              </Button>
              
              <Button
                color="secondary"
                component={RouterLink}
                to="/register"
                variant="contained"
                size="small"
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