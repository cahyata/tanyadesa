import { createClient } from "@supabase/supabase-js";

/**
 * Klien admin (service role). Hanya untuk kode server dan skrip.
 * Jangan pernah diimpor dari komponen client.
 */
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
