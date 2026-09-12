import api from './api';

import type {
  RouteAudit,
} from '../types/audit';


export async function getTripAudit(
  tripId: number,
) {
  const response =
    await api.get<RouteAudit>(
      `/trips/${tripId}/audit/`,
    );

  return response.data;
}


export async function generateTripAudit(
  tripId: number,
) {
  const response =
    await api.post<RouteAudit>(
      `/trips/${tripId}/audit/`,
    );

  return response.data;
}