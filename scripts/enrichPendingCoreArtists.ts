import { db, sql } from '../src/lib/db';
import { artists, albums } from '../src/lib/db/schema';
import { eq, like } from 'drizzle-orm';
import { enrichArtistDiscographyUnified } from '../src/lib/metadata/metadataManager';
import { VERIFIED_ARTIST_PHOTOS } from '../src/lib/db/discographyService';

async function main() {
  console.log('=== ENRICHING CORE ARTISTS & FIXING SPOTLIGHT/CURRENTS ===\n');

  // 1. Fix Currents cover
  const freshCurrentsCover = 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/a8/2e/b4/a82eb490-f30a-a321-461a-0383c88fec95/15UMGIM23316.rgb.jpg/600x600bb.jpg';
  db.update(albums)
    .set({ coverUrl: freshCurrentsCover })
    .where(eq(albums.slug, 'currents'))
    .run();
  console.log('✓ Updated Currents album cover with verified high-res artwork.');

  // 2. Fix Editorial spotlight image
  const okComputerArt = 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/07/60/ba/0760ba0f-148c-b18f-d0ff-169ee96f3af5/634904078164.png/600x600bb.jpg';
  db.run(sql`UPDATE editorial_features SET imageUrl = ${okComputerArt} WHERE id = 1`);
  console.log('✓ Updated Editorial Spotlight image in database with verified artwork.');

  // 3. Fix Kanye West portrait
  const kanyePortrait = 'https://cdn-images.dzcdn.net/images/artist/bb76c2ee3b068726ab4c37b0aabdb57a/1000x1000-000000-80-0-0.jpg';
  db.update(artists)
    .set({ imageUrl: kanyePortrait })
    .where(eq(artists.slug, 'kanye-west'))
    .run();
  console.log('✓ Updated Kanye West artist photo to authentic portrait.');

  // 4. Enrich Kanye West with forceRefresh
  const kanye = db.select().from(artists).where(eq(artists.slug, 'kanye-west')).get();
  if (kanye) {
    console.log(`\nEnriching Kanye West (ID: ${kanye.id})...`);
    const status = await enrichArtistDiscographyUnified(kanye.id, { forceRefresh: true });
    console.log(`  Discovered: ${status.releasesDiscovered}, Stored: ${status.releasesStored}`);
    
    // Check specific albums
    const kanyeReleases = db.select().from(albums).where(eq(albums.artistId, kanye.id)).all();
    console.log(`  Total Kanye West releases now in DB: ${kanyeReleases.length}`);
    console.log('  Has Life of Pablo:', kanyeReleases.some(a => a.title.toLowerCase().includes('pablo')));
    console.log('  Has Vultures:', kanyeReleases.some(a => a.title.toLowerCase().includes('vultures')));
    console.log('  Has Bully:', kanyeReleases.some(a => a.title.toLowerCase().includes('bully')));
    console.log('  Has Yeezus:', kanyeReleases.some(a => a.title.toLowerCase().includes('yeezus')));
    console.log('  Has Late Registration:', kanyeReleases.some(a => a.title.toLowerCase().includes('late registration')));
  }

  // 5. Enrich Tame Impala with forceRefresh
  const tame = db.select().from(artists).where(eq(artists.slug, 'tame-impala')).get();
  if (tame) {
    console.log(`\nEnriching Tame Impala (ID: ${tame.id})...`);
    const status = await enrichArtistDiscographyUnified(tame.id, { forceRefresh: true });
    console.log(`  Discovered: ${status.releasesDiscovered}, Stored: ${status.releasesStored}`);
    
    // Check specific albums
    const tameReleases = db.select().from(albums).where(eq(albums.artistId, tame.id)).all();
    console.log(`  Total Tame Impala releases now in DB: ${tameReleases.length}`);
    console.log('  Has Deadbeat:', tameReleases.some(a => a.title.toLowerCase().includes('deadbeat')));
    console.log('  Has No More Lies:', tameReleases.some(a => a.title.toLowerCase().includes('no more lies')));
    console.log('  Has Currents B-Sides:', tameReleases.some(a => a.title.toLowerCase().includes('b-sides')));
  }

  // 6. Enrich other core artists
  const otherCoreSlugs = [
    'radiohead',
    'kendrick-lamar',
    'pink-floyd',
    'the-beatles',
    'taylor-swift',
    'nirvana',
    'queen',
    'the-weeknd',
    'billie-eilish',
    'frank-ocean',
    'eminem',
    'tyler-the-creator',
    'arctic-monkeys',
    'daft-punk',
    'lana-del-rey'
  ];

  console.log('\nEnriching remaining core catalog artists...');
  for (const slug of otherCoreSlugs) {
    const art = db.select().from(artists).where(eq(artists.slug, slug)).get();
    if (art) {
      const artCountBefore = db.select().from(albums).where(eq(albums.artistId, art.id)).all().length;
      if (artCountBefore < 20 || art.enrichmentStatus !== 'complete') {
        const res = await enrichArtistDiscographyUnified(art.id, { forceRefresh: true });
        const countAfter = db.select().from(albums).where(eq(albums.artistId, art.id)).all().length;
        console.log(`✓ ${art.name}: expanded from ${artCountBefore} to ${countAfter} releases.`);
      }
    }
  }

  console.log('\n=== FINISHED ENRICHMENT OF CORE ARTISTS ===');
}

main().catch(console.error);
