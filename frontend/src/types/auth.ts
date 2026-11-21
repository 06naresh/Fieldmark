export type UserRole = 'ADMIN' | 'INSPECTOR';

export interface AuthUser {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
}

export interface CurrentUser extends AuthUser {
  is_active: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}
