import { redirect, forbidden } from 'next/navigation';
import { getSession } from './session';

export interface AuthUser {
  userId: number;
  username: string;
  role: string;
}

/**
 * Ensures the user is authenticated.
 * If not authenticated, redirects to /login (or custom path).
 * If authenticated, returns the authenticated session user details.
 */
export async function requireAuth(redirectTo: string = '/login'): Promise<AuthUser> {
  const session = await getSession();

  if (!session.isLoggedIn || !session.userId) {
    redirect(redirectTo);
  }

  return {
    userId: session.userId,
    username: session.username || '',
    role: session.role || 'user',
  };
}

/**
 * Ensures the user is authenticated and has an 'admin' role.
 * If not authenticated, redirects to /login.
 * If authenticated but role is not 'admin', triggers 403 Forbidden.
 * If user is admin, returns the user session details.
 */
export async function requireAdmin(): Promise<AuthUser> {
  const session = await getSession();

  if (!session.isLoggedIn || !session.userId) {
    redirect('/login');
  }

  if (session.role !== 'admin') {
    forbidden();
  }

  return {
    userId: session.userId,
    username: session.username || '',
    role: session.role,
  };
}

/**
 * Retrieves the currently authenticated user from session if present.
 * Does not redirect or throw errors if unauthenticated; returns null instead.
 */
export async function getOptionalUser(): Promise<AuthUser | null> {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.userId) {
      return null;
    }

    return {
      userId: session.userId,
      username: session.username || '',
      role: session.role || 'user',
    };
  } catch {
    return null;
  }
}
