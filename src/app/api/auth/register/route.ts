import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email, and password are required' },
        { status: 400 }
      );
    }

    const trimmedUsername = typeof username === 'string' ? username.trim() : '';
    const trimmedEmail = typeof email === 'string' ? email.trim() : '';

    // Validate username: 3-30 chars, /^[a-zA-Z0-9_]+$/
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
    if (!emailRegex.test(trimmedEmail)) {
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

    // Check uniqueness (username and email) using sync better-sqlite3 access
    const existingUser = db.select().from(users).where(eq(users.username, trimmedUsername)).get();
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 400 }
      );
    }

    const existingEmail = db.select().from(users).where(eq(users.email, trimmedEmail)).get();
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email is already registered' },
        { status: 400 }
      );
    }

    // Hash with bcrypt.hashSync(password, 12)
    const passwordHash = bcrypt.hashSync(password, 12);
    const now = Math.floor(Date.now() / 1000);

    // Insert user with role 'user', createdAt: Math.floor(Date.now() / 1000)
    const newUser = db
      .insert(users)
      .values({
        username: trimmedUsername,
        email: trimmedEmail,
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
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
