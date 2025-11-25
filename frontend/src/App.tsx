import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/layout/Header';
import ProtectedRoute from './components/ProtectedRoute';

// Page components
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import Connections from './pages/Connections';
import FacebookCallback from './components/connections/FacebookCallback';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AuthCallback from './pages/AuthCallback';
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
      <Header />
      <main id="main-content" className="min-h-screen">
        <Routes>
          {/* Public Routes (accessible without authentication) */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
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
            path="/dashboard/connections"
            element={
              <ProtectedRoute>
                <Connections />
              </ProtectedRoute>
            }
          />

          <Route
            path="/connections/facebook/callback"
            element={
              <ProtectedRoute>
                <FacebookCallback />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/jobs"
            element={
              <ProtectedRoute>
                <Jobs />
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
      </main>
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
