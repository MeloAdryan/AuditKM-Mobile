export type AuditStatus =
  | 'NORMAL'
  | 'ATTENTION'
  | 'DIVERGENCE'
  | 'JUSTIFIED';


export interface RouteAudit {
  id: number;

  trip_id: number;

  driver_username: string;

  vehicle_plate: string;

  route_name: string;

  origin: string;

  destination: string;

  standard_route: number;

  standard_distance_km: string;

  gps_distance_km: string;

  odometer_distance_km:
    | string
    | null;

  difference_km: string;

  difference_percent: string;

  spatial_deviation_percent: string;

  max_deviation_m: string;

  outside_points_count: number;

  total_points_count: number;

  status: AuditStatus;

  justification: string;

  audited_at: string;
}