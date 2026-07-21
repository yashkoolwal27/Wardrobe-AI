import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Missing environment variables. Authentication and data persistence will not work. ' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          share_code: string;
          privacy: 'public' | 'private' | 'approval';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      wardrobe_items: {
        Row: {
          id: string;
          user_id: string;
          image_url: string;
          thumbnail_url: string | null;
          category: string;
          color: string[];
          season: string[];
          occasion: string[];
          brand: string | null;
          description: string;
          tags: string[];
          price: number | null;
          purchase_date: string | null;
          wear_count: number;
          last_worn: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['wardrobe_items']['Row'], 'created_at' | 'wear_count'>;
        Update: Partial<Database['public']['Tables']['wardrobe_items']['Insert']>;
      };
      saved_outfits: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          items: Array<{ wardrobeItemId: string; category: string; imageUrl: string }>;
          generated_image_url: string | null;
          description: string | null;
          styling_tips: string[];
          occasion: string | null;
          season: string | null;
          likes: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['saved_outfits']['Row'], 'created_at' | 'likes'>;
        Update: Partial<Database['public']['Tables']['saved_outfits']['Insert']>;
      };
      likes: {
        Row: { id: string; user_id: string; outfit_id: string; created_at: string };
        Insert: Omit<Database['public']['Tables']['likes']['Row'], 'created_at'>;
        Update: never;
      };
      comments: {
        Row: {
          id: string;
          user_id: string;
          outfit_id: string;
          text: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['comments']['Row'], 'created_at'>;
        Update: Partial<Pick<Database['public']['Tables']['comments']['Row'], 'text'>>;
      };
      wear_logs: {
        Row: {
          id: string;
          user_id: string;
          outfit_id: string | null;
          item_ids: string[];
          worn_at: string;
          occasion: string | null;
          weather: string | null;
          notes: string | null;
        };
        Insert: Omit<Database['public']['Tables']['wear_logs']['Row'], never>;
        Update: Partial<Database['public']['Tables']['wear_logs']['Insert']>;
      };
    };
  };
};
