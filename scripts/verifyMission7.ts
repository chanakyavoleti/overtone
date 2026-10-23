import { db, sql } from '../src/lib/db';
import { artists, albums, tracks } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  calculateArtistMatchScore,
  normalizeSearchQuery,
  expandQueryAliases,
  phoneticNormalize,
} from '../src/lib/metadata/normalization';
import { searchArtistsUnified, getOrImportArtistBySlug } from '../src/lib/metadata/metadataManager';
import { isSpotifyConfigured, getSpotifyAccessToken, searchSpotifyArtists } from '../src/lib/metadata/providers/spotify';
import { isValidArtworkUrl, selectBestArtwork, resolveArtistPhoto } from '../src/lib/metadata/artworkService';

async function runMissionVerification() {
  console.log('=====================================================');
  console.log('       MISSION VERIFICATION & BENCHMARK SUITE        ');
  console.log('=====================================================\n');

  // 1. Target Artist Discovery Test
  console.log('--- 1. TARGET ARTIST DISCOVERY & METADATA ---');
  const targetArtists = [
    'Devi Sri Prasad',
    'A. R. Rahman',
    'Arijit Singh',
    'S. P. Balasubrahmanyam',
    'Ilaiyaraaja',
    'Sid Sriram',
    'Anirudh Ravichander',
    'Sushin Shyam',
  ];

  for (const name of targetArtists) {
    const res = await searchArtistsUnified(name);
    const top = res.artists[0];
    if (top) {
      console.log(`✓ Discovery "${name}": Found "${top.name}" (score: ${top.matchScore}, image: ${!!top.imageUrl}, slug: ${top.slug})`);
    } else {
      console.log(`✗ Discovery "${name}": NOT FOUND`);
    }
  }

  // 2. Alternate Spellings & Typo Tolerance
  console.log('\n--- 2. TYPO-TOLERANT AUTOCOMPLETE & MATCH SCORING ---');
  const typoQueries = [
    { q: 'devi shree prasad', expected: 'Devi Sri Prasad' },
    { q: 'dsp', expected: 'Devi Sri Prasad' },
    { q: 'ar rehman', expected: 'A. R. Rahman' },
    { q: 'ilayaraja', expected: 'Ilaiyaraaja' },
    { q: 'spb', expected: 'S. P. Balasubrahmanyam' },
    { q: 'arjith singh', expected: 'Arijit Singh' },
    { q: 'anirudh', expected: 'Anirudh' },
    { q: 'sid sriram', expected: 'Sid Sriram' },
    { q: 'shreya goshal', expected: 'Shreya Ghoshal' },
    { q: '   DSP   ', expected: 'Devi Sri Prasad' },
    { q: 'aRiJiT SiNgH', expected: 'Arijit Singh' },
  ];

  for (const item of typoQueries) {
    const res = await searchArtistsUnified(item.q);
    const top = res.artists[0];
    const matchScore = top ? calculateArtistMatchScore(item.q, top.name) : 0;
    console.log(`Query: "${item.q}" => Top Match: "${top?.name}" (Score: ${matchScore}, Slug: ${top?.slug})`);
  }

  // 3. Ambiguous Short Queries Guard
  console.log('\n--- 3. AMBIGUOUS SHORT QUERY SAFEGUARDS ---');
  const shortQueries = ['ar', 'sp', 'ds'];
  for (const sq of shortQueries) {
    const scoreRandom1 = calculateArtistMatchScore(sq, 'Pink Floyd');
    const scoreRandom2 = calculateArtistMatchScore(sq, 'Radiohead');
    const scoreValid = calculateArtistMatchScore(sq, 'AR Rahman');
    console.log(`Short Query "${sq}": Pink Floyd = ${scoreRandom1}, Radiohead = ${scoreRandom2}, AR Rahman = ${scoreValid}`);
  }

  // 4. Dynamic Discovery for Artist not currently in catalog
  console.log('\n--- 4. DYNAMIC DISCOVERY FOR UNCATALOGED ARTIST ---');
  const testUncatalogedSlug = 'chappell-roan';
  const imported = await getOrImportArtistBySlug(testUncatalogedSlug);
  if (imported) {
    console.log(`✓ Dynamic Discovery: Successfully fetched & imported "${imported.name}" (ID: ${imported.id}, photo: ${!!imported.imageUrl})`);
  } else {
    console.log(`✗ Dynamic Discovery: Could not import "${testUncatalogedSlug}"`);
  }

  // 5. Discography Counts & Release Classification
  console.log('\n--- 5. DISCOGRAPHY METRICS & SOUNDTRACK RELATIONSHIPS ---');
  const sampleArtists = ['devi-sri-prasad', 'a-r-rahman', 's-p-balasubrahmanyam', 'ilaiyaraaja'];
  for (const slug of sampleArtists) {
    const artist = db.select().from(artists).where(eq(artists.slug, slug)).get();
    if (artist) {
      const artistAlbums = db.select().from(albums).where(eq(albums.artistId, artist.id)).all();
      const soundtracks = artistAlbums.filter(a => a.albumType === 'soundtrack').length;
      const studio = artistAlbums.filter(a => a.albumType === 'album').length;
      const singles = artistAlbums.filter(a => a.albumType === 'single').length;
      console.log(`✓ ${artist.name}: Total ${artistAlbums.length} releases (Soundtracks: ${soundtracks}, Studio: ${studio}, Singles: ${singles})`);
    }
  }

  // 6. Spotify Integration Status
  console.log('\n--- 6. SPOTIFY PROVIDER STATUS ---');
  const configured = isSpotifyConfigured();
  console.log(`Spotify Configured: ${configured}`);
  const token = await getSpotifyAccessToken();
  console.log(`Spotify Token: ${token ? 'ACTIVE' : 'NULL (Awaiting credentials in .env.local)'}`);
  const spotifySearch = await searchSpotifyArtists('Arijit Singh');
  console.log(`Spotify Search without credentials: ${spotifySearch.length} results (Graceful fallback)`);

  // 7. Overall Catalog Numbers
  console.log('\n--- 7. OVERALL CATALOG METRICS ---');
  const allArtists = db.select().from(artists).all();
  const allAlbums = db.select().from(albums).all();
  const allTracks = db.select().from(tracks).all();
  const validArtwork = allAlbums.filter(a => isValidArtworkUrl(a.coverUrl)).length;
  const validPhotos = allArtists.filter(a => isValidArtworkUrl(a.imageUrl)).length;

  console.log(`Total Cataloged Artists: ${allArtists.length}`);
  console.log(`Artists with Photographs: ${validPhotos}`);
  console.log(`Total Releases: ${allAlbums.length}`);
  console.log(`Releases with Valid Artwork: ${validArtwork} (${((validArtwork / allAlbums.length) * 100).toFixed(1)}%)`);
  console.log(`Total Tracks: ${allTracks.length}`);
}

runMissionVerification().catch(console.error);
