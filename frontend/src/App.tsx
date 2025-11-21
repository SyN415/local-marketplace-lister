import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Page components
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import CreateListing from './pages/CreateListing';
import EditListing from './pages/EditListing';
import ListingDetails from './pages/ListingDetails';
import Listings from './pages/Listings';
import Pricing from './pages/Pricing';
import Success from './pages/payment/Success';
import Cancel from './pages/payment/Cancel';

/**
 * App Router Component
 *
 * Configures the application routing with:
 * - Auth Provider for global authentication state
 * - Protected routes for authenticated pages
 * - Public routes for pages accessible without login
 * - Proper loading states and error handling
 */
const AppRouter: React.FC = () => {
  return (
    <AuthProvider>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Routes>
          {/* Public Routes (accessible without authentication) */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/payment/success" element={<Success />} />
          <Route path="/payment/cancel" element={<Cancel />} />
          
          {/* Protected Routes (require authentication) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/create-listing"
            element={
              <ProtectedRoute>
                <CreateListing />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/listings"
            element={
              <ProtectedRoute>
                <Listings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/listings/:id"
            element={
              <ProtectedRoute>
                <ListingDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/listings/:id/edit"
            element={
              <ProtectedRoute>
                <EditListing />
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-listings"
            element={
              <ProtectedRoute>
                <Listings />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                {/* TODO: Create Profile component */}
                <div>Profile (Coming Soon)</div>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                {/* TODO: Create Settings component */}
                <div>Settings (Coming Soon)</div>
              </ProtectedRoute>
            }
          />
          
          {/* Catch all route - redirect to home */}
          <Route path="*" element={<Home />} />
        </Routes>
      </Container>
    </AuthProvider>
  );
};

/**
 * Main App Component
 *
 * App component with routing and authentication.
 * Note: QueryClientProvider is already provided in main.tsx
 */
function App() {
  return <AppRouter />;
}

export default App;
