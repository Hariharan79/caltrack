type SessionShape = { access_token: string; expires_at: number } | null;

type FetchCall = {
  url: string;
  method: string;
  body: unknown;
  headers: Record<string, string>;
};

type FetchNext =
  | { kind: 'ok'; body: unknown }
  | { kind: 'error'; status: number; body: unknown }
  | { kind: 'network'; message: string }
  | { kind: 'empty' };

const fetchState = {
  nextResult: { kind: 'ok', body: {} } as FetchNext,
  calls: [] as FetchCall[],
};

jest.mock('@/lib/supabase', () => {
  const state = {
    session: {
      access_token: 'test-jwt',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    } as SessionShape,
    refreshedSession: null as SessionShape,
    refreshCount: 0,
    refreshError: null as { message: string } | null,
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
        refreshSession: jest.fn(async () => {
          state.refreshCount += 1;
          if (state.refreshError) {
            return { data: { session: null }, error: state.refreshError };
          }
          const next =
            state.refreshedSession ??
            (state.session
              ? {
                  access_token: 'refreshed-jwt',
                  expires_at: Math.floor(Date.now() / 1000) + 3600,
                }
              : null);
          state.session = next;
          return { data: { session: next }, error: null };
        }),
      },
    },
  };
});

import * as supabaseMock from '@/lib/supabase';
import { searchByText, getByBarcode, type NormalizedFood } from '@/lib/foodLookup';

const authMock = supabaseMock as unknown as {
  __state: {
    session: SessionShape;
    refreshedSession: SessionShape;
    refreshCount: number;
    refreshError: { message: string } | null;
  };
};

function setFetch(next: FetchNext) {
  fetchState.nextResult = next;
}

function lastCall(): FetchCall {
  return fetchState.calls[fetchState.calls.length - 1];
}

