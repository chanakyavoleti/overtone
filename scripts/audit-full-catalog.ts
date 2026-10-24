import Database from 'better-sqlite3';

const db = new Database('data/overtone.db');

console.log('=== FULL CATALOG AUDIT ===');

// 1. Check orphaned albums
const orphanedAlbums = db.prepare(`
  SELECT a.id, a.title, a.artistId
  FROM albums a
  LEFT JOIN artists ar ON a.artistId = ar.id
  WHERE a.artistId IS NOT NULL AND ar.id IS NULL
`).all();
console.log(`Orphaned albums (pointing to non-existent artistId): ${orphanedAlbums.length}`);

// 2. Check albums with NULL artistId and no album_artists entry
const unlinkedAlbums = db.prepare(`
  SELECT a.id, a.title
  FROM albums a
  WHERE a.artistId IS NULL 
    AND NOT EXISTS (SELECT 1 FROM album_artists aa WHERE aa.albumId = a.id)
`).all();
console.log(`Unlinked albums (no artistId and no album_artists junction): ${unlinkedAlbums.length}`);

// 3. Check orphaned tracks
const orphanedTracks = db.prepare(`
  SELECT t.id, t.title, t.albumId
  FROM tracks t
  LEFT JOIN albums a ON t.albumId = a.id
  WHERE a.id IS NULL
`).all();
console.log(`Orphaned tracks (pointing to non-existent albumId): ${orphanedTracks.length}`);

// 4. Check artists with 0 albums
const emptyArtists = db.prepare(`
  SELECT ar.id, ar.name, ar.slug
  FROM artists ar
  WHERE NOT EXISTS (
    SELECT 1 FROM albums a WHERE a.artistId = ar.id
  ) AND NOT EXISTS (
    SELECT 1 FROM album_artists aa WHERE aa.artistId = ar.id
  )
`).all();
console.log(`Artists with 0 albums: ${emptyArtists.length}`);
if (emptyArtists.length > 0) {
  console.log('Empty artists:', emptyArtists);
}

// 5. Check release type distribution
const distribution = db.prepare(`
  SELECT albumType, count(*) as count
  FROM albums
  GROUP BY albumType
`).all();
console.log('Album types distribution:', distribution);

// 6. Check total counts
const totalArtists = (db.prepare('SELECT count(*) as c FROM artists').get() as any).c;
const totalAlbums = (db.prepare('SELECT count(*) as c FROM albums').get() as any).c;
const totalTracks = (db.prepare('SELECT count(*) as c FROM tracks').get() as any).c;
console.log(`\nTotals in DB:`);
console.log(`- Artists: ${totalArtists}`);
console.log(`- Albums: ${totalAlbums}`);
console.log(`- Tracks: ${totalTracks}`);
