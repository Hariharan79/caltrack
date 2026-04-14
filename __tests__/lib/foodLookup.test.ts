type InvokeResult = {
  data: unknown;
  error: { message: string } | null;
};

jest.mock('@/lib/supabase', () => {
  const state = {
    nextResult: null as InvokeResult | null,
    calls: [] as Array<{ name: string; body: unknown; headers?: Record<string, string> }>,
    session: { access_token: 'test-jwt' } as { access_token: string } | null,
  };

  return {
    __esModule: true,
    __state: state,
    supabase: {
      auth: {
        getSession: jest.fn(async () => ({
          data: { session: state.session },
          error: null,
        })),
      },
      functions: {
        invoke: jest.fn(
          async (
            name: string,
            opts: { body: unknown; headers?: Record<string, string> }
          ) => {
            state.calls.push({ name, body: opts.body, headers: opts.headers });
            return state.nextResult ?? { data: null, error: null };
          }
        ),
      },
    },
  };
});

import * as supabaseMock from '@/lib/supabase';
import { searchByText, getByBarcode, type NormalizedFood } from '@/lib/foodLookup';

const mock = supabaseMock as unknown as {
  __state: {
    nextResult: InvokeResult | null;
    calls: Array<{ name: string; body: unknown; headers?: Record<string, string> }>;
    session: { access_token: string } | null;
  };
};

function setNext(result: InvokeResult) {
  mock.__state.nextResult = result;
}

function lastCall() {
  return mock.__state.calls[mock.__state.calls.length - 1];
}

beforeEach(() => {
  mock.__state.nextResult = null;
  mock.__state.calls = [];
  mock.__state.session = { access_token: 'test-jwt' };
});

const SAMPLE_FOOD: NormalizedFood = {
  source: 'usda',
  sourceId: '12345',
  name: 'Chicken breast, raw',
  brand: null,
  servingSize: '100 g',
  kcalPerServing: 165,
  proteinG: 31,
  carbsG: 0,
  fatG: 3.6,
  imageUrl: null,
};

describe('searchByText', () => {
  it('invokes food-lookup with usda source and returns normalized results', async () => {
    setNext({ data: { results: [SAMPLE_FOOD] }, error: null });

    const results = await searchByText('chicken', 10);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(SAMPLE_FOOD);
    expect(lastCall().name).toBe('food-lookup');
    expect(lastCall().body).toEqual({
      source: 'usda',
      query: 'chicken',
      pageSize: 10,
    });
  });

  it('trims whitespace from the query', async () => {
    setNext({ data: { results: [] }, error: null });
    await searchByText('  pasta  ');
    expect((lastCall().body as { query: string }).query).toBe('pasta');
  });

  it('returns an empty array (no API call) for empty / whitespace queries', async () => {
    expect(await searchByText('')).toEqual([]);
    expect(await searchByText('   ')).toEqual([]);
    expect(mock.__state.calls).toHaveLength(0);
  });

  it('uses the default pageSize when not specified', async () => {
    setNext({ data: { results: [] }, error: null });
    await searchByText('chicken');
    expect((lastCall().body as { pageSize: number }).pageSize).toBe(20);
  });

  it('throws when the supabase invoke errors', async () => {
    setNext({ data: null, error: { message: 'network down' } });
    await expect(searchByText('chicken')).rejects.toThrow('network down');
  });

  it('throws when the function returns an error in its body', async () => {
    setNext({ data: { error: 'USDA error 401: Invalid API key' }, error: null });
    await expect(searchByText('chicken')).rejects.toThrow(/Invalid API key/);
  });

  it('returns [] when results is missing from the response', async () => {
    setNext({ data: {}, error: null });
    expect(await searchByText('chicken')).toEqual([]);
  });

  it('attaches the bearer token from the session', async () => {
    setNext({ data: { results: [] }, error: null });
    await searchByText('chicken');
    expect(lastCall().headers).toEqual({ Authorization: 'Bearer test-jwt' });
  });

  it('throws when no session is present', async () => {
    mock.__state.session = null;
    await expect(searchByText('chicken')).rejects.toThrow(/signed in/i);
  });
});

describe('getByBarcode', () => {
  const OFF_FOOD: NormalizedFood = {
    source: 'off',
    sourceId: '737628064502',
    name: 'Thai peanut noodle kit',
    brand: 'Simply Asia',
    servingSize: '85 g',
    kcalPerServing: 320,
    proteinG: 8,
    carbsG: 60,
    fatG: 5,
    imageUrl: 'https://images.openfoodfacts.org/images/products/.../front.jpg',
  };

  it('invokes food-lookup with off source and returns the normalized result', async () => {
    setNext({ data: { result: OFF_FOOD }, error: null });

    const result = await getByBarcode('737628064502');

    expect(result).toEqual(OFF_FOOD);
    expect(lastCall().body).toEqual({
      source: 'off',
      barcode: '737628064502',
    });
  });

  it('returns null when the function returns null result (product not found)', async () => {
    setNext({ data: { result: null }, error: null });
    expect(await getByBarcode('0000000000000')).toBeNull();
  });

  it('returns null for empty / whitespace barcodes (no API call)', async () => {
    expect(await getByBarcode('')).toBeNull();
    expect(await getByBarcode('   ')).toBeNull();
    expect(mock.__state.calls).toHaveLength(0);
  });

  it('throws when the supabase invoke errors', async () => {
    setNext({ data: null, error: { message: 'function timeout' } });
    await expect(getByBarcode('737628064502')).rejects.toThrow('function timeout');
  });

  it('throws when the function returns an error in its body', async () => {
    setNext({ data: { error: 'OFF error 503: service unavailable' }, error: null });
    await expect(getByBarcode('737628064502')).rejects.toThrow(/service unavailable/);
  });
});