beforeEach(() => {
  fetchState.calls = [];
  fetchState.nextResult = { kind: 'ok', body: {} };

  authMock.__state.session = {
    access_token: 'test-jwt',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  };
  authMock.__state.refreshedSession = null;
  authMock.__state.refreshCount = 0;
  authMock.__state.refreshError = null;

  (globalThis as { fetch: typeof fetch }).fetch = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const headersInit = (init?.headers ?? {}) as Record<string, string>;
    const rawBody = typeof init?.body === 'string' ? init?.body : '';
    let parsedBody: unknown = null;
    try {
      parsedBody = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      parsedBody = rawBody;
    }
    fetchState.calls.push({
      url: typeof url === 'string' ? url : url.toString(),
      method: init?.method ?? 'GET',
      body: parsedBody,
      headers: headersInit,
    });

    const result = fetchState.nextResult;
    if (result.kind === 'network') {
      throw new Error(result.message);
    }

    const serialized =
      result.kind === 'empty' ? '' : JSON.stringify(result.body);
    const status = result.kind === 'error' ? result.status : 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => serialized,
    } as unknown as Response;
  }) as unknown as typeof fetch;
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
  it('posts to food-lookup with usda source and returns normalized results', async () => {
    setFetch({ kind: 'ok', body: { results: [SAMPLE_FOOD] } });

    const results = await searchByText('chicken', 10);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(SAMPLE_FOOD);
    expect(lastCall().url).toBe(
      'https://test.supabase.co/functions/v1/food-lookup'
    );
    expect(lastCall().method).toBe('POST');
    expect(lastCall().body).toEqual({
      source: 'usda',
      query: 'chicken',
      pageSize: 10,
    });
  });

  it('trims whitespace from the query', async () => {
    setFetch({ kind: 'ok', body: { results: [] } });
    await searchByText('  pasta  ');
    expect((lastCall().body as { query: string }).query).toBe('pasta');
  });

  it('returns an empty array (no API call) for empty / whitespace queries', async () => {
    expect(await searchByText('')).toEqual([]);
    expect(await searchByText('   ')).toEqual([]);
    expect(fetchState.calls).toHaveLength(0);
  });

  it('uses the default pageSize when not specified', async () => {
    setFetch({ kind: 'ok', body: { results: [] } });
    await searchByText('chicken');
    expect((lastCall().body as { pageSize: number }).pageSize).toBe(20);
  });

  it('throws when fetch throws (network error)', async () => {
    setFetch({ kind: 'network', message: 'network down' });
    await expect(searchByText('chicken')).rejects.toThrow('network down');
  });

  it('throws with the server error message on non-2xx', async () => {
    setFetch({
      kind: 'error',
      status: 400,
      body: { error: 'USDA error 401: Invalid API key' },
    });
    await expect(searchByText('chicken')).rejects.toThrow(/Invalid API key/);
  });

  it('throws a generic HTTP error when body is not JSON on non-2xx', async () => {
    setFetch({ kind: 'error', status: 401, body: 'unauthorized' });
    // body is a bare string, JSON.stringify("unauthorized") still parses fine,
    // but has no error key, so the generic HTTP message wins.
    await expect(searchByText('chicken')).rejects.toThrow(/HTTP 401/);
  });

  it('returns [] when results is missing from the response', async () => {
    setFetch({ kind: 'ok', body: {} });
    expect(await searchByText('chicken')).toEqual([]);
  });

  it('attaches the bearer token + apikey + json content-type headers', async () => {
    setFetch({ kind: 'ok', body: { results: [] } });
    await searchByText('chicken');
    expect(lastCall().headers).toEqual({
      Authorization: 'Bearer test-jwt',
      apikey: 'test-anon-key',
      'Content-Type': 'application/json',
    });
  });

  it('throws when no session is present (refresh yields no session)', async () => {
    authMock.__state.session = null;
    await expect(searchByText('chicken')).rejects.toThrow(/signed in/i);
  });

  it('refreshes the session when the token is expired', async () => {
    authMock.__state.session = {
      access_token: 'stale-jwt',
      expires_at: Math.floor(Date.now() / 1000) - 10,
    };
    setFetch({ kind: 'ok', body: { results: [] } });

    await searchByText('chicken');

    expect(authMock.__state.refreshCount).toBe(1);
    expect(lastCall().headers.Authorization).toBe('Bearer refreshed-jwt');
  });

  it('refreshes the session when the token is within the 60s buffer', async () => {
    authMock.__state.session = {
      access_token: 'about-to-expire',
      expires_at: Math.floor(Date.now() / 1000) + 30,
    };
    setFetch({ kind: 'ok', body: { results: [] } });

    await searchByText('chicken');

    expect(authMock.__state.refreshCount).toBe(1);
    expect(lastCall().headers.Authorization).toBe('Bearer refreshed-jwt');
  });

  it('does not refresh when the token is comfortably valid', async () => {
    setFetch({ kind: 'ok', body: { results: [] } });
    await searchByText('chicken');
    expect(authMock.__state.refreshCount).toBe(0);
    expect(lastCall().headers.Authorization).toBe('Bearer test-jwt');
  });

  it('throws when the refresh itself fails', async () => {
    authMock.__state.session = {
      access_token: 'stale-jwt',
      expires_at: Math.floor(Date.now() / 1000) - 10,
    };
    authMock.__state.refreshError = { message: 'refresh_token_not_found' };
    await expect(searchByText('chicken')).rejects.toThrow(
      /refresh_token_not_found/
    );
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

  it('posts to food-lookup with off source and returns the normalized result', async () => {
    setFetch({ kind: 'ok', body: { result: OFF_FOOD } });

    const result = await getByBarcode('737628064502');

    expect(result).toEqual(OFF_FOOD);
    expect(lastCall().body).toEqual({
      source: 'off',
      barcode: '737628064502',
    });
  });

  it('returns null when the function returns null result (product not found)', async () => {
    setFetch({ kind: 'ok', body: { result: null } });
    expect(await getByBarcode('0000000000000')).toBeNull();
  });

  it('returns null for empty / whitespace barcodes (no API call)', async () => {
    expect(await getByBarcode('')).toBeNull();
    expect(await getByBarcode('   ')).toBeNull();
    expect(fetchState.calls).toHaveLength(0);
  });

  it('throws when fetch throws (network error)', async () => {
    setFetch({ kind: 'network', message: 'function timeout' });
    await expect(getByBarcode('737628064502')).rejects.toThrow(
      'function timeout'
    );
  });

  it('throws with the server error message on non-2xx', async () => {
    setFetch({
      kind: 'error',
      status: 400,
      body: { error: 'OFF error 503: service unavailable' },
    });
    await expect(getByBarcode('737628064502')).rejects.toThrow(
      /service unavailable/
    );
  });
});
