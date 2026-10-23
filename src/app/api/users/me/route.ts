import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import {
  users,
  ratings,
  reviews,
  reviewVotes,
  reviewReports,
  collections,
  lists,
  listItems,
  follows,
} from '@/lib/db/schema';
import { eq, or, inArray } from 'drizzle-orm';

// GET /api/users/me — return current authenticated user data (excluding passwordHash)
export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        displayName: users.displayName,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .get();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('GET /api/users/me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/users/me — update current user's profile (displayName, bio)
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { displayName, bio } = body;

    if (displayName !== undefined && typeof displayName === 'string') {
      if (displayName.trim().length > 50) {
        return NextResponse.json(
          { error: 'Display name cannot exceed 50 characters' },
          { status: 400 }
        );
      }
    }

    if (bio !== undefined && typeof bio === 'string') {
      if (bio.trim().length > 1000) {
        return NextResponse.json(
          { error: 'Bio cannot exceed 1,000 characters' },
          { status: 400 }
        );
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const updates: Record<string, unknown> = { updatedAt: now };

    if (displayName !== undefined) {
      updates.displayName = typeof displayName === 'string' ? displayName.trim() || null : null;
    }

    if (bio !== undefined) {
      updates.bio = typeof bio === 'string' ? bio.trim() || null : null;
    }

    db.update(users)
      .set(updates)
      .where(eq(users.id, session.userId))
      .run();

    const updatedUser = db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        displayName: users.displayName,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .get();

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('PUT /api/users/me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/users/me — delete user account and clean up dependencies
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.userId;

    // 1. Delete user lists and their items
    const userLists = db
      .select({ id: lists.id })
      .from(lists)
      .where(eq(lists.userId, userId))
      .all();

    if (userLists.length > 0) {
      const listIds = userLists.map((l) => l.id);
      db.delete(listItems).where(inArray(listItems.listId, listIds)).run();
      db.delete(lists).where(eq(lists.userId, userId)).run();
    }

    // 2. Delete reviews, votes, reports
    db.delete(reviewReports).where(eq(reviewReports.userId, userId)).run();
    db.delete(reviewVotes).where(eq(reviewVotes.userId, userId)).run();
    db.delete(reviews).where(eq(reviews.userId, userId)).run();

    // 3. Delete ratings
    db.delete(ratings).where(eq(ratings.userId, userId)).run();

    // 4. Delete collections
    db.delete(collections).where(eq(collections.userId, userId)).run();

    // 5. Delete follows
    db.delete(follows)
      .where(or(eq(follows.followerId, userId), eq(follows.followingId, userId)))
      .run();

    // 6. Delete user
    db.delete(users).where(eq(users.id, userId)).run();

    // 7. Destroy session
    session.destroy();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/users/me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
