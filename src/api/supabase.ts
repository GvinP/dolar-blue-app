import {SUPABASE_URL, SUPABASE_ANON_KEY} from '@env';

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
