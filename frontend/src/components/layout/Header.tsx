/**
 * Header Component
 * Features:
 * - Sticky navigation with glass effect
 * - Mobile hamburger menu
 * - Theme toggle
 * - Logo with hover tooltip
 * - Responsive navigation
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  Moon,
  Sun,
  LogOut,
  Settings,
  User,
  Link as LinkIcon,
  History,
  PlusCircle,
  Home,
  LayoutDashboard,
  Package,
  CreditCard,
  ChevronDown,
  Search,
} from 'lucide-react';
import logo from '../../assets/jp1.jpg';
import { useAuthContext } from '../../contexts/AuthContext';
import { useThemeContext } from '../../contexts/ThemeContext';
import { getUserDisplayName, getUserInitials } from '../../utils/auth';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Mascot } from '../ui/Mascot';
import { cn } from '../../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../ui/dialog';

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  authRequired?: boolean;
  highlight?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Home', href: '/', icon: <Home className="w-4 h-4" /> },
  { label: 'Pricing', href: '/pricing', icon: <CreditCard className="w-4 h-4" /> },
];

const authNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" />, authRequired: true },
  { label: 'Watchlist', href: '/watchlist', icon: <Search className="w-4 h-4" />, authRequired: true },
  { label: 'My Listings', href: '/listings', icon: <Package className="w-4 h-4" />, authRequired: true },
  { label: 'Sell', href: '/create-listing', icon: <PlusCircle className="w-4 h-4" />, authRequired: true, highlight: true },
];

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout, isLoggingOut } = useAuthContext();
  const { mode, toggleTheme } = useThemeContext();

  // State
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [logoHovered, setLogoHovered] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const userDisplayName = user ? getUserDisplayName(user) : 'User';
  const userInitials = user ? getUserInitials(user) : 'U';

  const isActiveRoute = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  const handleLogoutClick = () => {
    setLogoutDialogOpen(true);
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleLogoutConfirm = () => {
    logout();
    setLogoutDialogOpen(false);
  };

  return (
    <>
      {/* Skip Link for Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 px-4 py-2 bg-primary text-white rounded-lg"
      >
        Skip to main content
      </a>

      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-40 transition-all duration-300',
          isScrolled
            ? 'bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm'
            : 'bg-transparent'
        )}
      >
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <RouterLink
              to="/"
              className="relative flex items-center gap-3 group"
              onMouseEnter={() => setLogoHovered(true)}
              onMouseLeave={() => setLogoHovered(false)}
            >
              <div className="relative">
                <img
                  src={logo}
                  alt="Jiggly"
                  className={cn(
                    'h-10 w-10 md:h-12 md:w-12 rounded-xl object-cover',
                    'border-2 border-primary/20 group-hover:border-primary/40',
                    'shadow-md group-hover:shadow-lg group-hover:shadow-primary/20',
                    'transition-all duration-300',
                  )}
                />
                {/* Hover tooltip with mascot */}
                <AnimatePresence>
                  {logoHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 5, scale: 0.95 }}
                      className="absolute top-full left-0 mt-2 z-50"
                    >
                      <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-border whitespace-nowrap">
                        <Mascot variation="happy" size="xs" animated={false} />
                        <span className="text-sm font-medium text-foreground">Jiggly</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <span className="hidden sm:block font-display font-bold text-lg text-foreground">
                Jiggly
              </span>
            </RouterLink>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <RouterLink
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200',
                    isActiveRoute(item.href)
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground-muted hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  {item.label}
                </RouterLink>
              ))}

              {isAuthenticated && authNavItems.map((item) => (
                <RouterLink
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200',
                    item.highlight
                      ? 'bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90'
                      : isActiveRoute(item.href)
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground-muted hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  {item.label}
                </RouterLink>
              ))}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="w-10 h-10 rounded-xl hover:bg-muted/80"
                aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <AnimatePresence mode="wait">
                  {mode === 'dark' ? (
                    <motion.div
                      key="sun"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Sun className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="moon"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Moon className="w-5 h-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>

              {/* Auth Section - Desktop */}
              {isAuthenticated && user ? (
                <div className="hidden md:block relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all duration-200',
                      isUserMenuOpen
                        ? 'bg-primary/10'
                        : 'hover:bg-muted/80'
                    )}
                  >
                    <Avatar className="h-8 w-8 border-2 border-primary/20">
                      <AvatarImage src={user.avatarUrl} alt={userDisplayName} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-sm">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className={cn(
                      'w-4 h-4 text-foreground-muted transition-transform duration-200',
                      isUserMenuOpen && 'rotate-180'
                    )} />
                  </button>

                  {/* User Dropdown Menu */}
                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-64 py-2 bg-card rounded-xl shadow-xl border border-border overflow-hidden"
                      >
                        {/* User Info */}
                        <div className="px-4 py-3 border-b border-border">
                          <div className="font-semibold text-foreground truncate">{userDisplayName}</div>
                          <div className="text-sm text-foreground-muted truncate">{user.email}</div>
                        </div>

                        {/* Credits */}
                        <div
                          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            navigate('/pricing');
                            setIsUserMenuOpen(false);
                          }}
                        >
                          <span className="font-semibold text-primary">Credits: {user?.credits ?? 0}</span>
                          <span className="text-xs text-primary underline">Add</span>
                        </div>

                        <div className="border-t border-border my-1" />

                        {/* Menu Items */}
                        {[
                          { icon: <LinkIcon className="w-4 h-4" />, label: 'Connections', href: '/dashboard/connections' },
                          { icon: <History className="w-4 h-4" />, label: 'Posting History', href: '/dashboard/jobs' },
                          { icon: <User className="w-4 h-4" />, label: 'Profile', href: '/profile' },
                          { icon: <Settings className="w-4 h-4" />, label: 'Settings', href: '/settings' },
                        ].map((item) => (
                          <button
                            key={item.label}
                            onClick={() => {
                              navigate(item.href);
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                          >
                            {item.icon}
                            {item.label}
                          </button>
                        ))}

                        <div className="border-t border-border my-1" />

                        <button
                          onClick={handleLogoutClick}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          {isLoggingOut ? 'Signing out...' : 'Sign out'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="font-medium"
                  >
                    <RouterLink to="/login">Sign In</RouterLink>
                  </Button>
                  <Button
                    size="sm"
                    asChild
                    className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-medium rounded-lg"
                  >
                    <RouterLink to="/signup">Get Started</RouterLink>
                  </Button>
                </div>
              )}

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden w-10 h-10 rounded-xl"
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isMobileMenuOpen}
              >
                <AnimatePresence mode="wait">
                  {isMobileMenuOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <X className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Menu className="w-5 h-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />

              {/* Menu Panel */}
              <motion.div
                ref={mobileMenuRef}
                initial={{ opacity: 0, x: '100%' }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-card shadow-2xl z-50 lg:hidden overflow-y-auto"
              >
                <div className="p-6">
                  {/* Close Button */}
                  <div className="flex justify-end mb-6">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-10 h-10 rounded-xl"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* User Info (if authenticated) */}
                  {isAuthenticated && user && (
                    <div className="flex items-center gap-4 mb-6 p-4 bg-muted/50 rounded-xl">
                      <Avatar className="h-12 w-12 border-2 border-primary/20">
                        <AvatarImage src={user.avatarUrl} alt={userDisplayName} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground truncate">{userDisplayName}</div>
                        <div className="text-sm text-foreground-muted truncate">{user.email}</div>
                        <div className="text-sm font-medium text-primary mt-1">
                          Credits: {user?.credits ?? 0}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation */}
                  <nav className="space-y-1">
                    {navItems.map((item) => (
                      <RouterLink
                        key={item.href}
                        to={item.href}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors',
                          isActiveRoute(item.href)
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground hover:bg-muted/80'
                        )}
                      >
                        {item.icon}
                        {item.label}
                      </RouterLink>
                    ))}

                    {isAuthenticated && (
                      <>
                        <div className="border-t border-border my-4" />
                        {authNavItems.map((item) => (
                          <RouterLink
                            key={item.href}
                            to={item.href}
                            className={cn(
                              'flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors',
                              item.highlight
                                ? 'bg-gradient-to-r from-primary to-secondary text-white'
                                : isActiveRoute(item.href)
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-foreground hover:bg-muted/80'
                            )}
                          >
                            {item.icon}
                            {item.label}
                          </RouterLink>
                        ))}

                        <div className="border-t border-border my-4" />

                        {[
                          { icon: <LinkIcon className="w-4 h-4" />, label: 'Connections', href: '/dashboard/connections' },
                          { icon: <History className="w-4 h-4" />, label: 'Posting History', href: '/dashboard/jobs' },
                          { icon: <User className="w-4 h-4" />, label: 'Profile', href: '/profile' },
                          { icon: <Settings className="w-4 h-4" />, label: 'Settings', href: '/settings' },
                        ].map((item) => (
                          <RouterLink
                            key={item.href}
                            to={item.href}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-foreground hover:bg-muted/80 transition-colors"
                          >
                            {item.icon}
                            {item.label}
                          </RouterLink>
                        ))}

                        <div className="border-t border-border my-4" />

                        <button
                          onClick={handleLogoutClick}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign out
                        </button>
                      </>
                    )}

                    {!isAuthenticated && (
                      <>
                        <div className="border-t border-border my-4" />
                        <RouterLink
                          to="/login"
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-foreground hover:bg-muted/80 transition-colors"
                        >
                          Sign In
                        </RouterLink>
                        <RouterLink
                          to="/signup"
                          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-medium"
                        >
                          Get Started
                        </RouterLink>
                      </>
                    )}
                  </nav>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-16 md:h-20" />

      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <Mascot variation="sad" size="md" animated />
            </div>
            <DialogTitle className="text-center">Leaving so soon?</DialogTitle>
            <DialogDescription className="text-center">
              Are you sure you want to sign out? We'll miss you!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <DialogClose asChild>
              <Button variant="outline" className="flex-1">Stay</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleLogoutConfirm}
              disabled={isLoggingOut}
              className="flex-1"
            >
              {isLoggingOut ? 'Signing out...' : 'Sign Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Header;