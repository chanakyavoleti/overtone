import { db, sql } from '../db';
import {
  artists,
  albums,
  tracks,
  albumArtists,
  genres,
  albumGenres,
  ratings,
} from '../db/schema';
import { eq, like, and } from 'drizzle-orm';
import slugify from 'slugify';
import { NormalizedArtist, NormalizedAlbum, EnrichmentStatus } from './types';
import {
  normalizeSearchQuery,
  expandQueryAliases,
  calculateArtistMatchScore,
  normalizeAlbumTitle,
  classifyAlbumType,
  KNOWN_ARTIST_ALIASES,
  resolveCanonicalSlug,
} from './normalization';
import {
  isSpotifyConfigured,
  searchSpotifyArtists,
  fetchSpotifyDiscography,
  fetchSpotifyTracks,
  getSpotifyArtistPhoto,
} from './providers/spotify';
import { selectBestArtwork, isValidArtworkUrl, upgradeArtworkResolution } from './artworkService';
import { VERIFIED_ARTIST_PHOTOS } from '../db/discographyService';

/**
 * High-level unified metadata manager that coordinates local database querying,
 * multi-provider search, ranking, discography pagination, and artwork protection.
 */

export interface SearchOptions {
  limit?: number;
  offset?: number;
  includeExternal?: boolean;
}

/**
 * Searches local database and configured external providers (iTunes IN/US, Deezer, MusicBrainz),
 * normalizing queries, matching aliases, and ranking by relevance.
 */
