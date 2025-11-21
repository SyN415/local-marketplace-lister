import { Listing } from '../../types/listing.types';

export interface MarketplaceAdapter {
  connect(credentials: any): Promise<boolean>;
  publish(listing: Listing, connection: any): Promise<any>;
}