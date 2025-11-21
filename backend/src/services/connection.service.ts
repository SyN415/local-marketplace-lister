import { supabaseAdmin } from '../config/supabase';
import {
  MarketplaceConnection,
  CreateConnectionRequest,
  ConnectionResponse,
  ApiResponse,
  MARKETPLACE_PLATFORMS
} from '../types/connection.types';

class ConnectionService {
  /**
   * Get all connections for a user
   */
  async getUserConnections(userId: string): Promise<ApiResponse<ConnectionResponse[]>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('marketplace_connections')
        .select('id, platform, is_active, connected_at')
        .eq('user_id', userId);

      if (error) {
        console.error('Get connections error:', error);
        return {
          success: false,
          error: 'Failed to fetch connections'
        };
      }

      return {
        success: true,
        data: data as ConnectionResponse[],
        message: 'Connections retrieved successfully'
      };
    } catch (error) {
      console.error('Get connections service error:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Create or update a marketplace connection
   * Note: This handles sensitive credentials.
   * TODO: Implement encryption for credentials before storing in production.
   */
  async createOrUpdateConnection(userId: string, data: CreateConnectionRequest): Promise<ApiResponse<ConnectionResponse>> {
    try {
      // Validation
      if (!MARKETPLACE_PLATFORMS.includes(data.platform)) {
        return {
          success: false,
          error: `Invalid platform. Must be one of: ${MARKETPLACE_PLATFORMS.join(', ')}`
        };
      }

      if (!data.credentials || Object.keys(data.credentials).length === 0) {
        return {
          success: false,
          error: 'Credentials are required'
        };
      }

      // Check if connection already exists
      const { data: existingConnection } = await supabaseAdmin
        .from('marketplace_connections')
        .select('id')
        .eq('user_id', userId)
        .eq('platform', data.platform)
        .single();

      let result;
      
      if (existingConnection) {
        // Update existing connection
        const { data: updated, error } = await supabaseAdmin
          .from('marketplace_connections')
          .update({
            credentials: data.credentials,
            is_active: true,
            connected_at: new Date().toISOString(),
            updated_at: new Date().toISOString() // Assuming there is an updated_at trigger or column
          })
          .eq('id', existingConnection.id)
          .select('id, platform, is_active, connected_at')
          .single();
        
        if (error) throw error;
        result = updated;
      } else {
        // Create new connection
        const { data: created, error } = await supabaseAdmin
          .from('marketplace_connections')
          .insert({
            user_id: userId,
            platform: data.platform,
            credentials: data.credentials,
            is_active: true,
            connected_at: new Date().toISOString()
          })
          .select('id, platform, is_active, connected_at')
          .single();

        if (error) throw error;
        result = created;
      }

      return {
        success: true,
        data: result as ConnectionResponse,
        message: `Successfully connected to ${data.platform}`
      };

    } catch (error) {
      console.error('Create/Update connection error:', error);
      return {
        success: false,
        error: 'Failed to save connection'
      };
    }
  }

  /**
   * Delete a connection
   */
  async deleteConnection(userId: string, connectionId: string): Promise<ApiResponse> {
    try {
      const { error } = await supabaseAdmin
        .from('marketplace_connections')
        .delete()
        .eq('id', connectionId)
        .eq('user_id', userId);

      if (error) {
        console.error('Delete connection error:', error);
        return {
          success: false,
          error: 'Failed to remove connection'
        };
      }

      return {
        success: true,
        message: 'Connection removed successfully'
      };
    } catch (error) {
      console.error('Delete connection service error:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }
}

export const connectionService = new ConnectionService();