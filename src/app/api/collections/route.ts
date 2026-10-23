import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { collections, albums, artists } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { eq, and } from 'drizzle-orm';

// POST /api/collections — add album to collection
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { albumId, status } = body;

    if (!albumId || typeof albumId !== 'number') {
      return NextResponse.json({ error: 'Invalid album ID' }, { status: 400 });
    }

    if (!['owned', 'wishlist', 'listened'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Check for existing entry
    const existing = db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.userId, session.userId),
          eq(collections.albumId, albumId)
        )
      )
      .get();

    const now = Math.floor(Date.now() / 1000);

    if (existing) {
      // Update status
      db.update(collections)
        .set({ status })
        .where(eq(collections.id, existing.id))
        .run();
    } else {
      db.insert(collections)
        .values({
          userId: session.userId,
          albumId,
          status,
          createdAt: now,
        })
        .run();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Collection error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/collections — remove from collection
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { albumId } = body;

    db.delete(collections)
      .where(
        and(
          eq(collections.userId, session.userId),
          eq(collections.albumId, albumId)
        )
      )
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Collection delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/collections — get user's collection
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 24;
    const offset = (page - 1) * limit;

    let query = db
      .select({
        id: collections.id,
        albumId: collections.albumId,
        status: collections.status,
        createdAt: collections.createdAt,
        albumTitle: albums.title,
        albumSlug: albums.slug,
        albumCover: albums.coverUrl,
        albumType: albums.albumType,
        releaseDate: albums.releaseDate,
        artistName: artists.name,
      })
      .from(collections)
      .leftJoin(albums, eq(collections.albumId, albums.id))
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .where(
        status
          ? and(eq(collections.userId, session.userId), eq(collections.status, status as 'owned' | 'wishlist' | 'listened'))
          : eq(collections.userId, session.userId)
      )
      .limit(limit)
      .offset(offset)
      .all();

    return NextResponse.json({ items: query });
  } catch (error) {
    console.error('Collection fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
