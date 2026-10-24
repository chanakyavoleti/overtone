import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';
import { VERIFIED_ARTIST_PHOTOS } from '../src/lib/db/discographyService';

const SLUG_MERGES: Record<string, string> = {
  'anirudh': 'anirudh-ravichander',
  'devi-sriprasad': 'devi-sri-prasad',
  'dsp': 'devi-sri-prasad',
  'devisri-prasad': 'devi-sri-prasad',
  'spb': 's-p-balasubrahmanyam',
  'ar-rahman': 'a-r-rahman',
  'mm-keeravaani': 'mm-keeravani',
  'ks-chitra': 'ks-chithra',
  'kj-yesudas': 'k-j-yesudas',
  'thaman-s': 'thaman',
};

async function consolidate() {
  console.log('--- Starting Catalog Consolidation ---');

  for (const [fromSlug, toSlug] of Object.entries(SLUG_MERGES)) {
    const fromArtist = db.all(sql`SELECT * FROM artists WHERE slug = ${fromSlug}`)[0] as any;
    const toArtist = db.all(sql`SELECT * FROM artists WHERE slug = ${toSlug}`)[0] as any;

    if (!fromArtist) {
      console.log(`Source artist ${fromSlug} not found; skipping.`);
      continue;
    }
    if (!toArtist) {
      console.log(`Target artist ${toSlug} not found; skipping.`);
      continue;
    }

    console.log(`Merging ${fromArtist.name} (id: ${fromArtist.id}) -> ${toArtist.name} (id: ${toArtist.id})`);

    // 1. Move albums
    const fromAlbums = db.all(sql`SELECT * FROM albums WHERE artistId = ${fromArtist.id}`) as any[];
    for (const alb of fromAlbums) {
      // Check if target already has an album with the same slug
      const existingInTarget = db.all(sql`SELECT * FROM albums WHERE artistId = ${toArtist.id} AND slug = ${alb.slug}`)[0];
      if (existingInTarget) {
        // Move tracks from alb to existingInTarget
        db.run(sql`UPDATE tracks SET albumId = ${(existingInTarget as any).id} WHERE albumId = ${alb.id}`);
        db.run(sql`DELETE FROM album_artists WHERE albumId = ${alb.id}`);
        db.run(sql`DELETE FROM albums WHERE id = ${alb.id}`);
      } else {
        // Just reassign artistId
        db.run(sql`UPDATE albums SET artistId = ${toArtist.id} WHERE id = ${alb.id}`);
        db.run(sql`UPDATE album_artists SET artistId = ${toArtist.id} WHERE albumId = ${alb.id} AND artistId = ${fromArtist.id}`);
      }
    }

    // 2. Move tracks
    db.run(sql`UPDATE tracks SET artistId = ${toArtist.id} WHERE artistId = ${fromArtist.id}`);
    db.run(sql`UPDATE track_artists SET artistId = ${toArtist.id} WHERE artistId = ${fromArtist.id}`);

    // 3. Move ratings
    try {
      db.run(sql`
        UPDATE ratings 
        SET targetId = ${toArtist.id} 
        WHERE targetType = 'artist' 
          AND targetId = ${fromArtist.id} 
          AND userId NOT IN (
            SELECT userId FROM ratings WHERE targetType = 'artist' AND targetId = ${toArtist.id}
          )
      `);
      db.run(sql`DELETE FROM ratings WHERE targetType = 'artist' AND targetId = ${fromArtist.id}`);
    } catch (e: any) {
      console.warn('Ratings move warning:', e.message);
    }

    // 4. Move reviews
    try {
      db.run(sql`UPDATE reviews SET targetId = ${toArtist.id} WHERE targetType = 'artist' AND targetId = ${fromArtist.id}`);
    } catch (e: any) {
      console.warn('Reviews move warning:', e.message);
    }

    // 5. Delete fromArtist record
    db.run(sql`DELETE FROM artist_genres WHERE artistId = ${fromArtist.id}`);
    db.run(sql`DELETE FROM artists WHERE id = ${fromArtist.id}`);
    console.log(`Successfully merged ${fromSlug} into ${toSlug}`);
  }

  // 6. Purge empty leftover collaborative/scraping junk with 0 albums, 0 ratings, 0 reviews, 0 tracks
  const junkArtists = db.all(sql`
    SELECT a.id, a.name, a.slug FROM artists a
    LEFT JOIN albums al ON al.artistId = a.id
    LEFT JOIN ratings r ON r.targetType = 'artist' AND r.targetId = a.id
    LEFT JOIN reviews rev ON rev.targetType = 'artist' AND rev.targetId = a.id
    LEFT JOIN tracks t ON t.artistId = a.id
    GROUP BY a.id
    HAVING COUNT(al.id) = 0 
       AND COUNT(r.id) = 0 
       AND COUNT(rev.id) = 0 
       AND COUNT(t.id) = 0
  `) as any[];

  console.log(`Found ${junkArtists.length} junk empty artist records to purge.`);
  for (const junk of junkArtists) {
    db.run(sql`DELETE FROM artist_genres WHERE artistId = ${junk.id}`);
    db.run(sql`DELETE FROM artists WHERE id = ${junk.id}`);
  }

  // 7. Apply verified portraits to all artists
  console.log('Applying verified Spotify portraits to artists...');
  let photosUpdated = 0;
  for (const [slug, photoUrl] of Object.entries(VERIFIED_ARTIST_PHOTOS)) {
    const res = db.run(sql`
      UPDATE artists 
      SET imageUrl = ${photoUrl} 
      WHERE slug = ${slug} OR slug = ${slug.replace(/-/g, '')}
    `);
    if (res.changes > 0) photosUpdated += res.changes;
  }
  console.log(`Updated portraits for ${photosUpdated} artist entries.`);

  console.log('--- Catalog Consolidation Complete ---');
}

consolidate();
