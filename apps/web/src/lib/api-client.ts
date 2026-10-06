export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  skipRefresh?: boolean;
  skipAuth?: boolean;
}

// Armazenamento em memória do Access Token (estritamente fora do localStorage/sessionStorage)
let memoryAccessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  memoryAccessToken = token;
};

export const getAccessToken = (): string | null => {
  return memoryAccessToken;
};

// Interceptor para renovação silenciosa de tokens
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'x-requested-with': 'XMLHttpRequest',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        setAccessToken(null);
        return null;
      }

      const data = await response.json();
      if (data?.token || data?.accessToken) {
        const token = data.token || data.accessToken;
        setAccessToken(token);
        return token;
      }
      return null;
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers: customHeaders, skipRefresh, skipAuth, ...restOptions } = options;

  let url = endpoint.startsWith('http') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-requested-with': 'XMLHttpRequest',
    ...(customHeaders as Record<string, string>),
  };

  const currentToken = getAccessToken();
  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }

  let response = await fetch(url, {
    ...restOptions,
    headers,
    credentials: 'include',
  });

  // Se o token de acesso expirou (401) e tínhamos um token em memória, tenta refresh silencioso
  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, {
        ...restOptions,
        headers,
        credentials: 'include',
      });
    }
  }

  if (response.status === 204) {
    return null as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error: any = new Error(data?.message || 'Ocorreu um erro na requisição.');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data as T;
}
