import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Debug: Check if credentials are available
console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key available:', !!supabaseAnonKey)

// Handle missing credentials gracefully
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials! Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file')
}

export const supabase = supabaseUrl && supabaseAnonKey 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null
