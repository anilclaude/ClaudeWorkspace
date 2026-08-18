import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createApiClient, ApiClientError, type Fetcher } from './api-client';

function fetcherReturning(status: number, body: unknown): Fetcher {
  return async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe('createApiClient', () => {
  const schema = z.object({ status: z.literal('ok') });

  it('returns parsed data when the response matches its contract', async () => {
    const client = createApiClient('http://svc', fetcherReturning(200, { status: 'ok' }));
    await expect(client.get('/health/live', schema)).resolves.toEqual({ status: 'ok' });
  });

  // The point of the package: contract drift fails here, not three components deep.
  it('throws when the response does not match its contract', async () => {
    const client = createApiClient('http://svc', fetcherReturning(200, { status: 'degraded' }));
    await expect(client.get('/health/live', schema)).rejects.toBeInstanceOf(ApiClientError);
  });

  it('throws on a non-2xx response', async () => {
    const client = createApiClient('http://svc', fetcherReturning(503, {}));
    await expect(client.get('/health/live', schema)).rejects.toBeInstanceOf(ApiClientError);
  });

  // cafe-menu-management T10 — createApiClient's new optional TokenProvider
  // param. A capturing fetcher records the init it was actually called with,
  // so these assertions check the real header sent, not an internal detail.
  describe('Authorization header (TokenProvider)', () => {
    function capturingFetcher(status: number, body: unknown) {
      const calls: Array<{ url: string; init?: Parameters<Fetcher>[1] }> = [];
      const fetcher: Fetcher = async (url, init) => {
        calls.push({ url, init });
        return { ok: status >= 200 && status < 300, status, json: async () => body };
      };
      return { fetcher, calls };
    }

    // No token argument at all — the pre-existing authService()/coreService()
    // call shape. Proves the widened signature doesn't change their behavior.
    it('sends no Authorization header when no token is provided', async () => {
      const { fetcher, calls } = capturingFetcher(200, { status: 'ok' });
      const client = createApiClient('http://svc', fetcher);

      await client.get('/health/live', schema);

      expect(calls[0]?.init?.headers).toEqual({ 'content-type': 'application/json' });
      expect(calls[0]?.init?.headers?.Authorization).toBeUndefined();
    });

    it('attaches an Authorization: Bearer header when a static token string is provided', async () => {
      const { fetcher, calls } = capturingFetcher(200, { status: 'ok' });
      const client = createApiClient('http://svc', fetcher, 'abc123');

      await client.get('/health/live', schema);

      expect(calls[0]?.init?.headers?.Authorization).toBe('Bearer abc123');
    });

    // The getter form — cafeService()'s actual usage (readSessionToken passed
    // as a function, not called and inlined at cafeService() construction
    // time). Proves the function branch is exercised, not just the string one.
    it('attaches an Authorization: Bearer header when a token-getter function is provided', async () => {
      const { fetcher, calls } = capturingFetcher(200, { status: 'ok' });
      const client = createApiClient('http://svc', fetcher, () => 'xyz789');

      await client.get('/health/live', schema);

      expect(calls[0]?.init?.headers?.Authorization).toBe('Bearer xyz789');
    });

    // The no-session case a real caller (cafeService(), backed by
    // readSessionToken() returning null when localStorage has no token) hits
    // in practice — proves a getter returning null behaves the same as no
    // token at all, not a crash and not a literal "Bearer null" header.
    it('sends no Authorization header when a token-getter function returns null', async () => {
      const { fetcher, calls } = capturingFetcher(200, { status: 'ok' });
      const client = createApiClient('http://svc', fetcher, () => null);

      await client.get('/health/live', schema);

      expect(calls[0]?.init?.headers?.Authorization).toBeUndefined();
    });

    it('re-resolves a token-getter function on every request, not just once at client construction', async () => {
      const { fetcher, calls } = capturingFetcher(200, { status: 'ok' });
      let token: string | null = 'first';
      const client = createApiClient('http://svc', fetcher, () => token);

      await client.get('/health/live', schema);
      token = 'second';
      await client.get('/health/live', schema);

      expect(calls[0]?.init?.headers?.Authorization).toBe('Bearer first');
      expect(calls[1]?.init?.headers?.Authorization).toBe('Bearer second');
    });
  });

  // cafe-menu-management T11 — the first caller needing a partial update
  // (the edit form's Save and its immediate availability-toggle PATCH).
  // Same request() internals as get/post; these tests prove the `patch`
  // method actually sends method PATCH with the JSON body, not just that it
  // resolves to the right type.
  describe('patch', () => {
    it('returns parsed data when the response matches its contract', async () => {
      const client = createApiClient('http://svc', fetcherReturning(200, { status: 'ok' }));
      await expect(client.patch('/menu/items/item-1', { isAvailable: false }, schema)).resolves.toEqual({
        status: 'ok',
      });
    });

    it('sends the request with method PATCH and the JSON-serialized body', async () => {
      const calls: Array<{ url: string; init?: Parameters<Fetcher>[1] }> = [];
      const fetcher: Fetcher = async (url, init) => {
        calls.push({ url, init });
        return { ok: true, status: 200, json: async () => ({ status: 'ok' }) };
      };
      const client = createApiClient('http://svc', fetcher);

      await client.patch('/menu/items/item-1', { isAvailable: false }, schema);

      expect(calls[0]?.url).toBe('http://svc/menu/items/item-1');
      expect(calls[0]?.init?.method).toBe('PATCH');
      expect(calls[0]?.init?.body).toBe(JSON.stringify({ isAvailable: false }));
    });

    it('throws on a non-2xx response', async () => {
      const client = createApiClient('http://svc', fetcherReturning(404, {}));
      await expect(client.patch('/menu/items/item-1', { isAvailable: false }, schema)).rejects.toBeInstanceOf(
        ApiClientError,
      );
    });
  });
});
