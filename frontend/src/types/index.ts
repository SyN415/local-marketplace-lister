export interface User {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Listing {
  id: string;
  title: string;
  description?: string;
  price: number;
  category: string;
  condition: string;
  images?: string[];
  userId: string;
  location?: string;
  status: 'active' | 'sold' | 'expired';
  createdAt: string;
  updatedAt: string;
}

export interface ListingFormData {
  title: string;
  description?: string;
  price: number;
  category: string;
  condition: string;
  images?: File[];
  location?: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    latitude?: number;
    longitude?: number;
  };
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface ListingFilters {
  category?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  searchQuery?: string;
}

export type SortOption = 'newest' | 'oldest' | 'price-low' | 'price-high';