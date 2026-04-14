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

export async function searchByText(
  query: string,
  pageSize = 20
): Promise<NormalizedFood[]> {
  const trimmed = query.trim();
  if (trimmed === '') return [];

  const { data, error } = await supabase.functions.invoke<SearchResponse>(
    'food-lookup',
    {
      body: { source: 'usda', query: trimmed, pageSize },
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

  const { data, error } = await supabase.functions.invoke<BarcodeResponse>(
    'food-lookup',
    {
      body: { source: 'off', barcode: trimmed },
    }
  );

  if (error) throw new Error(error.message);
  if (!data) throw new Error('No response from food-lookup function');
  if (data.error) throw new Error(data.error);
  return data.result ?? null;
}
