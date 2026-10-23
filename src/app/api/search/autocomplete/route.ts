import { NextRequest, NextResponse } from 'next/server';
import { connection } from 'next/server';
import { db, sql } from '@/lib/db';
import {
  normalizeSearchQuery,
  expandQueryAliases,
  calculateArtistMatchScore,
} from '@/lib/metadata/normalization';
import { searchDeezerArtists, isValidDeezerPhoto } from '@/lib/metadata/providers/deezer';
import { searchITunesArtists } from '@/lib/metadata/providers/itunes';
import { VERIFIED_ARTIST_PHOTOS } from '@/lib/db/discographyService';

export async function GET(request: NextRequest) {
  await connection();
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';

    if (query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const normQ = normalizeSearchQuery(query);
    const aliasVariations = expandQueryAliases(query);

    // 1. Fetch artists from local DB
    const allLocal = db.all(sql`
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

    const matched: Array<{
      id: number;
      name: string;
      slug: string;
      imageUrl: string | null;
      country: string | null;
      matchedAlias?: string;
      matchScore: number;
      isLocal: boolean;
    }> = [];

    for (const a of allLocal) {
      let parsedAliases: string[] = [];
      if (a.aliases) {
        try {
          parsedAliases = JSON.parse(a.aliases);
        } catch {
          // ignore
        }
      }

      const score = calculateArtistMatchScore(query, a.name, parsedAliases);
      if (score >= 65) {
        // Find which alias matched if not exact name
        let matchedAlias: string | undefined;
        if (score >= 90 && normalizeSearchQuery(a.name) !== normQ) {
          matchedAlias = parsedAliases.find(al => normalizeSearchQuery(al) === normQ) || undefined;
          if (!matchedAlias && aliasVariations.length > 1) {
            matchedAlias = aliasVariations.find(v => normalizeSearchQuery(v) === normQ);
          }
        }

        matched.push({
          id: a.id,
          name: a.name,
          slug: a.slug,
          imageUrl: a.imageUrl,
          country: a.country,
          matchedAlias,
          matchScore: score,
          isLocal: true,
        });
      }
    }

    // Sort local results by score descending
    matched.sort((a, b) => b.matchScore - a.matchScore);

    // 2. If fewer than 3 high-confidence local matches and query is at least 3 characters,
    // query external providers with a fast timeout (1500ms) to ensure autocomplete stays fast.
    if (matched.length < 3 && query.length >= 3) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Autocomplete external timeout')), 1500)
        );

        const externalFetch = Promise.allSettled([
          searchITunesArtists(query, 5),
          searchDeezerArtists(query, 5),
        ]);

        const [itunesRes, deezerRes] = await Promise.race([externalFetch, timeoutPromise]) as [
          PromiseSettledResult<any[]>,
          PromiseSettledResult<any[]>
        ];

        const externalCandidates: any[] = [];
        if (itunesRes.status === 'fulfilled') externalCandidates.push(...itunesRes.value);
        if (deezerRes.status === 'fulfilled') externalCandidates.push(...deezerRes.value);

        for (const ext of externalCandidates) {
          const score = calculateArtistMatchScore(query, ext.name, ext.aliases || []);
          if (score >= 70) {
            // Check if already in matched
            const alreadyMatched = matched.some(
              m => m.slug === ext.slug || normalizeSearchQuery(m.name) === normalizeSearchQuery(ext.name)
            );

            if (!alreadyMatched) {
              let photo = ext.imageUrl;
              if (VERIFIED_ARTIST_PHOTOS[ext.slug]) {
                photo = VERIFIED_ARTIST_PHOTOS[ext.slug];
              }

              matched.push({
                id: -1, // Unimported external result
                name: ext.name,
                slug: ext.slug,
                imageUrl: photo,
                country: ext.country || null,
                matchScore: score,
                isLocal: false,
              });
            }
          }
        }
      } catch {
        // Fast fallback: if external timeout or error, continue with local results
      }
    }

    // Sort final list by match score
    matched.sort((a, b) => b.matchScore - a.matchScore);

    // Limit to top 8 suggestions for autocomplete dropdown
    const suggestions = matched.slice(0, 8);

    return NextResponse.json(
      { suggestions },
      {
        headers: {
          'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (err: any) {
    console.error('Autocomplete API error:', err);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}
