import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

async function detailedAudit() {
  const mbAlbums = db.all(sql`SELECT id, title, slug, coverUrl, releaseDate FROM albums WHERE artistId = 33`) as any[];
  console.log('--- ALL 29 ALBUMS UNDER MAHESH BABU ---');
  mbAlbums.forEach(a => console.log(`${a.id} | ${a.title}`));

  // Check tracks under Mahesh Babu albums
  const mbTracks = db.all(sql`
    SELECT t.id, t.title, t.albumId, a.title as albumTitle
    FROM tracks t
    INNER JOIN albums a ON a.id = t.albumId
    WHERE a.artistId = 33
    LIMIT 15
  `) as any[];
  console.log('\nSample tracks under Mahesh Babu albums:', mbTracks.length);
  mbTracks.forEach(t => console.log(`${t.id} | ${t.albumTitle} -> ${t.title}`));
}

detailedAudit();
