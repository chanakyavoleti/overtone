import { db, sql } from '../src/lib/db';
import { artists } from '../src/lib/db/schema';
import { eq, isNull, or } from 'drizzle-orm';
import { VERIFIED_ARTIST_PHOTOS } from '../src/lib/db/discographyService';
import { searchDeezerArtists, isValidDeezerPhoto } from '../src/lib/metadata/providers/deezer';
import { searchSpotifyArtists, isSpotifyConfigured } from '../src/lib/metadata/providers/spotify';
import { isValidArtworkUrl, verifyImageReachability } from '../src/lib/metadata/artworkService';
import { calculateArtistMatchScore } from '../src/lib/metadata/normalization';

async function backfillArtistImages() {
  console.log('=== ARTIST IMAGE BACKFILL PROCESS ===');

  // 1. Find artists with missing or placeholder images
  const targetArtists = db
    .select({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
      imageUrl: artists.imageUrl,
    })
    .from(artists)
    .where(
      or(
        isNull(artists.imageUrl),
        sql`imageUrl = ''`,
        sql`imageUrl LIKE '%c9d19c4bba2c1605876c762729974916%'`,
        sql`imageUrl LIKE '%abd95cd3882021d0f16006cc391f993c%'`
      )
    )
    .all();

  console.log(`Found ${targetArtists.length} artists needing image verification/backfill.`);
  if (targetArtists.length === 0) {
    console.log('All artists already have valid verified photographs!');
    return;
  }

  let updatedCount = 0;
  let skippedCount = 0;

  for (const artist of targetArtists) {
    let resolvedPhoto: string | null = null;

    // Check Priority 1: Verified curated map
    if (VERIFIED_ARTIST_PHOTOS[artist.slug]) {
      resolvedPhoto = VERIFIED_ARTIST_PHOTOS[artist.slug];
    }

    // Priority 2: Query Deezer if no curated photo
    if (!resolvedPhoto) {
      try {
        const deezerResults = await searchDeezerArtists(artist.name, 3);
        for (const cand of deezerResults) {
          const matchScore = calculateArtistMatchScore(artist.name, cand.name);
          if (matchScore >= 80 && cand.imageUrl && isValidDeezerPhoto(cand.imageUrl)) {
            resolvedPhoto = cand.imageUrl;
            break;
          }
        }
      } catch {
        // Deezer error, continue
      }
    }

    // Priority 3: Query Spotify if configured
    if (!resolvedPhoto && isSpotifyConfigured()) {
      try {
        const spotifyResults = await searchSpotifyArtists(artist.name, 3);
        for (const cand of spotifyResults) {
          const matchScore = calculateArtistMatchScore(artist.name, cand.name);
          if (matchScore >= 80 && cand.imageUrl && isValidArtworkUrl(cand.imageUrl)) {
            resolvedPhoto = cand.imageUrl;
            break;
          }
        }
      } catch {
        // Spotify error, continue
      }
    }

    // Validate image candidate URL
    if (resolvedPhoto && isValidArtworkUrl(resolvedPhoto)) {
      db.update(artists)
        .set({ imageUrl: resolvedPhoto })
        .where(eq(artists.id, artist.id))
        .run();
      updatedCount++;
      console.log(`[UPDATED] ${artist.name} (id: ${artist.id}) => ${resolvedPhoto.slice(0, 60)}...`);
    } else {
      skippedCount++;
      console.log(`[NO_CANDIDATE] ${artist.name} - preserved neutral fallback.`);
    }

    // Rate-limit throttle: 150ms delay between requests
    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`\n=== BACKFILL COMPLETE ===`);
  console.log(`Updated with authentic photographs: ${updatedCount}`);
  console.log(`Neutral fallback preserved: ${skippedCount}`);
}

backfillArtistImages().catch(console.error);
