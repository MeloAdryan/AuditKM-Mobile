import api from './api';

import type {
  DashboardData,
} from '../types/dashboard';


export async function getDashboard() {
  const response =
    await api.get<DashboardData>(
      '/dashboard/',
    );

  return response.data;
}