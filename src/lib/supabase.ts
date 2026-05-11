import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

function readEnv(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

const SUPABASE_URL = readEnv(process.env.EXPO_PUBLIC_SUPABASE_URL);
const SUPABASE_ANON_KEY = readEnv(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

export const missingSupabaseEnvVars = [
  !SUPABASE_URL ? "EXPO_PUBLIC_SUPABASE_URL" : null,
  !SUPABASE_ANON_KEY ? "EXPO_PUBLIC_SUPABASE_ANON_KEY" : null,
].filter((name): name is string => Boolean(name));

export const isSupabaseConfigured = missingSupabaseEnvVars.length === 0;

if (!isSupabaseConfigured) {
  console.warn(
    `Missing Supabase env vars: ${missingSupabaseEnvVars.join(", ")}`
  );
}

export const supabase = createClient(
  SUPABASE_URL ?? "https://example.supabase.co",
  SUPABASE_ANON_KEY ?? "missing-anon-key",
  {
  auth: {
    // ✅ to naprawia "invalid flow state" w RN
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // RN nie parsuje URL jak web
    flowType: "pkce",          // wymuś PKCE
  },
  }
);
