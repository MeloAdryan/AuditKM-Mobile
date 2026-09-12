import api from './api';

import {
  clearTokens,
  saveTokens,
} from './authStorage';

import type { AuthUser } from '../types/auth';

interface LoginResponse {
  access: string;
  refresh: string;
}

export async function login(
  username: string,
  password: string,
) {
  const response = await api.post<LoginResponse>(
    '/auth/login/',
    {
      username,
      password,
    },
  );

  await saveTokens(
    response.data.access,
    response.data.refresh,
  );

  return response.data;
}

export async function getCurrentUser() {
  const response = await api.get<AuthUser>(
    '/auth/me/',
  );

  return response.data;
}

export async function logout() {
  await clearTokens();
}