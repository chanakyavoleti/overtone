import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lists, listItems, albums, artists, users } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { eq, and, desc, asc, count } from 'drizzle-orm';

// POST /api/lists — create a new list
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, isPublic } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0 || title.length > 200) {
      return NextResponse.json({ error: 'Title is required (max 200 characters)' }, { status: 400 });
    }

    if (description && description.length > 2000) {
      return NextResponse.json({ error: 'Description must be under 2000 characters' }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);

    const result = db
      .insert(lists)
      .values({
        userId: session.userId,
        title: title.trim(),
        description: description?.trim() || null,
        isPublic: isPublic === false ? 0 : 1,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return NextResponse.json({
      success: true,
      listId: Number(result.lastInsertRowid),
    });
  } catch (error) {
    console.error('List create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/lists — get public lists or user's lists
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const userId = searchParams.get('userId');
    const limit = 20;
    const offset = (page - 1) * limit;

    let results;

    if (userId) {
      // User's own lists (check auth)
      const session = await getSession();
      const uid = parseInt(userId, 10);

      if (session.userId === uid) {
        // Show all lists (including private)
        results = db
          .select()
          .from(lists)
          .where(eq(lists.userId, uid))
          .orderBy(desc(lists.updatedAt))
          .limit(limit)
          .offset(offset)
          .all();
      } else {
        // Show only public
        results = db
          .select()
          .from(lists)
          .where(and(eq(lists.userId, uid), eq(lists.isPublic, 1)))
          .orderBy(desc(lists.updatedAt))
          .limit(limit)
          .offset(offset)
          .all();
      }
    } else {
      // Public lists
      results = db
        .select({
          id: lists.id,
          title: lists.title,
          description: lists.description,
          isPublic: lists.isPublic,
          coverUrl: lists.coverUrl,
          createdAt: lists.createdAt,
          updatedAt: lists.updatedAt,
          userId: lists.userId,
          username: users.username,
          displayName: users.displayName,
        })
        .from(lists)
        .leftJoin(users, eq(lists.userId, users.id))
        .where(eq(lists.isPublic, 1))
        .orderBy(desc(lists.updatedAt))
        .limit(limit)
        .offset(offset)
        .all();
    }

    return NextResponse.json({ lists: results });
  } catch (error) {
    console.error('Lists fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