export async function searchArtistsUnified(
  query: string,
  options: SearchOptions = {}
): Promise<{ artists: any[]; total: number }> {
  const cleanQ = query.trim();
  if (!cleanQ) return { artists: [], total: 0 };

  const limit = options.limit || 20;
  const offset = options.offset || 0;
  const includeExternal = options.includeExternal !== false;

  const now = Math.floor(Date.now() / 1000);
  const aliasVariations = expandQueryAliases(cleanQ);

  // 1. Query Local Database
  // Build pattern queries for query and its alias variations
  const localQueryConditions = aliasVariations.map(v => `%${v}%`);
  
  const allLocal = db.all(sql`
    SELECT 
      ar.id,
      ar.name,
      ar.slug,
      ar.bio,
      ar.imageUrl,
      ar.country,
      ar.formedYear,
      ar.disbandedYear,
      ar.aliases,
      ar.enrichmentStatus,
      AVG(r.score) as avgRating,
      COUNT(r.id) as ratingCount
    FROM artists ar
    LEFT JOIN ratings r ON r.targetType = 'artist' AND r.targetId = ar.id
    GROUP BY ar.id
  `) as Array<{
    id: number;
    name: string;
    slug: string;
    bio: string | null;
    imageUrl: string | null;
    country: string | null;
    formedYear: number | null;
    disbandedYear: number | null;
    aliases: string | null;
    enrichmentStatus: string | null;
    avgRating: number | null;
    ratingCount: number;
  }>;

  // Filter and score local matches
  const matchedLocal: Array<any & { matchScore: number }> = [];

  for (const art of allLocal) {
    let artAliases: string[] = [];
    if (art.aliases) {
      try {
        artAliases = JSON.parse(art.aliases);
      } catch {
        artAliases = [art.aliases];
      }
    }
    if (KNOWN_ARTIST_ALIASES[art.slug]) {
      artAliases = [...artAliases, ...KNOWN_ARTIST_ALIASES[art.slug]];
    }

    let bestScore = calculateArtistMatchScore(cleanQ, art.name, artAliases);
    for (const v of aliasVariations) {
      const s = calculateArtistMatchScore(v, art.name, artAliases);
      if (s > bestScore) bestScore = s;
    }

    if (bestScore > 35) {
      matchedLocal.push({
        ...art,
        aliases: artAliases,
        matchScore: bestScore,
      });
    }
  }

  // 2. Query External Providers if local results are insufficient or no exact match
  const hasExactLocal = matchedLocal.some(a => a.matchScore >= 90);

  if ((!hasExactLocal || matchedLocal.length < 5) && cleanQ.length >= 2 && includeExternal) {
    try {
      // Spotify is the sole external data provider
      const externalResults = await searchSpotifyArtists(cleanQ, 10).catch(() => []);

      // Combine external results and find top candidate to import/update
      const candidateMap = new Map<string, NormalizedArtist>();

      for (const item of externalResults) {
        const normKey = normalizeSearchQuery(item.name);
        const existing = candidateMap.get(normKey);

        if (!existing) {
          candidateMap.set(normKey, {
            ...item,
            matchScore: calculateArtistMatchScore(cleanQ, item.name, item.aliases),
          });
        } else {
          // Merge provider info
          if (!existing.imageUrl && item.imageUrl) existing.imageUrl = item.imageUrl;
          if (!existing.country && item.country) existing.country = item.country;
          if (item.aliases) existing.aliases = [...(existing.aliases || []), ...item.aliases];
        }
      }

      // Filter and insert newly discovered artists with high relevance
      const highRelevanceCandidates = Array.from(candidateMap.values())
        .filter(c => (c.matchScore || 0) >= 60)
        .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
        .slice(0, 5);

      for (const candidate of highRelevanceCandidates) {
        let existingLocal = allLocal.find(
          l => normalizeSearchQuery(l.name) === normalizeSearchQuery(candidate.name) || l.slug === candidate.slug
        );

        let artistId: number;

        let bestPhoto = candidate.imageUrl;
        if (!bestPhoto && VERIFIED_ARTIST_PHOTOS[candidate.slug]) {
          bestPhoto = VERIFIED_ARTIST_PHOTOS[candidate.slug];
        }

        if (!existingLocal) {
          // Insert new artist
          try {
            const inserted = db
              .insert(artists)
              .values({
                name: candidate.name,
                slug: candidate.slug,
                bio: `${candidate.name} is an internationally recognized music artist cataloged on Overtone.`,
                imageUrl: bestPhoto,
                country: candidate.country || null,
                aliases: candidate.aliases ? JSON.stringify(candidate.aliases) : null,
                enrichmentStatus: 'pending',
                createdAt: now,
              })
              .returning({ id: artists.id })
              .get();

            artistId = inserted.id;

            matchedLocal.push({
              id: artistId,
              name: candidate.name,
              slug: candidate.slug,
              bio: null,
              imageUrl: bestPhoto,
              country: candidate.country || null,
              formedYear: null,
              disbandedYear: null,
              aliases: candidate.aliases || [],
              avgRating: null,
              ratingCount: 0,
              matchScore: candidate.matchScore || 70,
            });
          } catch {
            // Slug collision or unique constraint
          }
        } else {
          artistId = existingLocal.id;
          // Update photo to official Spotify photo if candidate is from Spotify or local photo is missing/outdated
          if (candidate.provider === 'spotify' && bestPhoto && existingLocal.imageUrl !== bestPhoto) {
            db.update(artists).set({ imageUrl: bestPhoto }).where(eq(artists.id, artistId)).run();
            existingLocal.imageUrl = bestPhoto;
          } else if (!existingLocal.imageUrl && bestPhoto) {
            db.update(artists).set({ imageUrl: bestPhoto }).where(eq(artists.id, artistId)).run();
            existingLocal.imageUrl = bestPhoto;
          }
        }
      }
    } catch (err) {
      console.error('Error during external artist search:', err);
    }
  }

  // 3. Sort by matchScore descending, then avgRating, then name
  matchedLocal.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    if ((b.ratingCount || 0) !== (a.ratingCount || 0)) return (b.ratingCount || 0) - (a.ratingCount || 0);
    return a.name.localeCompare(b.name);
  });

  const total = matchedLocal.length;
  const paginated = matchedLocal.slice(offset, offset + limit);

  return { artists: paginated, total };
}

/**
 * Enriches an artist's complete discography with multi-page retrieval,
 * deduplication, authentic artwork selection, and tracklists.
 */
