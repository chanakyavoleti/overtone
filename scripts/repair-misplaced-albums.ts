import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

async function repair() {
  console.log('--- Repairing Misplaced Album Data ---');

  const dsp = db.all(sql`SELECT id, name FROM artists WHERE slug = 'devi-sri-prasad'`)[0] as any;
  const thaman = db.all(sql`SELECT id, name FROM artists WHERE slug = 'thaman'`)[0] as any;
  const rahman = db.all(sql`SELECT id, name FROM artists WHERE slug = 'a-r-rahman'`)[0] as any;

  if (!dsp || !thaman || !rahman) {
    throw new Error('Required composer artists not found');
  }

  // 1. Reassign DSP albums
  const dspTitles = [
    'No. 1 Nenokkadine',
    'Sarileru Neekevvaru',
    'Maharshi',
    'He’s Soo Cute',
    "He's Soo Cute"
  ];

  for (const t of dspTitles) {
    const matching = db.all(sql`SELECT id, title, artistId FROM albums WHERE title LIKE ${`%${t}%`} AND artistId != ${dsp.id}`) as any[];
    for (const m of matching) {
      console.log(`Reassigning album "${m.title}" (id: ${m.id}) from artist ${m.artistId} -> Devi Sri Prasad (${dsp.id})`);
      db.run(sql`UPDATE albums SET artistId = ${dsp.id}, albumType = 'soundtrack' WHERE id = ${m.id}`);
      db.run(sql`UPDATE tracks SET artistId = ${dsp.id} WHERE albumId = ${m.id}`);
      db.run(sql`UPDATE album_artists SET artistId = ${dsp.id} WHERE albumId = ${m.id}`);
    }
  }

  // 2. Reassign Thaman albums
  const thamanTitles = [
    'Aagadu',
    'Guntur Kaaram',
    'Kurchi Madathapetti',
    'Ramana Aei'
  ];

  for (const t of thamanTitles) {
    const matching = db.all(sql`SELECT id, title, artistId FROM albums WHERE title LIKE ${`%${t}%`} AND artistId != ${thaman.id}`) as any[];
    for (const m of matching) {
      console.log(`Reassigning album "${m.title}" (id: ${m.id}) from artist ${m.artistId} -> Thaman (${thaman.id})`);
      db.run(sql`UPDATE albums SET artistId = ${thaman.id}, albumType = 'soundtrack' WHERE id = ${m.id}`);
      db.run(sql`UPDATE tracks SET artistId = ${thaman.id} WHERE albumId = ${m.id}`);
      db.run(sql`UPDATE album_artists SET artistId = ${thaman.id} WHERE albumId = ${m.id}`);
    }
  }

  // 3. Reassign A.R. Rahman compilation
  const rahmanMatching = db.all(sql`SELECT id, title, artistId FROM albums WHERE id = 3455 OR (title LIKE '%A.R. Rahman Essentials%' AND artistId != ${rahman.id})`) as any[];
  for (const m of rahmanMatching) {
    console.log(`Reassigning album "${m.title}" (id: ${m.id}) from artist ${m.artistId} -> A. R. Rahman (${rahman.id})`);
    db.run(sql`UPDATE albums SET artistId = ${rahman.id}, albumType = 'compilation' WHERE id = ${m.id}`);
    db.run(sql`UPDATE tracks SET artistId = ${rahman.id} WHERE albumId = ${m.id}`);
    db.run(sql`UPDATE album_artists SET artistId = ${rahman.id} WHERE albumId = ${m.id}`);
  }

  // 4. Remove Latin artist "Jailer" (id: 203)
  const jailerAlbums = db.all(sql`SELECT id FROM albums WHERE artistId = 203`) as any[];
  for (const a of jailerAlbums) {
    db.run(sql`DELETE FROM tracks WHERE albumId = ${a.id}`);
    db.run(sql`DELETE FROM album_artists WHERE albumId = ${a.id}`);
    db.run(sql`DELETE FROM albums WHERE id = ${a.id}`);
  }
  db.run(sql`DELETE FROM tracks WHERE artistId = 203`);
  db.run(sql`DELETE FROM track_artists WHERE artistId = 203`);
  db.run(sql`DELETE FROM artist_genres WHERE artistId = 203`);
  db.run(sql`DELETE FROM artists WHERE id = 203`);
  console.log(`Cleaned up Latin artist 'Jailer' (id 203).`);

  // Clean leftover non-soundtrack singles under Mahesh Babu (id: 33)
  const mbLeftover = db.all(sql`SELECT id, title FROM albums WHERE artistId = 33`) as any[];
  for (const a of mbLeftover) {
    db.run(sql`DELETE FROM tracks WHERE albumId = ${a.id}`);
    db.run(sql`DELETE FROM album_artists WHERE albumId = ${a.id}`);
    db.run(sql`DELETE FROM albums WHERE id = ${a.id}`);
  }
  db.run(sql`DELETE FROM tracks WHERE artistId = 33`);
  db.run(sql`DELETE FROM track_artists WHERE artistId = 33`);
  db.run(sql`DELETE FROM artist_genres WHERE artistId = 33`);
  db.run(sql`DELETE FROM artists WHERE id = 33`);
  console.log(`Cleaned up actor 'Mahesh Babu' artist record and ${mbLeftover.length} leftover Bhojpuri tracks.`);

  // 5. Ensure soundtrack album types are correctly marked for film scores
  const ostUpdates = db.run(sql`
    UPDATE albums 
    SET albumType = 'soundtrack'
    WHERE (
      title LIKE '%Soundtrack%' 
      OR title LIKE '%Original Motion Picture%'
      OR title LIKE '%OST%'
      OR title LIKE '%From "%'
      OR title LIKE '%(From %'
    ) AND albumType = 'album'
  `);
  console.log(`Updated ${ostUpdates.changes} soundtrack releases to albumType = 'soundtrack'.`);

  console.log('--- Misplaced Album Data Repair Complete ---');
}

repair();
