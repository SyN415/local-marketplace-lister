import { Listing } from '../../types/listing.types';

export interface AdapterCredentials {
  [key: string]: any;
}

export interface PublishOptions extends Listing {
  // Add any platform-specific options here if needed in the future
}

export interface PublishResult {
  success: boolean;
  platform: string;
  listingUrl?: string;
  platformListingId?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PlatformAdapter {
  readonly platform: string;
  connect(credentials: AdapterCredentials): Promise<boolean>;
  publish(listing: PublishOptions, connection: AdapterCredentials): Promise<PublishResult>;
  disconnect?(): Promise<void>;
}

// Deprecated alias for backward compatibility if needed, but we should switch to PlatformAdapter
export interface MarketplaceAdapter extends PlatformAdapter {}