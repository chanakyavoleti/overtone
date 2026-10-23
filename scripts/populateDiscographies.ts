import { db, sql } from '../src/lib/db';
import {
  artists,
  albums,
  tracks,
  albumArtists,
} from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  VERIFIED_ARTIST_PHOTOS,
  ensureArtistDiscography,
} from '../src/lib/db/discographyService';

async function main() {
  console.log('--- 1. Updating Artist Images & Merging Aliases ---');

  // Update verified artist photos
  for (const [slug, url] of Object.entries(VERIFIED_ARTIST_PHOTOS)) {
    const res = db.update(artists).set({ imageUrl: url }).where(eq(artists.slug, slug)).run();
    if (res.changes > 0) {
      console.log(`Updated photo for ${slug}`);
    }
  }

  // Handle Devi Sriprasad / DSP
  const dspPhoto = 'https://cdn-images.dzcdn.net/images/artist/9961ed1ccbad49be9d55cc62a02defea/500x500-000000-80-0-0.jpg';
  db.update(artists).set({ imageUrl: dspPhoto }).where(eq(artists.slug, 'devi-sriprasad')).run();
  db.update(artists).set({ imageUrl: dspPhoto }).where(eq(artists.slug, 'dsp')).run();

  // Handle Beat-les -> The Beatles
  const beatles = db.select().from(artists).where(eq(artists.slug, 'the-beatles')).get();
  const beatlesAlias = db.select().from(artists).where(eq(artists.slug, 'beat-les')).get();
  if (beatles && beatlesAlias) {
    console.log('Reassigning Beat-les albums to The Beatles...');
    db.update(albums).set({ artistId: beatles.id }).where(eq(albums.artistId, beatlesAlias.id)).run();
    db.delete(artists).where(eq(artists.id, beatlesAlias.id)).run();
  }

  // Handle Graduation Songs -> Kanye West
  const kanye = db.select().from(artists).where(eq(artists.slug, 'kanye-west')).get();
  const gradSongs = db.select().from(artists).where(eq(artists.slug, 'graduation-songs')).get();
  if (kanye && gradSongs) {
    db.update(albums).set({ artistId: kanye.id }).where(eq(albums.artistId, gradSongs.id)).run();
    db.delete(artists).where(eq(artists.id, gradSongs.id)).run();
  }

  // Handle Adele & The Chandeliers -> Adele
  const fakeAdele = db.select().from(artists).where(eq(artists.slug, 'adele-and-the-chandeliers')).get();
  if (fakeAdele) {
    db.delete(albums).where(eq(albums.artistId, fakeAdele.id)).run();
    db.delete(artists).where(eq(artists.id, fakeAdele.id)).run();
  }

  // Ensure Adele exists
  let adele = db.select().from(artists).where(eq(artists.slug, 'adele')).get();
  if (!adele) {
    const inserted = db.insert(artists).values({
      name: 'Adele',
      slug: 'adele',
      bio: 'English singer-songwriter known for her soulful, emotive voice and globally record-breaking albums including 19, 21, 25, and 30.',
      imageUrl: 'https://cdn-images.dzcdn.net/images/artist/5e22b1d2569cf1ea763b09ff3c978a50/500x500-000000-80-0-0.jpg',
      country: 'United Kingdom',
      formedYear: 2006,
      createdAt: Math.floor(Date.now() / 1000),
    }).returning({ id: artists.id }).get();
    adele = db.select().from(artists).where(eq(artists.id, inserted.id)).get()!;
  }

  console.log('--- 2. Fetching Complete Discographies for Core Artists ---');

  const allArtists = db.select().from(artists).all();
  console.log(`Processing ${allArtists.length} artists...`);

  for (const art of allArtists) {
    console.log(`Populating discography for: ${art.name} (${art.slug})...`);
    try {
      await ensureArtistDiscography(art.id, 6);
    } catch (err: any) {
      console.error(`Error populating ${art.name}:`, err.message);
    }
  }

  console.log('--- Discography population finished! ---');
}

main().catch(console.error);
