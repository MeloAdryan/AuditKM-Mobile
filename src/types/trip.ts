export type TripStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Trip {
  id: number;

  driver: number;
  driver_username: string;

  vehicle: number;
  vehicle_plate: string;

  origin: string;
  destination: string;

  start_km: number | null;
  end_km: number | null;

  started_at: string | null;
  ended_at: string | null;

  status: TripStatus;

  notes: string;

  traveled_km: number | null;

  created_at: string;
  updated_at: string;
}