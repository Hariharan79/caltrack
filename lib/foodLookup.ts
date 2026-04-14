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

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase env vars. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env (see .env.example).'
  );
}

const FOOD_LOOKUP_URL = `${SUPABASE_URL}/functions/v1/food-lookup`;

// Pull the current access token, refreshing proactively if the cached
// session is expired or within 60s of expiring. getSession() returns the
// cached session from storage without refreshing.
async function getAccessToken(): Promise<string> {
  const initial = await supabase.auth.getSession();
  if (initial.error) throw new Error(initial.error.message);

  let session = initial.data.session;
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = session?.expires_at ?? 0;
  if (!session || expiresAt - now < 60) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.error) throw new Error(refreshed.error.message);
    session = refreshed.data.session;
  }

  const token = session?.access_token;
  if (!token) throw new Error('Not signed in');
  return token;
}

// Posts to the food-lookup function directly via fetch instead of
// supabase.functions.invoke. The function is deployed with verify_jwt:false
// because this project's auth mints ES256 user tokens but the edge-function
// gateway's JWT verification is still pinned to HS256, which 401s every real
// user token. See D-28 in DECISIONS.md. We still send Authorization + apikey
// for forward-compat once that's fixed.
async function callFoodLookup<T>(body: Record<string, unknown>): Promise<T> {
  const token = await getAccessToken();

  const res = await fetch(FOOD_LOOKUP_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let parsed: unknown = null;
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!res.ok) {
    const msg =
      parsed && typeof parsed === 'object' && 'error' in parsed &&
      typeof (parsed as { error: unknown }).error === 'string'
        ? (parsed as { error: string }).error
        : `food-lookup failed: HTTP ${res.status}`;
    throw new Error(msg);
  }

  if (parsed === null) throw new Error('No response from food-lookup function');
  const data = parsed as T & { error?: string };
  if (data.error) throw new Error(data.error);
  return data;
}

export async function searchByText(
  query: string,
  pageSize = 20
): Promise<NormalizedFood[]> {
  const trimmed = query.trim();
  if (trimmed === '') return [];

  const data = await callFoodLookup<SearchResponse>({
    source: 'usda',
    query: trimmed,
    pageSize,
  });
  return data.results ?? [];
}

export async function getByBarcode(
  barcode: string
): Promise<NormalizedFood | null> {
  const trimmed = barcode.trim();
  if (trimmed === '') return null;

  const data = await callFoodLookup<BarcodeResponse>({
    source: 'off',
    barcode: trimmed,
  });
  return data.result ?? null;
}
