import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Project {
  id: string;
  user_id: string | null;
  name: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
  board_id: string; // new
}

export interface Board {
  id: string;
  user_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  description: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

