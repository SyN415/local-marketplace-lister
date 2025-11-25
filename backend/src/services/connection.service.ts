import { supabaseAdmin } from '../config/supabase';
import { facebookAuthService } from './facebook.auth.service';
import { emailProxyService } from './email-proxy.service';
import { encryptionService } from './encryption.service';
import {
  CreateConnectionRequest,
  ConnectionResponse,
  ApiResponse,
  MARKETPLACE_PLATFORMS,
  CraigslistConnectionData
} from '../types/connection.types';

class ConnectionService {
  /**
   * Get all connections for a user
   */
  async getUserConnections(userId: string): Promise<ApiResponse<ConnectionResponse[]>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('marketplace_connections')
        .select(`
          id,
          platform,
          is_active,
          connected_at,
          contact_email,
          contact_phone,
          proxy_assignment_id
        `)
        .eq('user_id', userId);

      if (error) {
        console.error('Get connections error:', error);
        return {
          success: false,
          error: 'Failed to fetch connections'
        };
      }

      // Enrich with proxy email if assignment exists
      const connections = await Promise.all(data.map(async (conn: any) => {
        let proxy_email;
        if (conn.proxy_assignment_id) {
          // In a real query we could join, but for now this works given low volume of connections per user
          const { data: assignment } = await supabaseAdmin
            .from('email_proxy_assignments')
            .select(`
              full_alias,
              email_proxy_pool!inner(email)
            `)
            .eq('id', conn.proxy_assignment_id)
            .single();
          
          if (assignment) {
             const proxyPool = assignment.email_proxy_pool as unknown as { email: string };
             const [localPart, domain] = proxyPool.email.split('@');
             proxy_email = `${localPart}+${assignment.full_alias}@${domain}`;
          }
        }

        return {
          ...conn,
          proxy_email
        };
      }));

      return {
        success: true,
        data: connections as ConnectionResponse[],
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

      // Extract contact info if Craigslist
      let contactEmail = null;
      let contactPhone = null;
      let proxyAssignmentId = null;

      if (data.platform === 'craigslist') {
        const creds = data.credentials as CraigslistConnectionData;
        contactEmail = creds.contactEmail;
        contactPhone = creds.contactPhone;

        // Try to assign a proxy if this is a new connection or re-activating
          if (!existingConnection) {
            const assignment = await emailProxyService.assignProxy(userId);
            if (assignment) {
              proxyAssignmentId = assignment.id;
            }
          }
      }

      let result;
      
      // Encrypt credentials before storing
      const encryptedCredentials = encryptionService.encrypt(data.credentials);

      const updateData: any = {
        encrypted_credentials: encryptedCredentials,
        is_active: true,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (contactEmail) updateData.contact_email = contactEmail;
      if (contactPhone) updateData.contact_phone = contactPhone;
      
      if (existingConnection) {
        // Update existing connection
        const { data: updated, error } = await supabaseAdmin
          .from('marketplace_connections')
          .update(updateData)
          .eq('id', existingConnection.id)
          .select('id, platform, is_active, connected_at, contact_email, contact_phone, proxy_assignment_id')
          .single();
        
        if (error) throw error;
        result = updated;
      } else {
        // Create new connection
        const insertData: any = {
          user_id: userId,
          platform: data.platform,
          encrypted_credentials: encryptedCredentials,
          is_active: true,
          connected_at: new Date().toISOString()
        };

        if (contactEmail) insertData.contact_email = contactEmail;
        if (contactPhone) insertData.contact_phone = contactPhone;

        const { data: created, error } = await supabaseAdmin
          .from('marketplace_connections')
          .insert(insertData)
          .select('id, platform, is_active, connected_at, contact_email, contact_phone, proxy_assignment_id')
          .single();

        if (error) throw error;
        result = created;
      }
      
      // If we have a proxy assignment, we should fetch the email to return
      let proxyEmail;
      if (result.proxy_assignment_id) {
         const { data: assignment } = await supabaseAdmin
            .from('email_proxy_assignments')
            .select(`
              full_alias,
              email_proxy_pool!inner(email)
            `)
            .eq('id', result.proxy_assignment_id)
            .single();
          
          if (assignment) {
             const proxyPool = assignment.email_proxy_pool as unknown as { email: string };
             const [localPart, domain] = proxyPool.email.split('@');
             proxyEmail = `${localPart}+${assignment.full_alias}@${domain}`;
          }
      }

      return {
        success: true,
        data: { ...result, proxy_email: proxyEmail } as ConnectionResponse,
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
   * Handle Facebook OAuth callback
   */
  async handleFacebookCallback(code: string, userId: string): Promise<ApiResponse<ConnectionResponse>> {
    try {
      // Exchange code for token
      const tokenData = await facebookAuthService.exchangeCode(code);
      
      // Get user profile
      const profile = await facebookAuthService.getUserProfile(tokenData.access_token);
      
      // Check if connection already exists
      const { data: existingConnection } = await supabaseAdmin
        .from('marketplace_connections')
        .select('id')
        .eq('user_id', userId)
        .eq('platform', 'facebook')
        .single();

      const credentials = {
        accessToken: tokenData.access_token,
        userId: profile.id,
        name: profile.name,
        email: profile.email,
        expiresIn: tokenData.expires_in
      };

      const encryptedCredentials = encryptionService.encrypt(credentials);

      const connectionData = {
        user_id: userId,
        platform: 'facebook',
        encrypted_credentials: encryptedCredentials,
        is_active: true,
        connected_at: new Date().toISOString()
      };

      let result;

      if (existingConnection) {
        const { data: updated, error } = await supabaseAdmin
          .from('marketplace_connections')
          .update({
            ...connectionData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingConnection.id)
          .select('id, platform, is_active, connected_at')
          .single();
          
         if (error) throw error;
         result = updated;
      } else {
        const { data: created, error } = await supabaseAdmin
          .from('marketplace_connections')
          .insert(connectionData)
          .select('id, platform, is_active, connected_at')
          .single();

        if (error) throw error;
        result = created;
      }

      return {
        success: true,
        data: result as ConnectionResponse,
        message: 'Successfully connected to Facebook'
      };

    } catch (error: any) {
      console.error('Facebook callback handling error:', error);
      return {
        success: false,
        error: error.message || 'Failed to complete Facebook connection'
      };
    }
  }

  /**
   * Assign an email proxy to a connection
   */
  async assignEmailProxy(userId: string, connectionId: string): Promise<string | null> {
    const assignment = await emailProxyService.assignProxy(userId);
    return assignment ? assignment.proxyEmail : null;
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