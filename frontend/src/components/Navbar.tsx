import React, { useState, useRef, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  Settings, 
  User, 
  Moon, 
  Sun, 
  Link as LinkIcon, 
  History
} from 'lucide-react';
import logo from '../assets/jp1.jpg';
import { useAuthContext } from '../contexts/AuthContext';
import { useThemeContext } from '../contexts/ThemeContext';
import { getUserDisplayName, getUserInitials } from '../utils/auth';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from './ui/dialog';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, isLoggingOut } = useAuthContext();
  const { mode, toggleTheme, isChristmasMode, toggleChristmasMode } = useThemeContext();
  
  // Menu states
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Handle user menu toggle
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  // Handle logout confirmation
  const handleLogoutClick = () => {
    setLogoutDialogOpen(true);
    setIsMenuOpen(false);
  };
  
  // Confirm logout
  const handleLogoutConfirm = () => {
    logout();
    setLogoutDialogOpen(false);
  };
  
  // Get user display info
  const userDisplayName = user ? getUserDisplayName(user) : 'User';
  const userInitials = user ? getUserInitials(user) : 'U';
  
  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-glass-border bg-glass-bg backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center px-4">
          {/* Logo/Home Link */}
          <RouterLink to="/" className="mr-6 flex items-center space-x-2">
            <img
              src={logo}
              alt="Jiggly"
              className="h-16 w-auto rounded-sm mix-blend-multiply dark:invert dark:mix-blend-screen"
            />
          </RouterLink>
          
          {/* Navigation Links */}
          <nav className="flex items-center space-x-4 lg:space-x-6 flex-1">
            <Button
              variant="ghost"
              asChild
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              <RouterLink to="/">Home</RouterLink>
            </Button>
            
            {/* Show authenticated user only links */}
            {isAuthenticated && (
              <>
                <Button
                  variant="ghost"
                  asChild
                  className="text-sm font-medium transition-colors hover:text-primary bg-primary/10 hover:bg-primary/20 text-primary"
                >
                  <RouterLink to="/create-listing">Sell</RouterLink>
                </Button>
                
                <Button
                  variant="ghost"
                  asChild
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  <RouterLink to="/listings">My Listings</RouterLink>
                </Button>
              </>
            )}
          </nav>

          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleChristmasMode}
              className={`h-9 w-9 ${isChristmasMode ? 'text-red-500' : ''}`}
              title={isChristmasMode ? "Disable Holiday Mode" : "Enable Holiday Mode"}
            >
              <span className="text-lg">🎄</span>
              <span className="sr-only">Toggle holiday mode</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9"
            >
              {mode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="sr-only">Toggle theme</span>
            </Button>
            
            {/* Auth Section */}
            {isAuthenticated && user ? (
              // User Menu (when authenticated)
              <div className="relative" ref={menuRef}>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full p-0"
                  onClick={toggleMenu}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl} alt={userDisplayName} />
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
                
                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-md border border-border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95">
                    <div className="px-2 py-1.5 text-sm font-semibold">
                      <div className="truncate">{userDisplayName}</div>
                      <div className="truncate text-xs font-normal text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                    
                    <div className="h-px bg-border my-1" />
                    
                    <div 
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                      onClick={() => {
                        navigate('/pricing');
                        setIsMenuOpen(false);
                      }}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="font-bold text-primary">Credits: {user?.credits ?? 0}</span>
                        <span className="text-xs text-primary underline">Add</span>
                      </div>
                    </div>
                    
                    <div className="h-px bg-border my-1" />

                    <div 
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                      onClick={() => {
                        navigate('/dashboard/connections');
                        setIsMenuOpen(false);
                      }}
                    >
                      <LinkIcon className="mr-2 h-4 w-4" />
                      <span>Connections</span>
                    </div>

                    <div 
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                      onClick={() => {
                        navigate('/dashboard/jobs');
                        setIsMenuOpen(false);
                      }}
                    >
                      <History className="mr-2 h-4 w-4" />
                      <span>Posting History</span>
                    </div>
                    
                    <div 
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                      onClick={() => {
                        navigate('/profile');
                        setIsMenuOpen(false);
                      }}
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </div>
                    
                    <div 
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                      onClick={() => {
                        navigate('/settings');
                        setIsMenuOpen(false);
                      }}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </div>
                    
                    <div className="h-px bg-border my-1" />
                    
                    <div 
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                      onClick={handleLogoutClick}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>{isLoggingOut ? 'Signing out...' : 'Sign out'}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Login/Register buttons (when not authenticated)
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="font-semibold"
                >
                  <RouterLink to="/login">Sign In</RouterLink>
                </Button>
                
                <Button
                  size="sm"
                  asChild
                  className="font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity text-white border-0"
                >
                  <RouterLink to="/signup">Sign Up</RouterLink>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Confirm Sign Out</DialogTitle>
            <DialogDescription>
              Are you sure you want to sign out of your account?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline" type="button">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleLogoutConfirm}
              disabled={isLoggingOut}
            >
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Navbar;