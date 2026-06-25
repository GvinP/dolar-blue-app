const SUPABASE_URL = 'https://rvcdqsdtamldqtbgpeka.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Y2Rxc2R0YW1sZHF0YmdwZWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODI5MTUsImV4cCI6MjA5NzQ1ODkxNX0.Y_ByO25eGZkFm9H_cb8rk8F3o4ILx5ElDwrjAtT9Wfo';

/**
 * Lightweight wrapper around Supabase REST API (PostgREST).
 * No @supabase/supabase-js dependency needed — just fetch.
 */
export const supabaseGet = async <T>(
  table: string,
  query = '',
): Promise<T[]> => {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`;

  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};