export async function enrichArtistDiscographyUnified(
  artistId: number,
  options: { forceRefresh?: boolean; minAlbums?: number } = {}
): Promise<EnrichmentStatus> {
  const artist = db.select().from(artists).where(eq(artists.id, artistId)).get();
  if (!artist) {
    return {
      artistId,
      status: 'failed',
      releasesDiscovered: 0,
      releasesStored: 0,
      releasesWithArtwork: 0,
      releasesWithTracks: 0,
      pagesProcessed: 0,
      lastEnrichedAt: Math.floor(Date.now() / 1000),
      error: 'Artist not found',
    };
  }

  const now = Math.floor(Date.now() / 1000);

  // Check existing albums count and enrichment status
  const existingAlbums = db.select().from(albums).where(eq(albums.artistId, artistId)).all();
  const hasLegacyThirdParty = existingAlbums.some(
    a => a.coverUrl?.includes('dzcdn.net') || a.coverUrl?.includes('mzstatic.com') || (a.coverUrl && !a.coverUrl.includes('scdn.co'))
  );

  if (artist.enrichmentStatus === 'complete' && existingAlbums.length >= 10 && !hasLegacyThirdParty && !options.forceRefresh) {
    const withArt = existingAlbums.filter(a => Boolean(a.coverUrl)).length;
    const withTracks = existingAlbums.filter(a => a.trackCount > 0).length;

    return {
      artistId,
      status: 'complete',
      releasesDiscovered: existingAlbums.length,
      releasesStored: existingAlbums.length,
      releasesWithArtwork: withArt,
      releasesWithTracks: withTracks,
      pagesProcessed: 1,
      lastEnrichedAt: now,
    };
  }

  // Update status to in_progress
  db.update(artists)
    .set({ enrichmentStatus: 'in_progress' })
    .where(eq(artists.id, artistId))
    .run();

  let pagesProcessed = 0;
  let discoveredReleases: NormalizedAlbum[] = [];

  try {
    // Official Spotify Discovery & Discography (Sole Provider)
    const spArtists = await searchSpotifyArtists(artist.name, 1);
    if (spArtists.length > 0) {
      const spArtist = spArtists[0];
      pagesProcessed += 1;

      // Upgrade artist photo with official high-res Spotify portrait
      if (spArtist.imageUrl) {
        db.update(artists).set({ imageUrl: spArtist.imageUrl }).where(eq(artists.id, artistId)).run();
      }

      // Fetch official Spotify discography (albums, singles, compilations)
      if (spArtist.providerId) {
        const spAlbums = await fetchSpotifyDiscography(String(spArtist.providerId), 150);
        pagesProcessed += Math.max(1, Math.ceil(spAlbums.length / 10));
        discoveredReleases.push(...spAlbums);
      }

      // Collaborative releases: Kanye West (¥$ releases: VULTURES 1, VULTURES 2)
      if (artist.slug === 'kanye-west') {
        try {
          const vulturesArtist = await searchSpotifyArtists('¥$', 1);
          if (vulturesArtist.length > 0 && vulturesArtist[0].providerId) {
            const vulturesAlbums = await fetchSpotifyDiscography(String(vulturesArtist[0].providerId), 20);
            discoveredReleases.push(...vulturesAlbums);
          }
        } catch {
          // ignore
        }
      }
    }
  } catch (err: any) {
    console.error(`External fetch failed for ${artist.name}:`, err.message);
  }

  // Deduplicate albums by normalized title and albumType
  const albumMap = new Map<string, NormalizedAlbum>();

  for (const alb of discoveredReleases) {
    const normTitle = normalizeAlbumTitle(alb.title);
    if (!normTitle) continue;

    const key = `${normTitle}-${alb.albumType}`;
    const existing = albumMap.get(key);

    if (!existing) {
      albumMap.set(key, alb);
    } else {
      // Merge best artwork and higher trackCount
      const bestArt = selectBestArtwork(existing.coverUrl, alb.coverUrl);
      if (bestArt) existing.coverUrl = bestArt;
      if (alb.trackCount > existing.trackCount) {
        existing.trackCount = alb.trackCount;
      }
    }
  }

  // PURGE LEGACY THIRD-PARTY JUNK:
  // If we discovered official releases from Spotify, delete any legacy albums for this artist
  // that do NOT match any official Spotify release and have no user ratings.
  if (discoveredReleases.length > 0) {
    const validSpotifyTitles = new Set(
      discoveredReleases.map(d => normalizeAlbumTitle(d.title))
    );

    const currentArtistAlbums = db.select().from(albums).where(eq(albums.artistId, artistId)).all();
    for (const ca of currentArtistAlbums) {
      // If it's already a verified Spotify album, keep it
      if (ca.providerId && ca.coverUrl?.includes('scdn.co')) {
        continue;
      }

      // Check if user has rated or reviewed it
      const hasRating = db
        .select({ id: ratings.id })
        .from(ratings)
        .where(and(eq(ratings.targetType, 'album'), eq(ratings.targetId, ca.id)))
        .get();

      if (hasRating) {
        continue;
      }

      const normCaTitle = normalizeAlbumTitle(ca.title);
      if (!validSpotifyTitles.has(normCaTitle)) {
        // Delete junk third-party album and its tracks
        db.delete(tracks).where(eq(tracks.albumId, ca.id)).run();
        db.delete(albumArtists).where(eq(albumArtists.albumId, ca.id)).run();
        db.delete(albums).where(eq(albums.id, ca.id)).run();
      }
    }
  }

  // Store albums in SQLite
  let storedCount = 0;
  let artworkCount = 0;
  let tracksCount = 0;

  for (const alb of Array.from(albumMap.values())) {
    const year = alb.releaseDate ? alb.releaseDate.substring(0, 4) : '';
    let albumSlug = slugify(alb.title, { lower: true, strict: true }) || `album-${alb.providerId || Math.random()}`;

    // Check if album exists in DB
    let existingRecord = db.select().from(albums).where(eq(albums.slug, albumSlug)).get();
    let currentAlbumId: number;

    const finalCover = selectBestArtwork(existingRecord?.coverUrl, alb.coverUrl);

    if (!existingRecord) {
      try {
        const inserted = db
          .insert(albums)
          .values({
            title: alb.title,
            slug: albumSlug,
            artistId,
            releaseDate: alb.releaseDate,
            albumType: alb.albumType,
            coverUrl: finalCover,
            label: alb.label,
            trackCount: alb.trackCount,
            providerId: alb.providerId ? String(alb.providerId) : null,
            createdAt: now,
          })
          .returning({ id: albums.id })
          .get();

        currentAlbumId = inserted.id;

        db.insert(albumArtists)
          .values({ albumId: currentAlbumId, artistId, role: 'primary' })
          .onConflictDoNothing()
          .run();

        storedCount++;
        if (finalCover) artworkCount++;
      } catch {
        // Disambiguate slug on conflict
        albumSlug = `${albumSlug}-${year || Math.floor(Math.random() * 10000)}`;
        try {
          const inserted = db
            .insert(albums)
            .values({
              title: alb.title,
              slug: albumSlug,
              artistId,
              releaseDate: alb.releaseDate,
              albumType: alb.albumType,
              coverUrl: finalCover,
              label: alb.label,
              trackCount: alb.trackCount,
              providerId: alb.providerId ? String(alb.providerId) : null,
              createdAt: now,
            })
            .returning({ id: albums.id })
            .get();

          currentAlbumId = inserted.id;
          db.insert(albumArtists)
            .values({ albumId: currentAlbumId, artistId, role: 'primary' })
            .onConflictDoNothing()
            .run();

          storedCount++;
          if (finalCover) artworkCount++;
        } catch {
          continue;
        }
      }
    } else {
      currentAlbumId = existingRecord.id;
      // Protect and upgrade artwork
      if (!existingRecord.coverUrl && finalCover) {
        db.update(albums).set({ coverUrl: finalCover }).where(eq(albums.id, currentAlbumId)).run();
        artworkCount++;
      } else if (existingRecord.coverUrl) {
        artworkCount++;
      }
      storedCount++;
    }

    // Populate tracks for top albums if missing
    const existingTrackCount = db
      .select({ count: sql<number>`count(*)` })
      .from(tracks)
      .where(eq(tracks.albumId, currentAlbumId))
      .get()?.count ?? 0;

    if (existingTrackCount === 0 && storedCount <= 15) {
      if (alb.provider === 'spotify' && alb.providerId) {
        try {
          const songTracks = await fetchSpotifyTracks(String(alb.providerId));
          let totalRuntime = 0;

          for (const t of songTracks) {
            totalRuntime += t.durationSeconds;
            db.insert(tracks)
              .values({
                title: t.title,
                slug: t.slug,
                albumId: currentAlbumId,
                artistId,
                trackNumber: t.trackNumber,
                discNumber: t.discNumber,
                durationSeconds: t.durationSeconds,
                explicit: t.explicit ? 1 : 0,
                createdAt: now,
              })
              .onConflictDoNothing()
              .run();
          }

          if (songTracks.length > 0) {
            db.update(albums)
              .set({
                trackCount: songTracks.length,
                runtimeSeconds: totalRuntime > 0 ? totalRuntime : null,
              })
              .where(eq(albums.id, currentAlbumId))
              .run();
            tracksCount++;
          }
        } catch {
          // Track lookup failure is non-fatal
        }
      }
    } else if (existingTrackCount > 0) {
      tracksCount++;
    }
  }

  // Update artist status
  const finalStatus: 'complete' | 'partial' = storedCount > 0 ? 'complete' : 'partial';

  db.update(artists)
    .set({
      enrichmentStatus: finalStatus,
      lastEnrichedAt: now,
    })
    .where(eq(artists.id, artistId))
    .run();

  return {
    artistId,
    status: finalStatus,
    releasesDiscovered: discoveredReleases.length,
    releasesStored: storedCount,
    releasesWithArtwork: artworkCount,
    releasesWithTracks: tracksCount,
    pagesProcessed,
    lastEnrichedAt: now,
  };
}

