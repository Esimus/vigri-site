// lib/api.ts
// Unified API client. Cookie-based, no tokens. Ready for /v1 later.

type Empty = Record<string, never>;

type ApiOk<T> = { ok: true } & T;
type ApiFail = { ok: false; error?: string };
export type ApiResponse<T> = ApiOk<T> | ApiFail;

class ApiError extends Error {
  status: number;
  body?: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

function apiBase() {
  return process.env.NEXT_PUBLIC_API_BASE || '';
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function pickErrorMessage(json: unknown): string | null {
  if (!isObject(json)) return null;
  const maybeErr = json.error;
  const maybeMsg = (json as { message?: unknown }).message;
  if (typeof maybeErr === 'string' && maybeErr) return maybeErr;
  if (typeof maybeMsg === 'string' && maybeMsg) return maybeMsg;
  return null;
}

async function buildSignedInit(init: RequestInit) {
  const headers = new Headers(init.headers || {});
  headers.set('X-Client-Time', Date.now().toString());
  headers.set('X-Client-Nonce', Math.random().toString(36).slice(2));
  return { ...init, headers };
}

async function request<T>(path: string, method: Method, body?: unknown): Promise<T> {
  const url = apiBase() + path;
  const init: RequestInit = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };
  const res = await fetch(url, await buildSignedInit(init));
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // non-JSON response
  }
  if (!res.ok) {
    const msg = pickErrorMessage(json) ?? `HTTP ${res.status}`;
    throw new ApiError(msg, res.status, json ?? undefined);
  }
  return json as T;
}

export type Profile = {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  language?: string;
  birthDate?: string; // yyyy-mm-dd
  phone?: string;

  countryResidence?: string; // ISO alpha-2
  countryTax?: string; // ISO alpha-2

  addressStreet?: string;
  addressRegion?: string;
  addressCity?: string;
  addressPostal?: string;

  photo?: string; // dataURL avatar
  country?: string; // legacy
};

class ApiClient {
  me() {
    return request<
      ApiResponse<{
        signedIn: boolean;
        kyc: boolean | 'none' | 'pending' | 'approved';
        lum: unknown;
        user?: { id: string; email: string } | null;
        profile?: Profile;
      }>
    >('/api/me', 'GET');
  }

  setLum(lum: boolean) {
    return request<ApiResponse<Empty>>('/api/me', 'POST', { lum });
  }

  profile = {
    async get() {
      const r = await request<ApiResponse<{ profile?: Profile }>>('/api/me', 'GET');
      if ('ok' in r && r.ok === true) {
        return { ok: true, profile: r.profile ?? {} as Profile } satisfies ApiOk<{ profile: Profile }>;
      }
      return r as ApiFail;
    },
    save(partial: Partial<Profile>) {
      return request<ApiResponse<Empty>>('/api/me', 'POST', { profile: partial });
    },
  };

  kyc = {
    async get() {
      const r = await request<ApiResponse<{ kyc: boolean | 'none' | 'pending' | 'approved' }>>('/api/me', 'GET');
      if (!('ok' in r) || !r.ok) return r as ApiFail;
      const v = r.kyc;
      const normalized: 'none' | 'pending' | 'approved' =
        v === true ? 'approved' : v === false ? 'none' : v;
      return { ok: true, status: normalized } as ApiOk<{ status: 'none' | 'pending' | 'approved' }>;
    },
    start() {
      return request<ApiResponse<Empty>>('/api/me', 'POST', { kyc: 'pending' });
    },
    approve() {
      return request<ApiResponse<Empty>>('/api/me', 'POST', { kyc: 'approved' });
    },
    reset() {
      return request<ApiResponse<Empty>>('/api/me', 'POST', { kyc: 'none' });
    },
  };

  // Other sections unchanged...
  assets = {
    list: () =>
      request<
        ApiResponse<{
          totalEur: number;
          items: Array<{ symbol: string; name: string; amount: number; priceEur: number; valueEur: number }>;
        }>
      >('/api/assets', 'GET'),
    buy: (amount: number) =>
      request<ApiResponse<{ totalEur: number; items: unknown[] }>>('/api/assets', 'POST', { action: 'buy', amount }),
  };

  nft = {
    list: () =>
      request<
        ApiResponse<{
          items: Array<{
            id: string;
            name: string;
            eurPrice: number;
            vigriPrice: number;
            blurb: string;
            kycRequired?: boolean;
            limited?: number;
            vesting?: string | null;
            ownedQty?: number;
            invited?: boolean;
            summaryKeys?: string[];
            minted?: number;
          }>;
        }>
      >('/api/nft', 'GET'),
    buy: (id: string, qty = 1) => request<ApiResponse<{ id: string; qty: number }>>('/api/nft', 'POST', { id, qty }),
    reset: () => request<unknown>('/api/nft/reset', 'POST'),
    invite: (grant: boolean) => request<ApiResponse<{ invited: boolean }>>('/api/nft/ws/invite', 'POST', { grant }),
  };
}

export const api = new ApiClient();
