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
  board_id: string;
  completed?: boolean;
  notes?: string;
  tasks?: Task[];
  start_date?: string | null;
  end_date?: string | null;
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
  status: 'todo' | 'in_progress' | 'done';
  position: number;
  created_at: string;
  updated_at: string;
  start_date?: string | null;
  end_date?: string | null;
}

