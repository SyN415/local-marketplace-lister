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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}