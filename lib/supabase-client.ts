// lib/supabase-client.ts

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Define globalThis.supabase type
declare global {
  var supabase: SupabaseClient | undefined;
}

// Create a singleton instance
const supabase = globalThis.supabase ?? createClient(supabaseUrl, supabaseAnonKey);

if (typeof window !== "undefined") {
  globalThis.supabase = supabase; // Store globally to prevent re-creation
}

export { supabase };

