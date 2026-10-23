import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lists, listItems, albums, artists } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { eq, and, asc } from 'drizzle-orm';

// GET /api/lists/[id] — get list details with items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const listId = parseInt(id, 10);
    if (isNaN(listId)) {
      return NextResponse.json({ error: 'Invalid list ID' }, { status: 400 });
    }

    const list = db.select().from(lists).where(eq(lists.id, listId)).get();

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    // Check visibility
    if (!list.isPublic) {
      const session = await getSession();
      if (!session.isLoggedIn || session.userId !== list.userId) {
        return NextResponse.json({ error: 'List not found' }, { status: 404 });
      }
    }

    // Get items with album and artist info
    const items = db
      .select({
        id: listItems.id,
        position: listItems.position,
        annotation: listItems.annotation,
        albumId: listItems.albumId,
        albumTitle: albums.title,
        albumSlug: albums.slug,
        albumCover: albums.coverUrl,
        albumType: albums.albumType,
        releaseDate: albums.releaseDate,
        artistName: artists.name,
      })
      .from(listItems)
      .leftJoin(albums, eq(listItems.albumId, albums.id))
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .where(eq(listItems.listId, listId))
      .orderBy(asc(listItems.position))
      .all();

    return NextResponse.json({ list, items });
  } catch (error) {
    console.error('List fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/lists/[id] — update list
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const listId = parseInt(id, 10);

    const list = db.select().from(lists).where(eq(lists.id, listId)).get();
    if (!list || list.userId !== session.userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, isPublic, items } = body;

    const now = Math.floor(Date.now() / 1000);

    // Update list metadata
    const updates: Record<string, unknown> = { updatedAt: now };
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (isPublic !== undefined) updates.isPublic = isPublic ? 1 : 0;

    db.update(lists).set(updates).where(eq(lists.id, listId)).run();

    // Update items if provided
    if (items && Array.isArray(items)) {
      // Remove existing items
      db.delete(listItems).where(eq(listItems.listId, listId)).run();

      // Insert new items
      for (const item of items) {
        db.insert(listItems)
          .values({
            listId,
            albumId: item.albumId,
            position: item.position,
            annotation: item.annotation || null,
          })
          .run();
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('List update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/lists/[id] — delete list
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const listId = parseInt(id, 10);

    const list = db.select().from(lists).where(eq(lists.id, listId)).get();
    if (!list || list.userId !== session.userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Delete items first (cascade should handle this but be explicit)
    db.delete(listItems).where(eq(listItems.listId, listId)).run();
    db.delete(lists).where(eq(lists.id, listId)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('List delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