/**
 * Retrieves an artist by slug from the local catalog, or dynamically discovers,
 * imports, and enriches them from external metadata providers on demand.
 */
export async function getOrImportArtistBySlug(slug: string): Promise<any | null> {
  const cleanSlug = slug.trim();
  if (!cleanSlug) return null;

  const canonicalSlug = resolveCanonicalSlug(cleanSlug);

  // 1. Check local catalog by canonical slug, then by provided slug
  let existing = db.select().from(artists).where(eq(artists.slug, canonicalSlug)).get();
  if (!existing && canonicalSlug !== cleanSlug) {
    existing = db.select().from(artists).where(eq(artists.slug, cleanSlug)).get();
  }
  if (existing) {
    return existing;
  }

  // 2. Query Spotify exclusively
  const queryName = canonicalSlug.replace(/-/g, ' ');
  const candidates: NormalizedArtist[] = await searchSpotifyArtists(queryName, 5).catch(() => []);

  if (candidates.length === 0) {
    return null;
  }

  // Find best candidate matching this slug or query
  const best = candidates.find(
    c => c.slug === cleanSlug || normalizeSearchQuery(c.name) === normalizeSearchQuery(queryName)
  ) || candidates[0];

  const now = Math.floor(Date.now() / 1000);
  let bestPhoto = best.imageUrl;
  if (VERIFIED_ARTIST_PHOTOS[best.slug]) {
    bestPhoto = VERIFIED_ARTIST_PHOTOS[best.slug];
  }

  try {
    const inserted = db
      .insert(artists)
      .values({
        name: best.name,
        slug: best.slug || cleanSlug,
        bio: `${best.name} is an internationally recognized music artist cataloged on Overtone.`,
        imageUrl: bestPhoto,
        country: best.country || null,
        aliases: best.aliases ? JSON.stringify(best.aliases) : null,
        enrichmentStatus: 'pending',
        createdAt: now,
      })
      .returning()
      .get();

    // Auto-enrich discography on demand
    try {
      await enrichArtistDiscographyUnified(inserted.id, { minAlbums: 6 });
    } catch (enrichErr) {
      console.warn('Initial discography enrichment deferred:', enrichErr);
    }

    return inserted;
  } catch {
    // If concurrent insert occurred, return existing row
    return db.select().from(artists).where(eq(artists.slug, cleanSlug)).get() || null;
  }
}
