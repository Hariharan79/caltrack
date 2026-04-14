// @ts-nocheck — Supabase Edge Functions run on Deno, not Node. The repo's
// Node tsconfig excludes this folder; the file is only ever executed inside
// the Edge runtime where `Deno`, the std lib, and the relative TS imports
// resolve correctly.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import {
  normalizeUsda,
  normalizeOff,
  type NormalizedFood,
  type UsdaFood,
  type OffProductResponse,
} from '../../../lib/foodNormalizers.ts';

type Source = 'usda' | 'off';

interface FoodLookupRequest {
  source: Source;
  query?: string;
  barcode?: string;
  pageSize?: number;
}

interface UsdaSearchResponse {
  foods?: UsdaFood[];
}

async function searchUsda(
  apiKey: string,
  query: string,
  pageSize: number
): Promise<NormalizedFood[]> {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      pageSize,
      dataType: ['Branded', 'Foundation', 'SR Legacy'],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`USDA error ${res.status}: ${text.slice(0, 200)}`);
  }
  const data: UsdaSearchResponse = await res.json();
  return (data.foods ?? [])
    .map(normalizeUsda)
    .filter((f): f is NormalizedFood => f !== null);
}

async function getOffByBarcode(barcode: string): Promise<NormalizedFood | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'caltrack-autopilot-test/1.0 (personal)',
    },
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    const text = await res.text();
    throw new Error(`OFF error ${res.status}: ${text.slice(0, 200)}`);
  }
  const data: OffProductResponse = await res.json();
  return normalizeOff(data, barcode);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const usdaApiKey = Deno.env.get('USDA_FDC_API_KEY');
  if (!usdaApiKey) {
    return new Response(
      JSON.stringify({ error: 'USDA_FDC_API_KEY is not configured on the server' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  let body: FoodLookupRequest;
  try {
    body = (await req.json()) as FoodLookupRequest;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    if (body.source === 'usda') {
      if (!body.query || body.query.trim() === '') {
        throw new Error('query required for usda source');
      }
      const pageSize = Math.min(Math.max(body.pageSize ?? 20, 1), 50);
      const results = await searchUsda(usdaApiKey, body.query.trim(), pageSize);
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.source === 'off') {
      if (!body.barcode || body.barcode.trim() === '') {
        throw new Error('barcode required for off source');
      }
      const result = await getOffByBarcode(body.barcode.trim());
      return new Response(JSON.stringify({ result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`unknown source: ${String(body.source)}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
