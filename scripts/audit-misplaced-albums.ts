import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

async function auditMisplacedAlbums() {
  // 1. Look for albums where the artist name is in the title, or the title doesn't match the artist
  // or albums associated with artists that are clearly wrong (e.g. Jailer or Mahesh Babu as artist)
  const allArtists = db.all(sql`SELECT id, name, slug FROM artists ORDER BY name ASC`) as any[];
  console.log(`Total artists in DB: ${allArtists.length}`);

  // Check artists like Jailer, Mahesh Babu
  const suspiciousArtists = allArtists.filter(a => 
    a.slug === 'jailer' || a.slug === 'mahesh-babu'
  );
  console.log('Suspicious artist entities (like movies/actors as artists):', suspiciousArtists);

  for (const s of suspiciousArtists) {
    const albs = db.all(sql`SELECT id, title, slug, artistId FROM albums WHERE artistId = ${s.id}`) as any[];
    console.log(`Artist "${s.name}" (id: ${s.id}) has ${albs.length} albums! Sample:`, albs.slice(0, 5).map(a => a.title));
  }

  // 2. Check for albums where title contains another famous artist name
  // e.g. "Anirudh", "A.R. Rahman", "Devi Sri Prasad", "DSP", "Thaman", "Ilaiyaraaja"
  console.log('\n--- Checking cross-artist misplacements in albums ---');
  const samples = db.all(sql`
    SELECT 
      al.id as albumId,
      al.title as albumTitle,
      al.slug as albumSlug,
      al.artistId,
      ar.name as currentArtistName,
      ar.slug as currentArtistSlug
    FROM albums al
    INNER JOIN artists ar ON ar.id = al.artistId
    WHERE (
      al.title LIKE '%Anirudh%' AND ar.slug NOT LIKE '%anirudh%'
    ) OR (
      al.title LIKE '%A.R. Rahman%' AND ar.slug NOT LIKE '%rahman%'
    ) OR (
      al.title LIKE '%Devi Sri Prasad%' AND ar.slug NOT LIKE '%devi-sri-prasad%'
    ) OR (
      al.title LIKE '%Ilayaraja%' AND ar.slug NOT LIKE '%ilaiyaraaja%'
    )
    LIMIT 30
  `) as any[];

  console.log(`Found ${samples.length} sample misplaced album titles:`);
  samples.forEach(s => {
    console.log(`Album: "${s.albumTitle}" currently under Artist: "${s.currentArtistName}" (${s.currentArtistSlug})`);
  });
}

auditMisplacedAlbums();
