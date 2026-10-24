import { db, sql } from './index';
import {
  artists,
  albums,
  tracks,
  albumArtists,
  genres,
  albumGenres,
} from './schema';
import { eq, like, and } from 'drizzle-orm';
import slugify from 'slugify';
import { enrichArtistDiscographyUnified, getOrImportArtistBySlug } from '../metadata/metadataManager';

// Known placeholder hash
export const PLACEHOLDER_AVATAR_HASH = 'c9d19c4bba2c1605876c762729974916';

// Curated verified authentic artist photos for known catalog artists (high-res Spotify CDN)
export const VERIFIED_ARTIST_PHOTOS: Record<string, string> = {
  radiohead: 'https://i.scdn.co/image/ab6761610000e5ebc8b09e390c50d53c2a63259b',
  'kendrick-lamar': 'https://i.scdn.co/image/ab6761610000e5ebd593bf40ce6bf7c6d66e7ea8',
  bjork: 'https://i.scdn.co/image/ab6761610000e5eb1e9c566fb5359740523023eb',
  'miles-davis': 'https://i.scdn.co/image/ab6761610000e5eb5d568c09a80b6a7a0b5f8846',
  'kate-bush': 'https://i.scdn.co/image/ab6761610000e5eb56e89bfcb97864f1d43eb4bf',
  'pink-floyd': 'https://i.scdn.co/image/ab6761610000e5ebc58f02f8dd6d183dca018742',
  'the-beatles': 'https://i.scdn.co/image/ab6761610000e5ebdf472851458e0a29486c8a00',
  'david-bowie': 'https://i.scdn.co/image/ab6761610000e5eb3e85e263d9ec9a6c9d09cfa3',
  'daft-punk': 'https://i.scdn.co/image/ab6761610000e5eb3b1c676233e50669c5e5c704',
  'fleetwood-mac': 'https://i.scdn.co/image/ab6761610000e5eb3cf0fe7eb1f06f7df2a688b1',
  'taylor-swift': 'https://i.scdn.co/image/ab6761610000e5eb859e4c14fa59296c8649e0e4',
  'led-zeppelin': 'https://i.scdn.co/image/ab6761610000e5eb4f479a95e7c8d9be975f7e71',
  'lana-del-rey': 'https://i.scdn.co/image/ab6761610000e5eb9816da6587c4f4a367fb3859',
  nirvana: 'https://i.scdn.co/image/ab6761610000e5eb0e945c7943fcf313e63456ae',
  queen: 'https://i.scdn.co/image/ab6761610000e5eb5a1b32d56e7e59b207e4d8a5',
  'the-weeknd': 'https://i.scdn.co/image/ab6761610000e5eb214f3cf1cbe7139c1e26ffbb',
  'billie-eilish': 'https://i.scdn.co/image/ab6761610000e5eb72ca6e133e9b44a460197772',
  'frank-ocean': 'https://i.scdn.co/image/ab6761610000e5eb1e93ae47bb3ef0a221f2ae52',
  'kanye-west': 'https://i.scdn.co/image/ab6761610000e5eb6e835a500e791bf9c27a422a',
  zayn: 'https://i.scdn.co/image/ab6761610000e5eb830845d2fa6c5c7874176951',
  eminem: 'https://i.scdn.co/image/ab6761610000e5eba00b11c129b27a88fc72f36b',
  'tyler-the-creator': 'https://i.scdn.co/image/ab6761610000e5eb8278b782c429f8e8d991ec4b',
  'arctic-monkeys': 'https://i.scdn.co/image/ab6761610000e5eb7da39dea0a72f581535fb11f',
  'tame-impala': 'https://i.scdn.co/image/ab6761610000e5ebe412a782245eb20d9626c601',
  'chappell-roan': 'https://i.scdn.co/image/ab6761610000e5ebc1c73ec60995c862fc8a72b2',

  // Indian Regional Masters & Playback Singers (Spotify Verified Portraits)
  'a-r-rahman': 'https://i.scdn.co/image/ab6761610000e5ebb19af0ea736c6228d6eb539c',
  'ar-rahman': 'https://i.scdn.co/image/ab6761610000e5ebb19af0ea736c6228d6eb539c',
  'devi-sri-prasad': 'https://i.scdn.co/image/ab6761610000e5ebaa5350248841ba12e12467af',
  'dsp': 'https://i.scdn.co/image/ab6761610000e5ebaa5350248841ba12e12467af',
  's-p-balasubrahmanyam': 'https://i.scdn.co/image/ab6761610000e5ebea2b56271cf92bcff45c0ae9',
  'spb': 'https://i.scdn.co/image/ab6761610000e5ebea2b56271cf92bcff45c0ae9',
  'anirudh-ravichander': 'https://i.scdn.co/image/ab6761610000e5eb0f0be2054fe9594026a6b843',
  'anirudh': 'https://i.scdn.co/image/ab6761610000e5eb0f0be2054fe9594026a6b843',
  'ilaiyaraaja': 'https://i.scdn.co/image/ab6761610000e5ebec891c36864eb59b28f65cf8',
  'm-m-keeravani': 'https://i.scdn.co/image/ab6761610000e5eb52d0a69e1840de19b3d651b6',
  'mm-keeravani': 'https://i.scdn.co/image/ab6761610000e5eb52d0a69e1840de19b3d651b6',
  'arijit-singh': 'https://i.scdn.co/image/ab6761610000e5ebadfb0b2df04b77e43b5f7375',
  'shreya-ghoshal': 'https://i.scdn.co/image/ab6761610000e5ebe7ce89a9f5d11e0ba26677eb',
  'k-j-yesudas': 'https://i.scdn.co/image/ab6761610000e5ebdd746a334ae236bb7a95c1d5',
  'thaman': 'https://i.scdn.co/image/ab6761610000e5eb1edc6d40afbea5426d0cfe0f',
  'thaman-s': 'https://i.scdn.co/image/ab6761610000e5eb1edc6d40afbea5426d0cfe0f',
  'sid-sriram': 'https://i.scdn.co/image/ab6761610000e5ebef6a8800763bf428e85940a6',
  'k-s-chithra': 'https://i.scdn.co/image/ab6761610000e5eb27852ef557c522e357664824',
  'ks-chithra': 'https://i.scdn.co/image/ab6761610000e5eb27852ef557c522e357664824',
  'sonu-nigam': 'https://i.scdn.co/image/ab6761610000e5ebbc959d7569618ec2af2210f5',
  'sunidhi-chauhan': 'https://i.scdn.co/image/ab6761610000e5eba45f7ef3e1c982461f2dad6b',
  'pritam': 'https://i.scdn.co/image/ab6761610000e5ebcb6926f44f620555ba444fca',
  'amit-trivedi': 'https://i.scdn.co/image/ab6761610000e5eba37271f7a4862a6e99ce345f',
  'kishore-kumar': 'https://i.scdn.co/image/ab6761610000e5ebc9ac92d87de28795c1c49730',
  'lata-mangeshkar': 'https://i.scdn.co/image/ab6761610000e5eba0199b159c0c5a9f62333d32',
  'sushin-shyam': 'https://i.scdn.co/image/ab6761610000e5eb27378fef0ac768222221f6ac',
  'vidyasagar': 'https://i.scdn.co/image/ab6761610000e5ebc44f0959a67fd5f94761041a',
  'gopi-sundar': 'https://i.scdn.co/image/ab6761610000e5eb1a17377fa816d625eb8e7435',
  'hamsalekha': 'https://i.scdn.co/image/ab6761610000e5eb554730668db603fa86588acf',
  'arjun-janya': 'https://i.scdn.co/image/ab6761610000e5eb6daaa05374075e6e221b659c',
  'vijay-prakash': 'https://i.scdn.co/image/ab6761610000e5ebdd9861f139278c57ca97f0be',
  'harris-jayaraj': 'https://i.scdn.co/image/ab6761610000e5eb1263a7722e01be16b21ab944',
  'yuvan-shankar-raja': 'https://i.scdn.co/image/ab6761610000e5ebe60d7a790ebea50d205bda93',
  'santhosh-narayanan': 'https://i.scdn.co/image/ab6761610000e5eba52538772891f66547e1ebc3',
  'd-imman': 'https://i.scdn.co/image/ab6761610000e5eb859ef7414772b7d07526d40a',
  'vijay-antony': 'https://i.scdn.co/image/ab6772690000c46c51320f1823e1b38521de23fd',
};

/**
 * Ensures complete discography for an artist using Spotify as exclusive metadata provider.
 */
export async function ensureArtistDiscography(artistId: number, minAlbums = 3): Promise<void> {
  await enrichArtistDiscographyUnified(artistId, { minAlbums });
}

/**
 * Searches and imports an artist via Spotify exclusive metadata provider.
 */
export async function searchAndImportArtist(query: string): Promise<number | null> {
  const cleanQ = query.trim();
  if (cleanQ.length < 2) return null;
  const slug = slugify(cleanQ, { lower: true, strict: true });
  const artist = await getOrImportArtistBySlug(slug);
  return artist ? artist.id : null;
}
