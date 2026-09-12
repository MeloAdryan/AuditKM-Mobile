export interface MapCoordinate {
  latitude: number;
  longitude: number;
}


export interface StandardRoutePoint {
  id: number;
  standard_route: number;
  sequence: number;
  latitude: string;
  longitude: string;
  created_at: string;
  updated_at: string;
}


export interface StandardRouteWithPoints {
  id: number;
  name: string;
  origin: string;
  destination: string;

  expected_distance_km: string;

  expected_duration_minutes:
    | number
    | null;

  tolerance_percent: string;

  corridor_tolerance_m: number;

  active: boolean;

  points: StandardRoutePoint[];

  created_at: string;
  updated_at: string;
}


export interface TripLocationMapPoint {
  id: number;
  trip: number;

  latitude: string;
  longitude: string;

  accuracy:
    | number
    | null;

  speed:
    | number
    | null;

  altitude:
    | number
    | null;

  heading:
    | number
    | null;

  recorded_at: string;
  created_at: string;
}