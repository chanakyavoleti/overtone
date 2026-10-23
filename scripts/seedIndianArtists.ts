import { db, sql } from '../src/lib/db';
import { artists, albums, tracks, albumArtists } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { searchArtistsUnified, enrichArtistDiscographyUnified } from '../src/lib/metadata/metadataManager';
import { VERIFIED_ARTIST_PHOTOS } from '../src/lib/db/discographyService';

const KEY_INDIAN_ARTISTS = [
  // Telugu
  { name: 'Devi Sri Prasad', country: 'India', aliases: ['DSP', 'Devi Sriprasad'] },
  { name: 'Sid Sriram', country: 'India', aliases: ['Sidharth Sriram'] },
  { name: 'S. P. Balasubrahmanyam', country: 'India', aliases: ['SPB', 'SP Balu', 'S.P. Balasubrahmanyam'] },
  { name: 'K. S. Chithra', country: 'India', aliases: ['KS Chithra', 'Chitra', 'K.S. Chitra'] },
  { name: 'M. M. Keeravani', country: 'India', aliases: ['MM Keeravani', 'Marakathamani'] },
  { name: 'Thaman S', country: 'India', aliases: ['S. Thaman', 'SS Thaman', 'Thaman'] },
  { name: 'Anirudh Ravichander', country: 'India', aliases: ['Anirudh'] },
  { name: 'Ram Miriyala', country: 'India', aliases: [] },

  // Tamil
  { name: 'A. R. Rahman', country: 'India', aliases: ['AR Rahman', 'A.R. Rahman', 'Isai Puyal'] },
  { name: 'Ilaiyaraaja', country: 'India', aliases: ['Ilayaraja', 'Ilaiyaraja', 'Maestro', 'Isaignani'] },
  { name: 'Harris Jayaraj', country: 'India', aliases: ['Harris Jeyaraj'] },
  { name: 'Yuvan Shankar Raja', country: 'India', aliases: ['Yuvan', 'U1'] },
  { name: 'D. Imman', country: 'India', aliases: ['Imman'] },
  { name: 'Santhosh Narayanan', country: 'India', aliases: ['SaNa'] },
  { name: 'Vijay Antony', country: 'India', aliases: [] },

  // Hindi
  { name: 'Arijit Singh', country: 'India', aliases: [] },
  { name: 'Sonu Nigam', country: 'India', aliases: ['Sonu Niigaam'] },
  { name: 'Shreya Ghoshal', country: 'India', aliases: ['Shreya Ghosal'] },
  { name: 'Sunidhi Chauhan', country: 'India', aliases: [] },
  { name: 'Pritam', country: 'India', aliases: ['Pritam Chakraborty'] },
  { name: 'Amit Trivedi', country: 'India', aliases: [] },
  { name: 'Kishore Kumar', country: 'India', aliases: [] },
  { name: 'Lata Mangeshkar', country: 'India', aliases: [] },

  // Malayalam
  { name: 'K. J. Yesudas', country: 'India', aliases: ['KJ Yesudas', 'Yesudas'] },
  { name: 'Sushin Shyam', country: 'India', aliases: [] },
  { name: 'Gopi Sundar', country: 'India', aliases: ['Gopi Sunder'] },
  { name: 'Vidyasagar', country: 'India', aliases: [] },

  // Kannada
  { name: 'Hamsalekha', country: 'India', aliases: [] },
  { name: 'Arjun Janya', country: 'India', aliases: [] },
  { name: 'Vijay Prakash', country: 'India', aliases: [] },
];

async function main() {
  console.log(`Starting enrichment for ${KEY_INDIAN_ARTISTS.length} Indian artists...`);

  for (const item of KEY_INDIAN_ARTISTS) {
    console.log(`\n--- Searching & importing: ${item.name} ---`);
    try {
      const searchRes = await searchArtistsUnified(item.name, { limit: 1, includeExternal: true });
      if (searchRes.artists.length > 0) {
        const art = searchRes.artists[0];
        console.log(`  Found/Imported: ${art.name} (ID: ${art.id}, slug: ${art.slug})`);

        // Update aliases if provided
        if (item.aliases.length > 0) {
          db.update(artists)
            .set({ aliases: JSON.stringify(item.aliases), country: item.country })
            .where(eq(artists.id, art.id))
            .run();
        }

        // Enrich discography
        const status = await enrichArtistDiscographyUnified(art.id, { minAlbums: 8 });
        console.log(`  Discography enriched: ${status.releasesStored} releases stored, ${status.releasesWithArtwork} with artwork`);
      } else {
        console.log(`  Could not find artist: ${item.name}`);
      }
    } catch (err: any) {
      console.error(`  Error processing ${item.name}:`, err.message);
    }
  }

  console.log('\n=== Finished seeding and enriching Indian artists! ===');
}

main().catch(console.error);
