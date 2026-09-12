import api from './api';

import type {
  StandardRoute,
} from '../types/standardRoute';


export async function getStandardRoutes() {
  const response =
    await api.get<StandardRoute[]>(
      '/standard-routes/',
    );

  return response.data;
}