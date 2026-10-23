import { db, sql } from '../src/lib/db';
import { albums, artists } from '../src/lib/db/schema';
import { eq, like } from 'drizzle-orm';

async function check() {
  // 1. Editorial feature
  const editorial = db.all(sql`SELECT * FROM editorial_features`);
  console.log('--- EDITORIAL FEATURES ---');
  console.log(JSON.stringify(editorial, null, 2));

  // 2. Currents album
  const currents = db.select().from(albums).where(like(albums.title, '%Currents%')).all();
  console.log('\n--- CURRENTS ALBUM ---');
  console.log(JSON.stringify(currents, null, 2));

  // 3. OK Computer album
  const okComp = db.select().from(albums).where(like(albums.title, '%OK Computer%')).all();
  console.log('\n--- OK COMPUTER ALBUM ---');
  console.log(JSON.stringify(okComp, null, 2));

  // 4. Kanye West artist & albums
  const kanye = db.select().from(artists).where(like(artists.name, '%Kanye%')).all();
  console.log('\n--- KANYE WEST ARTIST ---');
  console.log(JSON.stringify(kanye, null, 2));

  if (kanye[0]) {
    const kanyeAlbums = db.select().from(albums).where(eq(albums.artistId, kanye[0].id)).all();
    console.log(`\nKanye West Albums in DB (${kanyeAlbums.length}):`);
    kanyeAlbums.forEach(a => console.log(`  - [${a.albumType}] ${a.title} (${a.releaseDate})`));
  }

  // 5. Tame Impala artist & albums
  const tame = db.select().from(artists).where(like(artists.name, '%Tame Impala%')).all();
  console.log('\n--- TAME IMPALA ARTIST ---');
  console.log(JSON.stringify(tame, null, 2));
  if (tame[0]) {
    const tameAlbums = db.select().from(albums).where(eq(albums.artistId, tame[0].id)).all();
    console.log(`\nTame Impala Albums in DB (${tameAlbums.length}):`);
    tameAlbums.forEach(a => console.log(`  - [${a.albumType}] ${a.title} (${a.releaseDate})`));
  }
}

check().catch(console.error);
