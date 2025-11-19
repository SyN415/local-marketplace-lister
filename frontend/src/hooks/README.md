# React Query Hooks for Marketplace Application

This directory contains React Query hooks for data fetching and state management in the marketplace application.

## Overview

The hooks are organized into two main categories:
- **Authentication hooks** (`useAuth.ts`) - Handle user authentication and profile management
- **Listing hooks** (`useListings.ts`) - Handle marketplace listings operations

## Setup

To use these hooks, you need to:

1. Wrap your app with the React Query provider (in `main.tsx`):
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/react-query';

// Wrap your app
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app components */}
    </QueryClientProvider>
  );
};
```

2. Set the API URL in your environment variables:
```bash
VITE_API_URL=http://localhost:3000
```

## Authentication Hooks

### `useAuth()`

The main hook that provides all authentication functionality:

```tsx
import { useAuth } from '../hooks/useAuth';

const MyComponent = () => {
  const {
    // Data
    user,
    isAuthenticated,
    
    // Loading states
    isLoading,
    isLoggingIn,
    isSigningUp,
    isLoggingOut,
    isUpdatingProfile,
    
    // Error states
    loginError,
    signupError,
    logoutError,
    updateProfileError,
    userError,
    
    // Mutation functions
    login,
    signup,
    logout,
    updateProfile,
    
    // Utilities
    clearErrors,
    refetchUser,
  } = useAuth();

  // Use in your component logic
  if (isLoading) return <div>Loading...</div>;
  
  if (!isAuthenticated) {
    return (
      <div>
        <button onClick={() => login({ email, password })}>Login</button>
        <button onClick={() => signup({ email, password, fullName })}>Sign Up</button>
      </div>
    );
  }

  return (
    <div>
      <p>Welcome, {user?.fullName}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
};
```

### Individual Auth Hooks

You can also use individual hooks for more specific functionality:

```tsx
import { useLogin, useCurrentUser, useUpdateProfile } from '../hooks/useAuth';

// Login example
const LoginForm = () => {
  const loginMutation = useLogin();
  
  const handleLogin = (email: string, password: string) => {
    loginMutation.mutate({ email, password });
  };
  
  if (loginMutation.isPending) return <div>Logging in...</div>;
  if (loginMutation.error) return <div>Error: {loginMutation.error.message}</div>;
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleLogin(email, password);
    }}>
      {/* Form fields */}
    </form>
  );
};

// Get current user
const UserProfile = () => {
  const { data: user, isLoading, error } = useCurrentUser();
  
  if (isLoading) return <div>Loading user...</div>;
  if (error) return <div>Error loading user</div>;
  if (!user) return <div>Please log in</div>;
  
  return <div>Hello, {user.fullName}!</div>;
};

// Update profile
const ProfileEditor = () => {
  const updateProfileMutation = useUpdateProfile();
  
  const handleUpdate = (updates: Partial<User>) => {
    updateProfileMutation.mutate(updates);
  };
  
  return (
    <div>
      <button 
        onClick={() => handleUpdate({ fullName: 'New Name' })}
        disabled={updateProfileMutation.isPending}
      >
        {updateProfileMutation.isPending ? 'Updating...' : 'Update Profile'}
      </button>
    </div>
  );
};
```

## Listing Hooks

### Individual Listing Hooks

```tsx
import { 
  useGetListings, 
  useGetListing, 
  useCreateListing, 
  useUpdateListing, 
  useDeleteListing,
  useListingStats,
  useSearchListings 
} from '../hooks/useListings';

// Get all listings
const ListingsPage = () => {
  const { data, isLoading, error } = useGetListings({
    page: 1,
    limit: 20,
    category: 'electronics',
    minPrice: 100,
    maxPrice: 1000,
  });
  
  if (isLoading) return <div>Loading listings...</div>;
  if (error) return <div>Error loading listings</div>;
  
  return (
    <div>
      {data?.listings.map(listing => (
        <div key={listing.id}>{listing.title} - ${listing.price}</div>
      ))}
    </div>
  );
};

// Get single listing
const ListingDetail = ({ id }: { id: string }) => {
  const { data: listing, isLoading, error } = useGetListing(id);
  
  if (isLoading) return <div>Loading listing...</div>;
  if (error) return <div>Error loading listing</div>;
  if (!listing) return <div>Listing not found</div>;
  
  return (
    <div>
      <h1>{listing.title}</h1>
      <p>${listing.price}</p>
      <p>{listing.description}</p>
    </div>
  );
};

// Create new listing
const CreateListingForm = () => {
  const createListingMutation = useCreateListing();
  
  const handleCreate = (listingData: ListingFormData) => {
    createListingMutation.mutate(listingData);
  };
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      // Collect form data and call handleCreate
    }}>
      <button 
        type="submit"
        disabled={createListingMutation.isPending}
      >
        {createListingMutation.isPending ? 'Creating...' : 'Create Listing'}
      </button>
      {createListingMutation.error && (
        <div>Error: {createListingMutation.error.message}</div>
      )}
    </form>
  );
};

