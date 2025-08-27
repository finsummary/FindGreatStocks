import { AuthError } from "@supabase/supabase-js";

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof AuthError && error.status === 401;
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}
