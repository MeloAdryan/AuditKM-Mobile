export interface UserRole {
  id: number;
  name: string;
}

export interface AuthUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole | null;
  is_staff: boolean;
  is_superuser: boolean;
}