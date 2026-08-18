import type { z } from 'zod';

/**
 * Minimal fetch-shaped injection point. Web passes `fetch`; mobile passes its
 * own. Taking it as a parameter rather than importing one is what lets this
 * package stay platform-agnostic.
 */
export type Fetcher = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/**
 * cafe-menu-management T10 — how a caller attaches an `Authorization` header.
 * Either a static token string, or a getter function invoked fresh on every
 * request. The getter form exists specifically so a caller can defer to
 * whatever it reads its token from at call time (e.g. web's
 * `readSessionToken()`, backed by `localStorage`) without this package ever
 * touching that storage itself — this package's own module header forbids
 * DOM access (mobile consumes it too, and would need a different mechanism
 * entirely). `null`/`undefined` (from either form) means "no token" — no
 * `Authorization` header is attached, the request still goes out.
 */
export type TokenProvider = string | (() => string | null | undefined);

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export interface ApiClient {
  get<T extends z.ZodTypeAny>(path: string, schema: T): Promise<z.infer<T>>;
  post<T extends z.ZodTypeAny>(path: string, body: unknown, schema: T): Promise<z.infer<T>>;
  // cafe-menu-management T11 — the first caller needing a partial update
  // (PATCH /menu/items/:id, both the edit form's Save and its immediate
  // availability-toggle call). Same `request()` internals as get/post, just
  // a different HTTP method.
  patch<T extends z.ZodTypeAny>(path: string, body: unknown, schema: T): Promise<z.infer<T>>;
}

/**
 * Every response is parsed through its published contract before it reaches
 * calling code. An endpoint that drifts from its contract fails here, loudly,
 * instead of surfacing as an undefined field three components deep.
 *
 * `token` is optional (cafe-menu-management T10) — omitted entirely, every
 * request carries only `content-type` as before (existing `authService`/
 * `coreService` callers are unaffected). Provided, it's resolved fresh per
 * request (supports both a static string and a getter function) and, if
 * non-empty, attached as `Authorization: Bearer <token>`.
 */
export function createApiClient(baseUrl: string, fetcher: Fetcher, token?: TokenProvider): ApiClient {
  function resolveToken(): string | null | undefined {
    return typeof token === 'function' ? token() : token;
  }

  async function request<T extends z.ZodTypeAny>(
    path: string,
    schema: T,
    init?: { method?: string; body?: unknown },
  ): Promise<z.infer<T>> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    const resolvedToken = resolveToken();
    if (resolvedToken) {
      headers.Authorization = `Bearer ${resolvedToken}`;
    }

    const res = await fetcher(`${baseUrl}${path}`, {
      method: init?.method ?? 'GET',
      headers,
      ...(init?.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    });

    if (!res.ok) {
      throw new ApiClientError(`Request failed: ${path}`, res.status);
    }

    const parsed = schema.safeParse(await res.json());
    if (!parsed.success) {
      throw new ApiClientError(`Response did not match contract: ${path}`, res.status);
    }
    return parsed.data;
  }

  return {
    get: (path, schema) => request(path, schema),
    post: (path, body, schema) => request(path, schema, { method: 'POST', body }),
    patch: (path, body, schema) => request(path, schema, { method: 'PATCH', body }),
  };
}
