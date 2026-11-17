export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1').replace(/\/$/, '');
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3000';
let refreshInFlight: Promise<boolean> | null = null;
let sessionExpiredDispatched = false;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type SessionTokens = { accessToken: string; refreshToken: string };

function isSessionTokens(value: unknown): value is SessionTokens {
  return value !== null
    && typeof value === 'object'
    && 'accessToken' in value
    && typeof value.accessToken === 'string'
    && 'refreshToken' in value
    && typeof value.refreshToken === 'string';
}

export function getAccessToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('rmh.accessToken');
}

export function saveSession(accessToken: string, refreshToken: string) {
  sessionExpiredDispatched = false;
  window.localStorage.setItem('rmh.accessToken', accessToken);
  window.localStorage.setItem('rmh.refreshToken', refreshToken);
}

export function clearSession() {
  window.localStorage.removeItem('rmh.accessToken');
  window.localStorage.removeItem('rmh.refreshToken');
  window.localStorage.removeItem('rmh.user');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetchWithSession(path, options, headers);

  const body = await response.json().catch(() => null) as ApiEnvelope<T> | { message?: string } | null;
  if (!response.ok) {
    const message = body && 'message' in body
      ? Array.isArray(body.message) ? body.message.join(', ') : body.message
      : 'The request could not be completed.';
    throw new ApiError(message || 'The request could not be completed.', response.status);
  }

  if (body && typeof body === 'object' && 'data' in body) return body.data as T;
  return body as T;
}

export async function uploadMedia<T>(file: File, category: string, visibility = 'Private'): Promise<T> {
  const form = new FormData();
  form.set('file', file);
  form.set('category', category);
  form.set('visibility', visibility);

  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetchWithSession('/uploads', {
    method: 'POST',
    headers,
    body: form,
  }, headers);

  const body = await response.json().catch(() => null) as ApiEnvelope<T> | { message?: string } | null;
  if (!response.ok) {
    const message = body && 'message' in body
      ? Array.isArray(body.message) ? body.message.join(', ') : body.message
      : 'The upload could not be completed.';
    throw new ApiError(message || 'The upload could not be completed.', response.status);
  }

  if (body && typeof body === 'object' && 'data' in body) return body.data as T;
  return body as T;
}

export function persistUser(user: unknown) {
  window.localStorage.setItem('rmh.user', JSON.stringify(user));
}

function isPublicAuthPath(path: string) {
  return [
    '/auth/login',
    '/auth/register',
    '/auth/verify-email',
    '/auth/resend-verification',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/refresh',
  ].some((authPath) => path.startsWith(authPath));
}

function expireSession() {
  clearSession();
  if (sessionExpiredDispatched) return;
  sessionExpiredDispatched = true;
  if (window.location.pathname.startsWith('/app')) {
    window.location.replace('/login');
  }
}

async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = window.localStorage.getItem('rmh.refreshToken');
    if (!refreshToken) {
      expireSession();
      return false;
    }

    let response: Response;
    try {
      response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
      });
    } catch {
      throw new ApiError('Could not reach the API to refresh your session. Check your connection and try again.', 0);
    }

    const body: unknown = await response.json().catch(() => null);
    const tokens = body && typeof body === 'object' && 'data' in body ? body.data : body;
    if (!response.ok || !isSessionTokens(tokens)) {
      expireSession();
      return false;
    }

    saveSession(tokens.accessToken, tokens.refreshToken);
    return true;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

async function fetchWithSession(path: string, options: RequestInit, headers: Headers) {
  const send = () => fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store',
  });

  let response: Response;
  try {
    response = await send();
  } catch {
    throw new ApiError('Could not reach the API. Check the backend URL and try again.', 0);
  }

  if (response.status === 401 && getAccessToken() && !isPublicAuthPath(path)) {
    if (await refreshAccessToken()) {
      headers.set('Authorization', `Bearer ${getAccessToken()}`);
      try {
        response = await send();
      } catch {
        throw new ApiError('Could not reach the API. Check the backend URL and try again.', 0);
      }
    } else {
      throw new ApiError('Your session has expired. Please sign in again.', 401);
    }
  }

  return response;
}
