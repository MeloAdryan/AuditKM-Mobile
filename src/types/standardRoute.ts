export interface StandardRoute {
  id: number;
  name: string;
  origin: string;
  destination: string;
  expected_distance_km: string;
  expected_duration_minutes: number | null;
  tolerance_percent: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}