import api from './api';

import type {
  StandardRouteWithPoints,
  TripLocationMapPoint,
} from '../types/tripMap';


export async function getStandardRouteWithPoints(
  standardRouteId: number,
) {
  const response =
    await api.get<StandardRouteWithPoints>(
      `/standard-routes/${standardRouteId}/`,
    );

  return response.data;
}


export async function getTripMapLocations(
  tripId: number,
) {
  const response =
    await api.get<TripLocationMapPoint[]>(
      `/trips/${tripId}/locations/`,
    );

  return response.data;
}