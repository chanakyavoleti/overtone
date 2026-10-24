import { NextRequest, NextResponse } from 'next/server';
import { connection } from 'next/server';
import { db } from '@/lib/db';
import { albums, artists, tracks, users } from '@/lib/db/schema';
import { like, or, eq, and, sql } from 'drizzle-orm';
import { searchArtistsUnified } from '@/lib/metadata/metadataManager';
import { searchSpotifyMulti } from '@/lib/metadata/providers/spotify';

// GET /api/search?q=...&type=all|artists|albums|soundtracks|eps|tracks|users&page=1
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

    // 1. Artists Search
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
        avgRating: a.avgRating,
      }));
      artistsTotal = searchRes.total;
    }

    // 2. Studio Albums Search
    let localAlbums: any[] = [];
    if (type === 'all' || type === 'albums') {
      const conditions = [or(like(albums.title, pattern), like(artists.name, pattern))];
      if (type === 'albums') {
        conditions.push(eq(albums.albumType, 'album'));
      }

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
          artistSlug: artists.slug,
        })
        .from(albums)
        .leftJoin(artists, eq(albums.artistId, artists.id))
        .where(and(...conditions))
        .limit(type === 'all' ? 6 : limit)
        .offset(type === 'all' ? 0 : offset)
        .all();
    }

    // 3. Soundtracks Search
    let localSoundtracks: any[] = [];
    if (type === 'all' || type === 'soundtracks') {
      localSoundtracks = db
        .select({
          id: albums.id,
          title: albums.title,
          slug: albums.slug,
          coverUrl: albums.coverUrl,
          releaseDate: albums.releaseDate,
          albumType: albums.albumType,
          artistId: albums.artistId,
          artistName: artists.name,
          artistSlug: artists.slug,
        })
        .from(albums)
        .leftJoin(artists, eq(albums.artistId, artists.id))
        .where(
          and(
            eq(albums.albumType, 'soundtrack'),
            or(like(albums.title, pattern), like(artists.name, pattern))
          )
        )
        .limit(type === 'all' ? 6 : limit)
        .offset(type === 'all' ? 0 : offset)
        .all();
    }

    // 4. EPs and Singles Search
    let localEps: any[] = [];
    if (type === 'all' || type === 'eps') {
      localEps = db
        .select({
          id: albums.id,
          title: albums.title,
          slug: albums.slug,
          coverUrl: albums.coverUrl,
          releaseDate: albums.releaseDate,
          albumType: albums.albumType,
          artistId: albums.artistId,
          artistName: artists.name,
          artistSlug: artists.slug,
        })
        .from(albums)
        .leftJoin(artists, eq(albums.artistId, artists.id))
        .where(
          and(
            or(eq(albums.albumType, 'ep'), eq(albums.albumType, 'single')),
            or(like(albums.title, pattern), like(artists.name, pattern))
          )
        )
        .limit(type === 'all' ? 6 : limit)
        .offset(type === 'all' ? 0 : offset)
        .all();
    }

    // 5. Tracks Search
    let localTracks: any[] = [];
    if (type === 'all' || type === 'tracks') {
      localTracks = db
        .select({
          id: tracks.id,
          title: tracks.title,
          slug: tracks.slug,
          durationSeconds: tracks.durationSeconds,
          albumId: tracks.albumId,
          artistId: tracks.artistId,
          artistName: artists.name,
          albumTitle: albums.title,
          albumSlug: albums.slug,
          coverUrl: albums.coverUrl,
        })
        .from(tracks)
        .leftJoin(artists, eq(tracks.artistId, artists.id))
        .leftJoin(albums, eq(tracks.albumId, albums.id))
        .where(or(like(tracks.title, pattern), like(artists.name, pattern)))
        .limit(type === 'all' ? 6 : limit)
        .offset(type === 'all' ? 0 : offset)
        .all();
    }

    // 6. Users Search
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

    // 7. Spotify multi-entity enrichment if local results are sparse
    const totalLocalCount =
      artistsResult.length + localAlbums.length + localSoundtracks.length + localEps.length + localTracks.length;

    if (totalLocalCount < 4 && query.length >= 3) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Search external timeout')), 2000)
        );
        const external = await Promise.race([searchSpotifyMulti(query, 6), timeoutPromise]);

        if (type === 'all' || type === 'albums' || type === 'soundtracks' || type === 'eps') {
          for (const ea of external.albums) {
            const item = {
              id: `spotify-${ea.providerId || ea.slug}`,
              title: ea.title,
              slug: ea.slug,
              coverUrl: ea.coverUrl,
              releaseDate: ea.releaseDate,
              albumType: ea.albumType,
              artistId: 0,
              artistName: ea.artistName,
              artistSlug: '',
            };

            if (ea.albumType === 'soundtrack' && (type === 'all' || type === 'soundtracks')) {
              if (!localSoundtracks.some(a => a.title.toLowerCase() === ea.title.toLowerCase())) {
                localSoundtracks.push(item);
              }
            } else if ((ea.albumType === 'ep' || ea.albumType === 'single') && (type === 'all' || type === 'eps')) {
              if (!localEps.some(a => a.title.toLowerCase() === ea.title.toLowerCase())) {
                localEps.push(item);
              }
            } else if (type === 'all' || type === 'albums') {
              if (!localAlbums.some(a => a.title.toLowerCase() === ea.title.toLowerCase())) {
                localAlbums.push(item);
              }
            }
          }
        }

        if (type === 'all' || type === 'tracks') {
          for (const et of external.tracks) {
            if (!localTracks.some(t => t.title.toLowerCase() === et.title.toLowerCase())) {
              localTracks.push({
                id: `spotify-${et.providerId || et.slug}`,
                title: et.title,
                slug: et.slug,
                durationSeconds: et.durationSeconds,
                albumId: 0,
                artistId: 0,
                artistName: et.artistName,
                albumTitle: et.albumTitle,
                albumSlug: et.albumSlug,
                coverUrl: et.coverUrl,
              });
            }
          }
        }
      } catch {
        // Ignore external timeout/quota
      }
    }

    return NextResponse.json({
      results: {
        artists: artistsResult,
        albums: localAlbums,
        soundtracks: localSoundtracks,
        eps: localEps,
        tracks: localTracks,
        users: localUsers,
      },
      counts: {
        artists: artistsTotal || artistsResult.length,
        albums: localAlbums.length,
        soundtracks: localSoundtracks.length,
        eps: localEps.length,
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
