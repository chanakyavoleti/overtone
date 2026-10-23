import { NextRequest, NextResponse } from 'next/server';
import { connection } from 'next/server';
import { db } from '@/lib/db';
import { albums, artists, tracks, users } from '@/lib/db/schema';
import { like, or, eq } from 'drizzle-orm';
import { searchArtistsUnified } from '@/lib/metadata/metadataManager';

// GET /api/search?q=...&type=all&page=1
export async function GET(request: NextRequest) {
  await connection();
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const type = searchParams.get('type') || 'all';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 20;
    const offset = (page - 1) * limit;

    if (!query || query.length < 1) {
      return NextResponse.json({ error: 'Search query required' }, { status: 400 });
    }

    const pattern = `%${query}%`;

    // 1. Unified Artist Search (local DB + Indian/International aliases + iTunes IN/Deezer fallback)
    let artistsResult: any[] = [];
    let artistsTotal = 0;

    if (type === 'all' || type === 'artists') {
      const searchRes = await searchArtistsUnified(query, {
        limit: type === 'all' ? 6 : limit,
        offset: type === 'all' ? 0 : offset,
        includeExternal: true,
      });
      artistsResult = searchRes.artists.map(a => ({
        id: a.id,
        name: a.name,
        slug: a.slug,
        imageUrl: a.imageUrl,
        country: a.country,
      }));
      artistsTotal = searchRes.total;
    }

    // 2. Albums Search
    let localAlbums: any[] = [];
    if (type === 'all' || type === 'albums') {
      localAlbums = db
        .select({
          id: albums.id,
          title: albums.title,
          slug: albums.slug,
          coverUrl: albums.coverUrl,
          releaseDate: albums.releaseDate,
          albumType: albums.albumType,
          artistId: albums.artistId,
          artistName: artists.name,
        })
        .from(albums)
        .leftJoin(artists, eq(albums.artistId, artists.id))
        .where(or(like(albums.title, pattern), like(artists.name, pattern)))
        .limit(type === 'all' ? 6 : limit)
        .offset(type === 'all' ? 0 : offset)
        .all();
    }

    // 3. Tracks Search
    let localTracks: any[] = [];
    if (type === 'all' || type === 'tracks') {
      localTracks = db
        .select({
          id: tracks.id,
          title: tracks.title,
          slug: tracks.slug,
          albumId: tracks.albumId,
          artistId: tracks.artistId,
          artistName: artists.name,
          albumTitle: albums.title,
          albumSlug: albums.slug,
        })
        .from(tracks)
        .leftJoin(artists, eq(tracks.artistId, artists.id))
        .leftJoin(albums, eq(tracks.albumId, albums.id))
        .where(or(like(tracks.title, pattern), like(artists.name, pattern)))
        .limit(type === 'all' ? 6 : limit)
        .offset(type === 'all' ? 0 : offset)
        .all();
    }

    // 4. Users Search
    let localUsers: any[] = [];
    if (type === 'all' || type === 'users') {
      localUsers = db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(or(like(users.username, pattern), like(users.displayName, pattern)))
        .limit(type === 'all' ? 6 : limit)
        .offset(type === 'all' ? 0 : offset)
        .all();
    }

    return NextResponse.json({
      results: {
        albums: localAlbums,
        artists: artistsResult,
        tracks: localTracks,
        users: localUsers,
      },
      counts: {
        artists: artistsTotal,
        albums: localAlbums.length,
        tracks: localTracks.length,
        users: localUsers.length,
      },
      query,
      page,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
