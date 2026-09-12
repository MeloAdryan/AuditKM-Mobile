import api from './api';

import type {
  CurrentLocation,
} from './location';

export interface TripLocationResponse {
  id: number;
  trip: number;

  latitude: string;
  longitude: string;

  accuracy: number | null;
  speed: number | null;
  altitude: number | null;
  heading: number | null;

  recorded_at: string;
  created_at: string;
}

export async function sendTripLocation(
  tripId: number,
  location: CurrentLocation,
) {
  const response =
    await api.post<TripLocationResponse>(
      `/trips/${tripId}/locations/`,
      location,
    );

  return response.data;
}

export async function getTripLocations(
  tripId: number,
) {
  const response =
    await api.get<TripLocationResponse[]>(
      `/trips/${tripId}/locations/`,
    );

  return response.data;
}