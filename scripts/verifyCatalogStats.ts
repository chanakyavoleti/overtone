import { db } from '../src/lib/db';
import { artists, albums, tracks } from '../src/lib/db/schema';
import { count, sql, eq } from 'drizzle-orm';

async function main() {
  const [totalArtists] = await db.select({ val: count() }).from(artists);
  const [totalAlbums] = await db.select({ val: count() }).from(albums);
  const [totalTracks] = await db.select({ val: count() }).from(tracks);
  
  const [withArtwork] = await db.select({ val: count() }).from(albums).where(sql`coverUrl IS NOT NULL AND coverUrl != ''`);
  const [artistsWithPhoto] = await db.select({ val: count() }).from(artists).where(sql`imageUrl IS NOT NULL AND imageUrl != ''`);

  const types = await db.select({
    type: albums.albumType,
    val: count()
  }).from(albums).groupBy(albums.albumType);

  console.log('--- DATABASE STATS ---');
  console.log('Total Artists:', totalArtists.val);
  console.log('Artists with Photograph:', artistsWithPhoto.val);
  console.log('Total Albums/Releases:', totalAlbums.val);
  console.log('Albums with Valid Artwork:', withArtwork.val);
  console.log('Total Tracks:', totalTracks.val);
  console.log('\nAlbum Type Breakdown:');
  for (const t of types) {
    console.log(`  - ${t.type}: ${t.val}`);
  }

  // Sample check for Indian artists
  const testArtists = [
    { name: 'Devi Sri Prasad', slug: 'devi-sri-prasad' },
    { name: 'Sid Sriram', slug: 'sid-sriram' },
    { name: 'S. P. Balasubrahmanyam', slug: 's-p-balasubrahmanyam' },
    { name: 'K. S. Chithra', slug: 'ks-chithra' },
    { name: 'M. M. Keeravani', slug: 'mm-keeravani' },
    { name: 'Thaman S', slug: 'thaman' },
    { name: 'Anirudh Ravichander', slug: 'anirudh' },
    { name: 'Ram Miriyala', slug: 'ram-miriyala' },
    { name: 'A. R. Rahman', slug: 'a-r-rahman' },
    { name: 'Ilaiyaraaja', slug: 'ilaiyaraaja' },
    { name: 'Harris Jayaraj', slug: 'harris-jayaraj' },
    { name: 'Yuvan Shankar Raja', slug: 'yuvan-shankar-raja' },
    { name: 'D. Imman', slug: 'd-imman' },
    { name: 'Santhosh Narayanan', slug: 'santhosh-narayanan' },
    { name: 'Vijay Antony', slug: 'vijay-antony' },
    { name: 'Arijit Singh', slug: 'arijit-singh' },
    { name: 'Sonu Nigam', slug: 'sonu-nigam' },
    { name: 'Shreya Ghoshal', slug: 'shreya-ghoshal' },
    { name: 'Sunidhi Chauhan', slug: 'sunidhi-chauhan' },
    { name: 'Pritam', slug: 'pritam' },
    { name: 'Amit Trivedi', slug: 'amit-trivedi' },
    { name: 'Kishore Kumar', slug: 'kishore-kumar' },
    { name: 'Lata Mangeshkar', slug: 'lata-mangeshkar' },
    { name: 'K. J. Yesudas', slug: 'k-j-yesudas' },
    { name: 'Sushin Shyam', slug: 'sushin-shyam' },
    { name: 'Gopi Sundar', slug: 'gopi-sundar' },
    { name: 'Vidyasagar', slug: 'vidyasagar' },
    { name: 'Hamsalekha', slug: 'hamsalekha' },
    { name: 'Arjun Janya', slug: 'arjun-janya' },
    { name: 'Vijay Prakash', slug: 'vijay-prakash' }
  ];

  console.log('\n--- TARGET ARTIST VERIFICATION ---');
  for (const item of testArtists) {
    const artistRows = await db.select().from(artists).where(sql`slug = ${item.slug} OR name = ${item.name}`);
    const match = artistRows[0];
    if (match) {
      const [albumCount] = await db.select({ val: count() }).from(albums).where(eq(albums.artistId, match.id));
      const [artCount] = await db.select({ val: count() }).from(albums).where(sql`artistId = ${match.id} AND coverUrl IS NOT NULL AND coverUrl != ''`);
      console.log(`✓ ${match.name} (slug: ${match.slug}): ${albumCount.val} releases (${artCount.val} artwork), image: ${match.imageUrl ? 'YES' : 'NO'}`);
    } else {
      console.log(`✗ ${item.name} (${item.slug}): NOT FOUND`);
    }
  }
}

main().catch(console.error);
