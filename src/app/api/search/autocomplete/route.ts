import { NextRequest, NextResponse } from 'next/server';
import { connection } from 'next/server';
import { db, sql } from '@/lib/db';
import { albums, artists, tracks } from '@/lib/db/schema';
import { like, or, eq } from 'drizzle-orm';
import {
  normalizeSearchQuery,
  expandQueryAliases,
  calculateArtistMatchScore,
} from '@/lib/metadata/normalization';
import { searchSpotifyMulti } from '@/lib/metadata/providers/spotify';

export interface AutocompleteSuggestion {
  id: number | string;
  type: 'artist' | 'album' | 'soundtrack' | 'ep' | 'single' | 'track';
  title: string;
  subtitle?: string;
  slug: string;
  url: string;
  imageUrl?: string | null;
  badge?: string;
  matchScore: number;
}

export async function GET(request: NextRequest) {
  await connection();
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';

    if (query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const normQ = normalizeSearchQuery(query);
    const pattern = `%${query}%`;
    const aliasVariations = expandQueryAliases(query);

    const suggestions: AutocompleteSuggestion[] = [];

    // ------------------------------------------------------------------------
    // 1. Match Local Artists (with Alias Recognition)
    // ------------------------------------------------------------------------
    const localArtists = db.all(sql`
      SELECT id, name, slug, imageUrl, country, aliases
      FROM artists
    `) as Array<{
      id: number;
      name: string;
      slug: string;
      imageUrl: string | null;
      country: string | null;
      aliases: string | null;
    }>;

    for (const a of localArtists) {
      let parsedAliases: string[] = [];
      if (a.aliases) {
        try {
          parsedAliases = JSON.parse(a.aliases);
        } catch {
          // ignore
        }
      }

      const score = calculateArtistMatchScore(query, a.name, parsedAliases);
      if (score >= 60) {
        let matchedAlias: string | undefined;
        if (score >= 90 && normalizeSearchQuery(a.name) !== normQ) {
          matchedAlias = parsedAliases.find(al => normalizeSearchQuery(al) === normQ) || undefined;
          if (!matchedAlias && aliasVariations.length > 1) {
            matchedAlias = aliasVariations.find(v => normalizeSearchQuery(v) === normQ);
          }
        }

        suggestions.push({
          id: a.id,
          type: 'artist',
          title: a.name,
          subtitle: matchedAlias ? `Alias: ${matchedAlias}` : a.country || 'Artist',
          slug: a.slug,
          url: `/artists/${a.slug}`,
          imageUrl: a.imageUrl,
          badge: 'Artist',
          matchScore: score + 10, // Slight priority boost for exact artist matches
        });
      }
    }

    // ------------------------------------------------------------------------
    // 2. Match Local Albums, Soundtracks, EPs & Singles
    // ------------------------------------------------------------------------
    const localAlbums = db
      .select({
        id: albums.id,
        title: albums.title,
        slug: albums.slug,
        coverUrl: albums.coverUrl,
        albumType: albums.albumType,
        releaseDate: albums.releaseDate,
        artistName: artists.name,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .where(or(like(albums.title, pattern), like(artists.name, pattern)))
      .limit(8)
      .all();

    for (const alb of localAlbums) {
      const normTitle = normalizeSearchQuery(alb.title);
      let score = 70;
      if (normTitle === normQ) score = 95;
      else if (normTitle.startsWith(normQ)) score = 85;
      else if (normTitle.includes(normQ)) score = 75;

      const badge =
        alb.albumType === 'soundtrack'
          ? 'Soundtrack'
          : alb.albumType === 'ep'
          ? 'EP'
          : alb.albumType === 'single'
          ? 'Single'
          : alb.albumType === 'compilation'
          ? 'Compilation'
          : 'Album';

      const year = alb.releaseDate ? alb.releaseDate.substring(0, 4) : '';
      const subtitle = [alb.artistName, year].filter(Boolean).join(' • ');

      suggestions.push({
        id: alb.id,
        type: alb.albumType === 'soundtrack' ? 'soundtrack' : alb.albumType === 'ep' ? 'ep' : alb.albumType === 'single' ? 'single' : 'album',
        title: alb.title,
        subtitle,
        slug: alb.slug,
        url: `/music/${alb.slug}`,
        imageUrl: alb.coverUrl,
        badge,
        matchScore: score,
      });
    }

    // ------------------------------------------------------------------------
    // 3. Match Local Tracks
    // ------------------------------------------------------------------------
    const localTracks = db
      .select({
        id: tracks.id,
        title: tracks.title,
        slug: tracks.slug,
        durationSeconds: tracks.durationSeconds,
        artistName: artists.name,
        albumTitle: albums.title,
        albumSlug: albums.slug,
        coverUrl: albums.coverUrl,
      })
      .from(tracks)
      .leftJoin(artists, eq(tracks.artistId, artists.id))
      .leftJoin(albums, eq(tracks.albumId, albums.id))
      .where(like(tracks.title, pattern))
      .limit(6)
      .all();

    for (const tr of localTracks) {
      const normTitle = normalizeSearchQuery(tr.title);
      let score = 65;
      if (normTitle === normQ) score = 92;
      else if (normTitle.startsWith(normQ)) score = 80;

      const durMin = tr.durationSeconds ? `${Math.floor(tr.durationSeconds / 60)}:${String(tr.durationSeconds % 60).padStart(2, '0')}` : '';
      const subtitle = [tr.artistName, tr.albumTitle, durMin].filter(Boolean).join(' • ');

      suggestions.push({
        id: tr.id,
        type: 'track',
        title: tr.title,
        subtitle,
        slug: tr.slug,
        url: `/music/${tr.albumSlug || tr.slug}`,
        imageUrl: tr.coverUrl,
        badge: 'Track',
        matchScore: score,
      });
    }

    // Sort by match score descending
    suggestions.sort((a, b) => b.matchScore - a.matchScore);

    // ------------------------------------------------------------------------
    // 4. Query Spotify Multi-search if local results are sparse
    // ------------------------------------------------------------------------
    if (suggestions.length < 4 && query.length >= 3) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Autocomplete external timeout')), 1600)
        );

        const spotifyFetch = searchSpotifyMulti(query, 4);
        const external = await Promise.race([spotifyFetch, timeoutPromise]);

        // Add external artists
        for (const ea of external.artists) {
          if (!suggestions.some(s => normalizeSearchQuery(s.title) === normalizeSearchQuery(ea.name))) {
            suggestions.push({
              id: ea.providerId || ea.slug,
              type: 'artist',
              title: ea.name,
              subtitle: 'Artist',
              slug: ea.slug,
              url: `/artists/${ea.slug}`,
              imageUrl: ea.imageUrl,
              badge: 'Artist',
              matchScore: 68,
            });
          }
        }

        // Add external albums
        for (const ea of external.albums) {
          if (!suggestions.some(s => normalizeSearchQuery(s.title) === normalizeSearchQuery(ea.title))) {
            const badge =
              ea.albumType === 'soundtrack' ? 'Soundtrack' : ea.albumType === 'ep' ? 'EP' : ea.albumType === 'single' ? 'Single' : 'Album';
            suggestions.push({
              id: ea.providerId || ea.slug,
              type: ea.albumType as any,
              title: ea.title,
              subtitle: ea.artistName || 'Album',
              slug: ea.slug,
              url: `/music/${ea.slug}`,
              imageUrl: ea.coverUrl,
              badge,
              matchScore: 66,
            });
          }
        }

        // Add external tracks
        for (const et of external.tracks) {
          if (!suggestions.some(s => normalizeSearchQuery(s.title) === normalizeSearchQuery(et.title))) {
            const dur = et.durationSeconds ? `${Math.floor(et.durationSeconds / 60)}:${String(et.durationSeconds % 60).padStart(2, '0')}` : '';
            suggestions.push({
              id: et.providerId || et.slug,
              type: 'track',
              title: et.title,
              subtitle: [et.artistName, et.albumTitle, dur].filter(Boolean).join(' • '),
              slug: et.slug,
              url: `/music/${et.albumSlug}`,
              imageUrl: et.coverUrl,
              badge: 'Track',
              matchScore: 64,
            });
          }
        }
      } catch {
        // External lookup is non-blocking
      }
    }

    // Limit final suggestions to top 10
    const finalSuggestions = suggestions.slice(0, 10);

    return NextResponse.json({
      suggestions: finalSuggestions,
    });
  } catch (error) {
    console.error('Autocomplete API error:', error);
    return NextResponse.json({ suggestions: [] });
  }
}
