import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';

import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from './authStorage';


export const API_BASE_URL =
  'https://auditkm-backend.onrender.com/api';


const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,

  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});


/*
 * Cliente separado para refresh.
 *
 * Isso evita que a própria chamada de refresh
 * passe pelo interceptor do api e crie loop.
 */
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,

  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});


interface RefreshResponse {
  access: string;
  refresh?: string;
}


interface RetryConfig
  extends InternalAxiosRequestConfig {
  _retry?: boolean;
}


/*
 * Evita vários refresh simultâneos
 * quando diversas chamadas retornam 401
 * ao mesmo tempo.
 */
let refreshPromise:
  Promise<string> | null = null;


async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken =
      await getRefreshToken();

    if (!refreshToken) {
      throw new Error(
        'Refresh token não encontrado.',
      );
    }

    const response =
      await refreshClient.post<RefreshResponse>(
        '/auth/refresh/',
        {
          refresh: refreshToken,
        },
      );

    const newAccessToken =
      response.data.access;

    const newRefreshToken =
      response.data.refresh ??
      refreshToken;

    await saveTokens(
      newAccessToken,
      newRefreshToken,
    );

    return newAccessToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}


/*
 * Antes de cada requisição:
 * adiciona o access token automaticamente.
 */
api.interceptors.request.use(
  async (
    config: InternalAxiosRequestConfig,
  ) => {
    const accessToken =
      await getAccessToken();

    if (accessToken) {
      config.headers.Authorization =
        `Bearer ${accessToken}`;
    }

    return config;
  },
);


/*
 * Se o access token expirar:
 *
 * 401
 * ↓
 * tenta refresh
 * ↓
 * salva token novo
 * ↓
 * repete a requisição original
 */
api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest =
      error.config as RetryConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    /*
     * Não tenta refresh quando a própria
     * chamada de login retorna 401.
     */
    if (
      originalRequest.url?.includes(
        '/auth/login/',
      )
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const newAccessToken =
        await refreshAccessToken();

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      return api(originalRequest);

    } catch (refreshError) {
      await clearTokens();

      return Promise.reject(
        refreshError,
      );
    }
  },
);


export default api;