// Update listing
const EditListing = ({ id }: { id: string }) => {
  const updateListingMutation = useUpdateListing(id);
  
  const handleUpdate = (updates: Partial<ListingFormData>) => {
    updateListingMutation.mutate(updates);
  };
  
  return (
    <div>
      <button 
        onClick={() => handleUpdate({ title: 'New Title' })}
        disabled={updateListingMutation.isPending}
      >
        {updateListingMutation.isPending ? 'Updating...' : 'Update Listing'}
      </button>
    </div>
  );
};

// Delete listing
const DeleteListingButton = ({ id }: { id: string }) => {
  const deleteListingMutation = useDeleteListing(id);
  
  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this listing?')) {
      deleteListingMutation.mutate();
    }
  };
  
  return (
    <button 
      onClick={handleDelete}
      disabled={deleteListingMutation.isPending}
    >
      {deleteListingMutation.isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
};

// Get listing statistics
const Dashboard = () => {
  const { data: stats, isLoading, error } = useListingStats();
  
  if (isLoading) return <div>Loading stats...</div>;
  if (error) return <div>Error loading stats</div>;
  
  return (
    <div>
      <h2>Your Listings</h2>
      <p>Total: {stats?.totalListings}</p>
      <p>Active: {stats?.activeListings}</p>
      <p>Sold: {stats?.soldListings}</p>
    </div>
  );
};

// Search listings
const SearchResults = ({ query, filters }: { query: string; filters?: ListingFilters }) => {
  const { data: results, isLoading, error } = useSearchListings(query, filters);
  
  if (isLoading) return <div>Searching...</div>;
  if (error) return <div>Search error</div>;
  
  return (
    <div>
      {results.map(listing => (
        <div key={listing.id}>{listing.title}</div>
      ))}
    </div>
  );
};
```

### Combined Operations Hook

For convenience, you can use the combined hook for common operations:

```tsx
import { useListingOperations } from '../hooks/useListings';

const ListingsManager = () => {
  const {
    // Data
    listings,
    pagination,
    stats,
    
    // Loading states
    isLoadingListings,
    isLoadingStats,
    
    // Error states
    listingsError,
    statsError,
    
    // Actions
    createListing,
    
    // Utilities
    refetchListings,
    refetchStats,
  } = useListingOperations({
    page: 1,
    limit: 20,
  });
  
  return (
    <div>
      <h2>My Listings ({stats?.totalListings || 0})</h2>
      
      {isLoadingListings ? (
        <div>Loading listings...</div>
      ) : listingsError ? (
        <div>Error: {listingsError.message}</div>
      ) : (
        <div>
          {listings.map(listing => (
            <div key={listing.id}>{listing.title}</div>
          ))}
        </div>
      )}
      
      <button onClick={refetchListings}>Refresh</button>
    </div>
  );
};
```

## Query Keys

Query keys are defined in `query-keys.ts` and provide a consistent way to invalidate and manage cached data:

```tsx
import { listingKeys, authKeys } from '../lib/query-keys';

// Manual cache invalidation
const { queryClient } = useQueryClient();

// Invalidate all listings
queryClient.invalidateQueries({ queryKey: listingKeys.all() });

// Invalidate specific user's listings
queryClient.invalidateQueries({ queryKey: listingKeys.mine(userId) });

// Invalidate auth queries
queryClient.invalidateQueries({ queryKey: authKeys.currentUser });

// Update cache manually
queryClient.setQueryData(listingKeys.detail(listingId), updatedListing);
```

## Environment Variables

Make sure to set these environment variables:

```bash
# Frontend .env
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Error Handling

All hooks include proper error handling:

- Automatic retry for failed requests (except 4xx errors)
- Rollback on mutation errors with optimistic updates
- User-friendly error messages
- Console logging for debugging

## Optimistic Updates

The hooks support optimistic updates for better user experience:

- Listings are immediately updated in cache when created/updated/deleted
- Automatic rollback on errors
- Smooth UI transitions

## Performance Features

- Automatic caching with configurable stale times
- Background refetching on window focus
- Request deduplication
- Efficient cache invalidation patterns

## Best Practices

1. **Use appropriate query keys** - Leverage the provided query key constants for cache management
2. **Handle loading states** - Always check loading states for better UX
3. **Error boundaries** - Wrap components that use these hooks in error boundaries
4. **Optimistic updates** - The hooks handle this automatically, but be aware of the behavior
5. **Cache invalidation** - Understand when data might be stale and use `refetch` when needed

## API Integration

The hooks are designed to work with the backend API endpoints:

- **Auth**: `/api/auth/*`
- **Listings**: `/api/listings/*`

Make sure your backend API follows the expected request/response format.