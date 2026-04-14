import { supabase } from './supabase';
import type { NormalizedFood, FoodLookupSource } from './foodNormalizers';

export type { NormalizedFood, FoodLookupSource };

interface SearchResponse {
  results?: NormalizedFood[];
  error?: string;
}

interface BarcodeResponse {
  result?: NormalizedFood | null;
  error?: string;
}

// food-lookup has verify_jwt: true. Pull the session token explicitly and
// attach it so we never get a stale bearer from the FunctionsClient cache.
async function authHeaders(): Promise<Record<string, string>> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const token = data.session?.access_token;
  if (!token) throw new Error('Not signed in');
  return { Authorization: `Bearer ${token}` };
}

export async function searchByText(
  query: string,
  pageSize = 20
): Promise<NormalizedFood[]> {
  const trimmed = query.trim();
  if (trimmed === '') return [];

  const headers = await authHeaders();
  const { data, error } = await supabase.functions.invoke<SearchResponse>(
    'food-lookup',
    {
      body: { source: 'usda', query: trimmed, pageSize },
      headers,
    }
  );

  if (error) throw new Error(error.message);
  if (!data) throw new Error('No response from food-lookup function');
  if (data.error) throw new Error(data.error);
  return data.results ?? [];
}

export async function getByBarcode(
  barcode: string
): Promise<NormalizedFood | null> {
  const trimmed = barcode.trim();
  if (trimmed === '') return null;

  const headers = await authHeaders();
  const { data, error } = await supabase.functions.invoke<BarcodeResponse>(
    'food-lookup',
    {
      body: { source: 'off', barcode: trimmed },
      headers,
    }
  );

  if (error) throw new Error(error.message);
  if (!data) throw new Error('No response from food-lookup function');
  if (data.error) throw new Error(data.error);
  return data.result ?? null;
}
