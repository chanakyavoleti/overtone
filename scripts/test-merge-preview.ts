import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';
import { VERIFIED_ARTIST_PHOTOS } from '../src/lib/db/discographyService';

// Target merges: fromSlug -> toSlug
const SLUG_MERGES: Record<string, string> = {
  'anirudh': 'anirudh-ravichander',
  'devi-sriprasad': 'devi-sri-prasad',
  'dsp': 'devi-sri-prasad',
  'devisri-prasad': 'devi-sri-prasad',
  'spb': 's-p-balasubrahmanyam',
  'ar-rahman': 'a-r-rahman',
  'mm-keeravaani': 'mm-keeravani',
  'ks-chitra': 'ks-chithra',
  'kj-yesudas': 'k-j-yesudas',
  'thaman-s': 'thaman',
};

console.log('Merge map configured with', Object.keys(SLUG_MERGES).length, 'mappings');
