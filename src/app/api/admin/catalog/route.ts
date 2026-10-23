import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { artists, albums, tracks } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import slugify from 'slugify';

function makeSlug(text: string): string {
  return slugify(text, { lower: true, strict: true, trim: true }) || 'entry';
}

// GET /api/admin/catalog — return artists and albums for form select pickers
export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const artistsList = db
      .select({ id: artists.id, name: artists.name, slug: artists.slug })
      .from(artists)
      .orderBy(asc(artists.name))
      .all();

    const albumsList = db
      .select({ id: albums.id, title: albums.title, slug: albums.slug, artistId: albums.artistId })
      .from(albums)
      .orderBy(asc(albums.title))
      .all();

    return NextResponse.json({ artists: artistsList, albums: albumsList });
  } catch (error) {
    console.error('GET /api/admin/catalog error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/catalog — create artist, album, or track
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Invalid payload: "type" and "data" required' },
        { status: 400 }
      );
    }

    const now = Math.floor(Date.now() / 1000);

    // 1. Create Artist
    if (type === 'artist') {
      const { name, bio, imageUrl, country, formedYear, disbandedYear } = data;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Artist name is required' }, { status: 400 });
      }

      let slug = makeSlug(name);
      // Ensure unique slug
      const existing = db.select({ id: artists.id }).from(artists).where(eq(artists.slug, slug)).get();
      if (existing) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }

      const result = db
        .insert(artists)
        .values({
          name: name.trim(),
          slug,
          bio: bio?.trim() || null,
          imageUrl: imageUrl?.trim() || null,
          country: country?.trim() || null,
          formedYear: formedYear ? parseInt(formedYear, 10) : null,
          disbandedYear: disbandedYear ? parseInt(disbandedYear, 10) : null,
          createdAt: now,
        })
        .run();

      return NextResponse.json({
        success: true,
        type: 'artist',
        id: Number(result.lastInsertRowid),
        slug,
      });
    }

    // 2. Create Album
    if (type === 'album') {
      const {
        title,
        artistId,
        releaseDate,
        albumType,
        coverUrl,
        label,
        runtimeSeconds,
        trackCount,
      } = data;

      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json({ error: 'Album title is required' }, { status: 400 });
      }

      let slug = makeSlug(title);
      const existing = db.select({ id: albums.id }).from(albums).where(eq(albums.slug, slug)).get();
      if (existing) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }

      const validAlbumTypes = ['album', 'ep', 'single', 'compilation'] as const;
      const resolvedType = validAlbumTypes.includes(albumType) ? albumType : 'album';

      const result = db
        .insert(albums)
        .values({
          title: title.trim(),
          slug,
          artistId: artistId ? parseInt(artistId, 10) : null,
          releaseDate: releaseDate?.trim() || null,
          albumType: resolvedType,
          coverUrl: coverUrl?.trim() || null,
          label: label?.trim() || null,
          runtimeSeconds: runtimeSeconds ? parseInt(runtimeSeconds, 10) : null,
          trackCount: trackCount ? parseInt(trackCount, 10) : 0,
          createdAt: now,
        })
        .run();

      return NextResponse.json({
        success: true,
        type: 'album',
        id: Number(result.lastInsertRowid),
        slug,
      });
    }

    // 3. Create Track
    if (type === 'track') {
      const {
        title,
        albumId,
        artistId,
        trackNumber,
        discNumber,
        durationSeconds,
        explicit,
      } = data;

      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json({ error: 'Track title is required' }, { status: 400 });
      }

      const slug = makeSlug(title);

      const result = db
        .insert(tracks)
        .values({
          title: title.trim(),
          slug,
          albumId: albumId ? parseInt(albumId, 10) : null,
          artistId: artistId ? parseInt(artistId, 10) : null,
          trackNumber: trackNumber ? parseInt(trackNumber, 10) : null,
          discNumber: discNumber ? parseInt(discNumber, 10) : 1,
          durationSeconds: durationSeconds ? parseInt(durationSeconds, 10) : null,
          explicit: explicit ? 1 : 0,
          createdAt: now,
        })
        .run();

      return NextResponse.json({
        success: true,
        type: 'track',
        id: Number(result.lastInsertRowid),
        slug,
      });
    }

    return NextResponse.json(
      { error: `Unknown type "${type}". Allowed: "artist", "album", "track"` },
      { status: 400 }
    );
  } catch (error) {
    console.error('POST /api/admin/catalog error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
