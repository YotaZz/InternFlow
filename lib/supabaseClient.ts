// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

// 确保你在 .env.local 中填入了这两个变量
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL or Anon Key is missing in environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)