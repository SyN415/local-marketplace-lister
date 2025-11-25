export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      listings: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          price: number;
          category: string;
          condition: string;
          images: string[] | null;
          user_id: string;
          location: string | null;
          status: 'active' | 'sold' | 'expired';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          price: number;
          category: string;
          condition: string;
          images?: string[] | null;
          user_id: string;
          location?: string | null;
          status?: 'active' | 'sold' | 'expired';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          price?: number;
          category?: string;
          condition?: string;
          images?: string[] | null;
          user_id?: string;
          location?: string | null;
          status?: 'active' | 'sold' | 'expired';
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      email_proxy_pool: {
        Row: {
          id: string;
          email: string;
          encrypted_credentials: Json;
          status: 'available' | 'assigned' | 'cooldown' | 'disabled';
          health_score: number;
          last_used_at: string | null;
          cooldown_until: string | null;
          daily_send_count: number;
          daily_receive_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          encrypted_credentials: Json;
          status?: 'available' | 'assigned' | 'cooldown' | 'disabled';
          health_score?: number;
          last_used_at?: string | null;
          cooldown_until?: string | null;
          daily_send_count?: number;
          daily_receive_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          encrypted_credentials?: Json;
          status?: 'available' | 'assigned' | 'cooldown' | 'disabled';
          health_score?: number;
          last_used_at?: string | null;
          cooldown_until?: string | null;
          daily_send_count?: number;
          daily_receive_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      email_proxy_assignments: {
        Row: {
          id: string;
          user_id: string;
          proxy_pool_id: string;
          alias_prefix: string;
          full_alias: string;
          assigned_at: string;
          expires_at: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          proxy_pool_id: string;
          alias_prefix: string;
          // full_alias is generated
          assigned_at?: string;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          proxy_pool_id?: string;
          alias_prefix?: string;
          assigned_at?: string;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      email_logs: {
        Row: {
          id: string;
          assignment_id: string | null;
          user_id: string;
          direction: 'inbound' | 'outbound';
          from_address: string;
          to_address: string;
          subject: string | null;
          message_id: string | null;
          is_spam: boolean;
          spam_score: number | null;
          spam_reasons: Json | null;
          forwarded_at: string | null;
          forwarding_status: 'pending' | 'sent' | 'failed' | 'blocked' | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          assignment_id?: string | null;
          user_id: string;
          direction: 'inbound' | 'outbound';
          from_address: string;
          to_address: string;
          subject?: string | null;
          message_id?: string | null;
          is_spam?: boolean;
          spam_score?: number | null;
          spam_reasons?: Json | null;
          forwarded_at?: string | null;
          forwarding_status?: 'pending' | 'sent' | 'failed' | 'blocked' | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string | null;
          user_id?: string;
          direction?: 'inbound' | 'outbound';
          from_address?: string;
          to_address?: string;
          subject?: string | null;
          message_id?: string | null;
          is_spam?: boolean;
          spam_score?: number | null;
          spam_reasons?: Json | null;
          forwarded_at?: string | null;
          forwarding_status?: 'pending' | 'sent' | 'failed' | 'blocked' | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      marketplace_connections: {
        Row: {
          id: string;
          user_id: string;
          platform: string;
          access_token: string | null;
          refresh_token: string | null;
          expires_at: string | null;
          is_connected: boolean;
          created_at: string;
          updated_at: string;
          contact_email: string | null;
          contact_phone: string | null;
          encrypted_credentials: Json | null;
          proxy_assignment_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          platform: string;
          access_token?: string | null;
          refresh_token?: string | null;
          expires_at?: string | null;
          is_connected?: boolean;
          created_at?: string;
          updated_at?: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          encrypted_credentials?: Json | null;
          proxy_assignment_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          platform?: string;
          access_token?: string | null;
          refresh_token?: string | null;
          expires_at?: string | null;
          is_connected?: boolean;
          created_at?: string;
          updated_at?: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          encrypted_credentials?: Json | null;
          proxy_assignment_id?: string | null;
        };
      };
      posting_jobs: {
        Row: {
          id: string;
          user_id: string;
          listing_id: string;
          platform: string;
          status: 'pending' | 'processing' | 'success' | 'failed';
          result: Json | null;
          error: string | null;
          attempts: number;
          created_at: string;
          updated_at: string;
          email_alias: string | null;
          max_attempts: number;
          next_retry_at: string | null;
          locked_at: string | null;
          locked_by: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          listing_id: string;
          platform: string;
          status?: 'pending' | 'processing' | 'success' | 'failed';
          result?: Json | null;
          error?: string | null;
          attempts?: number;
          created_at?: string;
          updated_at?: string;
          email_alias?: string | null;
          max_attempts?: number;
          next_retry_at?: string | null;
          locked_at?: string | null;
          locked_by?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          listing_id?: string;
          platform?: string;
          status?: 'pending' | 'processing' | 'success' | 'failed';
          result?: Json | null;
          error?: string | null;
          attempts?: number;
          created_at?: string;
          updated_at?: string;
          email_alias?: string | null;
          max_attempts?: number;
          next_retry_at?: string | null;
          locked_at?: string | null;
          locked_by?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_pending_jobs: {
        Args: {
          worker_id: string;
          batch_size?: number;
        };
        Returns: Database['public']['Tables']['posting_jobs']['Row'][];
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}