export interface MarketplaceConnection {
  id: string;
  user_id: string;
  platform: 'facebook' | 'offerup' | 'craigslist';
  credentials?: Record<string, any>;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  is_active: boolean;
  connected_at: string;
  metadata?: Record<string, any>;
}

export interface CreateConnectionRequest {
  platform: 'facebook' | 'offerup' | 'craigslist';
  credentials: Record<string, any>;
}

export interface UpdateConnectionRequest {
  credentials?: Record<string, any>;
  is_active?: boolean;
}

export interface ConnectionResponse {
  id: string;
  platform: string;
  is_active: boolean;
  connected_at: string;
}

export const MARKETPLACE_PLATFORMS = ['facebook', 'offerup', 'craigslist'] as const;
export type MarketplacePlatform = typeof MARKETPLACE_PLATFORMS[number];

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}