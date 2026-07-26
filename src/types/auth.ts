// Authentication type definitions
// Designed to connect directly to Supabase Auth in Phase 4
// without any component-level changes

export type UserRole = 'admin' | 'coach' | 'student';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface SignInResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

export interface LoginFormValues {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export interface UseAuthReturn {
  loading: boolean;
  errors: LoginFormErrors;
  handleSignIn: (values: LoginFormValues) => Promise<void>;
}
