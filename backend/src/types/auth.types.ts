export interface User {
  id: string;
  email: string;
  email_confirmed_at?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string;
  role?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
  location?: string;
  created_at: string;
  updated_at: string;
  stripe_customer_id?: string;
  credits: number;
}

export interface AuthResponse {
  user: User | null;
  session?: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at: number;
    token_type: string;
  };
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SessionUser extends User {
  profile?: UserProfile;
}