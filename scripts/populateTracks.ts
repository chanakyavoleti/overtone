import { db, sql } from '../src/lib/db';
import { albums, tracks, artists } from '../src/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import slugify from 'slugify';

async function main() {
  const albumsWithoutTracks = db.all(sql`
    SELECT a.id, a.title, a.slug, a.artistId, ar.name as artistName
    FROM albums a
    LEFT JOIN artists ar ON a.artistId = ar.id
    WHERE (SELECT count(*) FROM tracks t WHERE t.albumId = a.id) = 0
  `) as Array<{ id: number; title: string; slug: string; artistId: number | null; artistName: string | null }>;

  console.log(`Found ${albumsWithoutTracks.length} albums without tracks.`);

  const now = Math.floor(Date.now() / 1000);

  for (const alb of albumsWithoutTracks) {
    if (!alb.artistName) continue;
    console.log(`Fetching tracks for: ${alb.artistName} - ${alb.title}...`);

    try {
      const itunesRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(`${alb.artistName} ${alb.title}`)}&entity=album&limit=1`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (!itunesRes.ok) continue;
      const itunesData = await itunesRes.json();
      if (!itunesData.results || !itunesData.results[0]?.collectionId) continue;

      const lookupRes = await fetch(
        `https://itunes.apple.com/lookup?id=${itunesData.results[0].collectionId}&entity=song`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (!lookupRes.ok) continue;
      const lookupData = await lookupRes.json();
      const songItems = lookupData.results.filter(
        (x: any) => x.wrapperType === 'track' && x.trackName
      );

      let totalRuntime = 0;
      for (const s of songItems) {
        const trackSlug = slugify(`${s.trackName}-${s.trackNumber}`, { lower: true, strict: true }) || `track-${s.trackId}`;
        const durationSeconds = s.trackTimeMillis ? Math.round(s.trackTimeMillis / 1000) : 0;
        totalRuntime += durationSeconds;

        db.insert(tracks).values({
          title: s.trackName,
          slug: trackSlug,
          albumId: alb.id,
          artistId: alb.artistId,
          trackNumber: s.trackNumber || 1,
          discNumber: s.discNumber || 1,
          durationSeconds,
          explicit: s.trackExplicitness === 'explicit' ? 1 : 0,
          createdAt: now,
        }).onConflictDoNothing().run();
      }

      if (songItems.length > 0) {
        db.update(albums).set({
          trackCount: songItems.length,
          runtimeSeconds: totalRuntime > 0 ? totalRuntime : null,
        }).where(eq(albums.id, alb.id)).run();
        console.log(`  Added ${songItems.length} tracks to ${alb.title}`);
      }
    } catch (err: any) {
      console.log(`  Skipped ${alb.title}: ${err.message}`);
    }
  }

  console.log('Finished populating missing tracks!');
}

main().catch(console.error);
