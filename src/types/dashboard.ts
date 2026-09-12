import type {
  RouteAudit,
} from './audit';


export interface DashboardData {
  audited_km: number | string;

  trips: number;

  divergences: number;

  regularity_percent:
    number | string;

  recent_audits: RouteAudit[];
}
