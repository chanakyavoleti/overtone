'use server';

import db from '@/lib/db';
import * as schema from '@/lib/db/schema';
import session, { getSession } from './session';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { eq, or } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { registerSchema, loginSchema } from '@/lib/validations';

export type AuthResponse =
  | { success: true; error?: never }
  | { success?: never; error: string };

export interface SafeUser {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  role: 'user' | 'moderator' | 'admin';
  createdAt: number | null;
  updatedAt: number | null;
}

/**
 * Registers a new user with username, email, and password.
 * Validates input, checks uniqueness, hashes password with bcrypt (12 rounds),
 * inserts into database, establishes an encrypted session, and returns result.
 */
export async function registerUser(
  formData: FormData | { [key: string]: unknown }
): Promise<AuthResponse> {
  try {
    const rawUsername = formData instanceof FormData ? formData.get('username') : formData.username;
    const rawEmail = formData instanceof FormData ? formData.get('email') : formData.email;
    const rawPassword = formData instanceof FormData ? formData.get('password') : formData.password;

    const validationResult = registerSchema.safeParse({
      username: typeof rawUsername === 'string' ? rawUsername.trim() : rawUsername,
      email: typeof rawEmail === 'string' ? rawEmail.trim() : rawEmail,
      password: rawPassword,
    });

    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues[0]?.message || 'Invalid registration details';
      return { error: errorMessage };
    }

    const { username, email, password } = validationResult.data;

    // Check uniqueness of username and email
    const existingUsers = await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
      })
      .from(schema.users)
      .where(
        or(
          eq(schema.users.username, username),
          eq(schema.users.email, email)
        )
      )
      .limit(1);

    if (existingUsers.length > 0) {
      const existing = existingUsers[0];
      if (existing.username.toLowerCase() === username.toLowerCase()) {
        return { error: 'Username is already taken' };
      }
      if (existing.email.toLowerCase() === email.toLowerCase()) {
        return { error: 'Email is already registered' };
      }
      return { error: 'User already exists' };
    }

    // Hash password with bcrypt (12 rounds)
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const now = Date.now();
    const insertedUsers = await db
      .insert(schema.users)
      .values({
        username,
        email,
        passwordHash,
        displayName: username,
        role: 'user',
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: schema.users.id,
        username: schema.users.username,
        role: schema.users.role,
      });

    const user = insertedUsers[0];
    if (!user) {
      return { error: 'Failed to create user account' };
    }

    // Create session
    const currentSession = await getSession();
    currentSession.userId = user.id;
    currentSession.username = user.username;
    currentSession.role = user.role;
    currentSession.isLoggedIn = true;
    await currentSession.save();

    return { success: true };
  } catch (error) {
    console.error('registerUser error:', error);
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      if (error.message.includes('username')) {
        return { error: 'Username is already taken' };
      }
      if (error.message.includes('email')) {
        return { error: 'Email is already registered' };
      }
      return { error: 'User already exists' };
    }
    return { error: 'Failed to create account. Please try again.' };
  }
}

/**
 * Authenticates a user by email and password.
 * Compares bcrypt hash, establishes an encrypted session, and returns result.
 */
export async function loginUser(
  formData: FormData | { [key: string]: unknown }
): Promise<AuthResponse> {
  try {
    const rawEmail = formData instanceof FormData ? formData.get('email') : formData.email;
    const rawPassword = formData instanceof FormData ? formData.get('password') : formData.password;

    const validationResult = loginSchema.safeParse({
      email: typeof rawEmail === 'string' ? rawEmail.trim() : rawEmail,
      password: rawPassword,
    });

    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues[0]?.message || 'Invalid email or password';
      return { error: errorMessage };
    }

    const { email, password } = validationResult.data;

    // Find user by email
    const users = await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        passwordHash: schema.users.passwordHash,
        role: schema.users.role,
      })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (users.length === 0) {
      return { error: 'Invalid email or password' };
    }

    const user = users[0];

    // Compare password hash
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return { error: 'Invalid email or password' };
    }

    // Create session
    const currentSession = await getSession();
    currentSession.userId = user.id;
    currentSession.username = user.username;
    currentSession.role = user.role;
    currentSession.isLoggedIn = true;
    await currentSession.save();

    return { success: true };
  } catch (error) {
    console.error('loginUser error:', error);
    return { error: 'Failed to sign in. Please try again.' };
  }
}

/**
 * Destroys the current session and redirects to the home page.
 */
export async function logoutUser(): Promise<void> {
  const currentSession = await getSession();
  currentSession.destroy();
  redirect('/');
}

/**
 * Reads the session and returns the current user data (without password hash) or null.
 */
export async function getCurrentUser(): Promise<SafeUser | null> {
  try {
    const currentSession = await getSession();
    if (!currentSession.isLoggedIn || !currentSession.userId) {
      return null;
    }

    const users = await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        displayName: schema.users.displayName,
        bio: schema.users.bio,
        avatarUrl: schema.users.avatarUrl,
        role: schema.users.role,
        createdAt: schema.users.createdAt,
        updatedAt: schema.users.updatedAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, currentSession.userId))
      .limit(1);

    if (users.length === 0) {
      return null;
    }

    return users[0];
  } catch (error) {
    console.error('getCurrentUser error:', error);
    return null;
  }
}
