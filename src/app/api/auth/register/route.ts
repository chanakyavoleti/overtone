import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { checkRateLimit } from '@/lib/auth/rateLimit';
import bcrypt from 'bcryptjs';
import { eq, or } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const rateLimit = checkRateLimit(`register:${ip}`, {
      maxRequests: 6,
      windowMs: 60_000,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: `Too many registration attempts. Please wait ${rateLimit.resetInSeconds} seconds before trying again.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { username, email, password } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email, and password are required' },
        { status: 400 }
      );
    }

    const trimmedUsername = typeof username === 'string' ? username.trim() : '';
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    // Validate username: 3-30 chars, letters, numbers, underscores
    if (
      trimmedUsername.length < 3 ||
      trimmedUsername.length > 30 ||
      !/^[a-zA-Z0-9_]+$/.test(trimmedUsername)
    ) {
      return NextResponse.json(
        { error: 'Username must be between 3 and 30 characters and contain only letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Validate password: min 8
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check uniqueness (username and email)
    const existing = db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
      })
      .from(users)
      .where(
        or(
          eq(users.username, trimmedUsername),
          eq(users.email, normalizedEmail)
        )
      )
      .get();

    if (existing) {
      if (existing.username.toLowerCase() === trimmedUsername.toLowerCase()) {
        return NextResponse.json(
          { error: 'Username is already taken' },
          { status: 400 }
        );
      }
      if (existing.email.toLowerCase() === normalizedEmail) {
        return NextResponse.json(
          { error: 'Email is already registered' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'An account with these details already exists' },
        { status: 400 }
      );
    }

    // Asynchronously hash password with bcrypt (12 rounds)
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const now = Math.floor(Date.now() / 1000);

    const newUser = db
      .insert(users)
      .values({
        username: trimmedUsername,
        email: normalizedEmail,
        passwordHash,
        displayName: trimmedUsername,
        role: 'user',
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: users.id,
        username: users.username,
        role: users.role,
      })
      .get();

    if (!newUser) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    // Create session
    const session = await getSession();
    session.userId = newUser.id;
    session.username = newUser.username;
    session.role = newUser.role;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
