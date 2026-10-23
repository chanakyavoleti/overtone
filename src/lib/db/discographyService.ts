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

// Known Deezer placeholder hash
export const PLACEHOLDER_AVATAR_HASH = 'c9d19c4bba2c1605876c762729974916';

// Curated verified authentic artist photos for known catalog artists
export const VERIFIED_ARTIST_PHOTOS: Record<string, string> = {
  radiohead: 'https://cdn-images.dzcdn.net/images/artist/0d58cfbc90f2e776608bcdc0c45a4711/500x500-000000-80-0-0.jpg',
  'kendrick-lamar': 'https://cdn-images.dzcdn.net/images/artist/be0a7c550567f4af0ed202d7235b74d6/500x500-000000-80-0-0.jpg',
  bjork: 'https://cdn-images.dzcdn.net/images/artist/9f9bf00ce8f05f975c698ac8cce76f59/500x500-000000-80-0-0.jpg',
  'miles-davis': 'https://cdn-images.dzcdn.net/images/artist/3a7973349c1b56f5764abb7507078f22/500x500-000000-80-0-0.jpg',
  'kate-bush': 'https://cdn-images.dzcdn.net/images/artist/ccbaf14c0164d376285f6500944fba21/500x500-000000-80-0-0.jpg',
  'pink-floyd': 'https://cdn-images.dzcdn.net/images/artist/d62a818a5de6455f17b6a992cf22b32f/500x500-000000-80-0-0.jpg',
  'the-beatles': 'https://cdn-images.dzcdn.net/images/artist/16925ed8f96eb621ecd56c2c8ba3da6e/500x500-000000-80-0-0.jpg',
  'david-bowie': 'https://cdn-images.dzcdn.net/images/artist/8301a6a09a24f4bb35950c59717defa0/500x500-000000-80-0-0.jpg',
  'daft-punk': 'https://cdn-images.dzcdn.net/images/artist/638e69b9caaf9f9f3f8826febea7b543/500x500-000000-80-0-0.jpg',
  'fleetwood-mac': 'https://cdn-images.dzcdn.net/images/artist/ef23278cf3a67a3ca8404ddaa38699d4/500x500-000000-80-0-0.jpg',
  'taylor-swift': 'https://cdn-images.dzcdn.net/images/artist/cc2495870fe1a792ad0cdb05501ad5ec/500x500-000000-80-0-0.jpg',
  'led-zeppelin': 'https://cdn-images.dzcdn.net/images/artist/2cf138b96a63da677ac6fb79846607c8/500x500-000000-80-0-0.jpg',
  'lana-del-rey': 'https://cdn-images.dzcdn.net/images/artist/8994d3be1a59a72f887f1f8afd2d4c6c/500x500-000000-80-0-0.jpg',
  nirvana: 'https://cdn-images.dzcdn.net/images/artist/ad67af8b0dca71d5e69f1afd8e045c4e/500x500-000000-80-0-0.jpg',
  queen: 'https://cdn-images.dzcdn.net/images/artist/06188edd60dc4b04a5520a3a75a1059a/500x500-000000-80-0-0.jpg',
  'the-weeknd': 'https://cdn-images.dzcdn.net/images/artist/581693b4724a7fcfa754455101e13a44/500x500-000000-80-0-0.jpg',
  'billie-eilish': 'https://cdn-images.dzcdn.net/images/artist/8eab1a9a644889aabaca1e193e05f984/500x500-000000-80-0-0.jpg',
  'frank-ocean': 'https://cdn-images.dzcdn.net/images/artist/882155c08dc31d6464d6d580083c968c/500x500-000000-80-0-0.jpg',
  'kanye-west': 'https://cdn-images.dzcdn.net/images/artist/bb76c2ee3b068726ab4c37b0aabdb57a/1000x1000-000000-80-0-0.jpg',
  eminem: 'https://cdn-images.dzcdn.net/images/artist/7fa738468c9a73ff98c1e1b78d622b81/500x500-000000-80-0-0.jpg',
  'tyler-the-creator': 'https://cdn-images.dzcdn.net/images/artist/5eceecd683beab6dd901a7931294a121/500x500-000000-80-0-0.jpg',
  'arctic-monkeys': 'https://cdn-images.dzcdn.net/images/artist/6c03e4c7c36800897fd468633286db24/500x500-000000-80-0-0.jpg',
  'stevie-wonder': 'https://cdn-images.dzcdn.net/images/artist/b8138428e7b0ce78843106b4b83d4e77/500x500-000000-80-0-0.jpg',
  'amy-winehouse': 'https://cdn-images.dzcdn.net/images/artist/0cacb43a576b031eb169cca27171c1f5/500x500-000000-80-0-0.jpg',
  'massive-attack': 'https://cdn-images.dzcdn.net/images/artist/3bfbf74ea27b926ba5376ea381f51d0b/500x500-000000-80-0-0.jpg',
  'michael-jackson': 'https://cdn-images.dzcdn.net/images/artist/ff1c8cf777db1efc2043b90d79dcbfc3/500x500-000000-80-0-0.jpg',
  'tame-impala': 'https://cdn-images.dzcdn.net/images/artist/879015e713cc6ad6ffaeec154c027505/500x500-000000-80-0-0.jpg',
  'the-cure': 'https://cdn-images.dzcdn.net/images/artist/8c9afdb1385ece7ddf2f2c923c70c0bc/500x500-000000-80-0-0.jpg',
  nas: 'https://cdn-images.dzcdn.net/images/artist/f6e4f9d1f6be43c36339a9a96dcee725/500x500-000000-80-0-0.jpg',
  thaman: 'https://cdn-images.dzcdn.net/images/artist/f013f603991126b1f43a5410365d2935/500x500-000000-80-0-0.jpg',
  'devi-sriprasad': 'https://cdn-images.dzcdn.net/images/artist/9961ed1ccbad49be9d55cc62a02defea/500x500-000000-80-0-0.jpg',
  dsp: 'https://cdn-images.dzcdn.net/images/artist/9961ed1ccbad49be9d55cc62a02defea/500x500-000000-80-0-0.jpg',
  anirudh: 'https://cdn-images.dzcdn.net/images/artist/c938ba78118d3c5f7c2edf0974b023b9/500x500-000000-80-0-0.jpg',
  coldplay: 'https://cdn-images.dzcdn.net/images/artist/3087954bca22f306324912e5ac8375c3/500x500-000000-80-0-0.jpg',
  drake: 'https://cdn-images.dzcdn.net/images/artist/1051e7fd110f9d3e5e88cdc69c5f227b/500x500-000000-80-0-0.jpg',
  adele: 'https://cdn-images.dzcdn.net/images/artist/5e22b1d2569cf1ea763b09ff3c978a50/500x500-000000-80-0-0.jpg',
  'a-r-rahman': 'https://cdn-images.dzcdn.net/images/artist/bd34315ef977a62a9e28c1ab19bb8ac4/500x500-000000-80-0-0.jpg',
  'ilaiyaraaja': 'https://cdn-images.dzcdn.net/images/artist/aeeca2a4b9f808c8e8f5d281b1fb48d0/500x500-000000-80-0-0.jpg',
  'sid-sriram': 'https://cdn-images.dzcdn.net/images/artist/fbe3e1d17fc6958e047f011f74233f82/500x500-000000-80-0-0.jpg',
  's-p-balasubrahmanyam': 'https://cdn-images.dzcdn.net/images/artist/e1ae356e308e1baad481b84dfe9d05fe/500x500-000000-80-0-0.jpg',
  'k-s-chithra': 'https://cdn-images.dzcdn.net/images/artist/b955b3207b61e722cf4d63ee0c762b12/500x500-000000-80-0-0.jpg',
  'm-m-keeravani': 'https://cdn-images.dzcdn.net/images/artist/5d78a2351117fed4d9d9c564de968a7e/500x500-000000-80-0-0.jpg',
  'arijit-singh': 'https://cdn-images.dzcdn.net/images/artist/ac5350cff290edd5b69fa584b8b1bd4f/500x500-000000-80-0-0.jpg',
  'sonu-nigam': 'https://cdn-images.dzcdn.net/images/artist/812220125c4f0db57050438b65afcf78/500x500-000000-80-0-0.jpg',
  'shreya-ghoshal': 'https://cdn-images.dzcdn.net/images/artist/3bb832d37d10ff2affcfa9afdc7c68a0/500x500-000000-80-0-0.jpg',
  'sunidhi-chauhan': 'https://cdn-images.dzcdn.net/images/artist/37dbd33ae8cf7075e247968acf4b48da/500x500-000000-80-0-0.jpg',
  'pritam': 'https://cdn-images.dzcdn.net/images/artist/d4914ccd414067cd5e2c108867079a85/500x500-000000-80-0-0.jpg',
  'kishore-kumar': 'https://cdn-images.dzcdn.net/images/artist/5972263348ad902e29a4749e748ff452/500x500-000000-80-0-0.jpg',
  'lata-mangeshkar': 'https://cdn-images.dzcdn.net/images/artist/837d46f90f541736e07817f463317c80/500x500-000000-80-0-0.jpg',
  'k-j-yesudas': 'https://cdn-images.dzcdn.net/images/artist/b42a9228338e4e3792e51bcad5e14cb9/500x500-000000-80-0-0.jpg',
  'sushin-shyam': 'https://cdn-images.dzcdn.net/images/artist/6ba914ca28d2c5cc21dc3effa07c690d/500x500-000000-80-0-0.jpg',
  'yuvan-shankar-raja': 'https://cdn-images.dzcdn.net/images/artist/1dbf7d81a2e964d9c707e53478407974/500x500-000000-80-0-0.jpg',
  'harris-jayaraj': 'https://cdn-images.dzcdn.net/images/artist/b10caf45eae518a2b16997874ded7143/500x500-000000-80-0-0.jpg',
  'santhosh-narayanan': 'https://cdn-images.dzcdn.net/images/artist/74004fed94dddf9ae2d7c83084eaf1ad/500x500-000000-80-0-0.jpg',
};

async function fetchWithTimeout(url: string, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(id);
    return null;
  }
}

/**
 * Searches iTunes for an artist's full discography and populates the database
 * with album records, authentic cover artwork, and song tracklists.
 */
export async function ensureArtistDiscography(artistId: number, minAlbums = 3): Promise<void> {
  const artist = db.select().from(artists).where(eq(artists.id, artistId)).get();
  if (!artist) return;

  // Check how many albums exist for this artist
  const existingCount = db
    .select({ count: sql<number>`count(*)` })
    .from(albums)
    .where(eq(albums.artistId, artistId))
    .get()?.count ?? 0;

  if (existingCount >= minAlbums) {
    // Check if existing albums have missing tracks
    const albumsWithoutTracks = db
      .select({ id: albums.id, title: albums.title })
      .from(albums)
      .where(and(eq(albums.artistId, artistId), eq(albums.trackCount, 0)))
      .all();

    if (albumsWithoutTracks.length === 0) {
      return;
    }
  }

  const now = Math.floor(Date.now() / 1000);

  // If artist image is missing or a placeholder, update with verified or Deezer image
  if (
    !artist.imageUrl ||
    artist.imageUrl.includes(PLACEHOLDER_AVATAR_HASH) ||
    artist.imageUrl.includes('abd95cd3882021d0f16006cc391f993c') ||
    artist.imageUrl.includes('/artist//')
  ) {
    const verified = VERIFIED_ARTIST_PHOTOS[artist.slug];
    if (verified) {
      db.update(artists).set({ imageUrl: verified }).where(eq(artists.id, artistId)).run();
    } else {
      const deezerArtist = await fetchWithTimeout(
        `https://api.deezer.com/search/artist?q=${encodeURIComponent(artist.name)}`
      );
      if (deezerArtist?.data && deezerArtist.data.length > 0) {
        const pic = deezerArtist.data[0].picture_big || deezerArtist.data[0].picture_medium;
        if (pic) {
          db.update(artists).set({ imageUrl: pic }).where(eq(artists.id, artistId)).run();
        }
      }
    }
  }

  // Fetch albums from iTunes
  const itunesData = await fetchWithTimeout(
    `https://itunes.apple.com/search?term=${encodeURIComponent(artist.name)}&entity=album&limit=50`
  );

  if (!itunesData?.results || itunesData.results.length === 0) return;

  // Deduplicate and filter albums belonging to this artist
  const lowerArtistName = artist.name.toLowerCase();
  const seenTitles = new Set<string>();

  for (const item of itunesData.results) {
    if (!item.collectionName) continue;
    const itemArtist = (item.artistName || '').toLowerCase();
    
    // Check if artist matches closely
    if (!itemArtist.includes(lowerArtistName) && !lowerArtistName.includes(itemArtist)) {
      continue;
    }

    // Clean title for deduplication (strip '(Deluxe Edition)', '(Remastered)', etc.)
    const cleanTitle = item.collectionName
      .replace(/\s*\((Deluxe|Remastered|Bonus Track|Special|Anniversary|Expanded|Live)[^)]*\)/gi, '')
      .replace(/\s*-\s*(Deluxe|Remastered|Bonus Track|Special|Anniversary|Expanded|Live)[^-]*/gi, '')
      .trim();

    const titleKey = cleanTitle.toLowerCase();
    if (seenTitles.has(titleKey)) continue;
    seenTitles.add(titleKey);

    const year = item.releaseDate ? item.releaseDate.substring(0, 4) : '';
    let albumSlug = slugify(cleanTitle, { lower: true, strict: true });
    if (!albumSlug) {
      albumSlug = `album-${item.collectionId}`;
    }

    // Determine album type
    let albumType: 'album' | 'ep' | 'single' | 'compilation' = 'album';
    const cNameLower = item.collectionName.toLowerCase();
    if (cNameLower.includes('- single') || cNameLower.includes('(single)')) {
      albumType = 'single';
    } else if (cNameLower.includes('- ep') || cNameLower.includes('(ep)')) {
      albumType = 'ep';
    } else if (cNameLower.includes('greatest hits') || cNameLower.includes('best of') || cNameLower.includes('anthology')) {
      albumType = 'compilation';
    }

    const coverUrl = item.artworkUrl100
      ? item.artworkUrl100.replace('100x100bb', '600x600bb')
      : null;
    const releaseDate = item.releaseDate ? item.releaseDate.substring(0, 10) : null;
    const trackCount = item.trackCount || 0;

    // Check if album already exists
    let existingAlb = db.select().from(albums).where(eq(albums.slug, albumSlug)).get();
    let currentAlbumId: number;

    if (!existingAlb) {
      try {
        const inserted = db
          .insert(albums)
          .values({
            title: cleanTitle,
            slug: albumSlug,
            artistId,
            releaseDate,
            albumType,
            coverUrl,
            label: item.copyright || null,
            trackCount,
            createdAt: now,
          })
          .returning({ id: albums.id })
          .get();

        currentAlbumId = inserted.id;

        // Add to albumArtists junction
        db.insert(albumArtists)
          .values({ albumId: currentAlbumId, artistId, role: 'primary' })
          .onConflictDoNothing()
          .run();
      } catch {
        // If unique slug collided, disambiguate with year or collectionId
        albumSlug = `${albumSlug}-${year || item.collectionId}`;
        const inserted = db
          .insert(albums)
          .values({
            title: cleanTitle,
            slug: albumSlug,
            artistId,
            releaseDate,
            albumType,
            coverUrl,
            label: item.copyright || null,
            trackCount,
            createdAt: now,
          })
          .returning({ id: albums.id })
          .get();

        currentAlbumId = inserted.id;
        db.insert(albumArtists)
          .values({ albumId: currentAlbumId, artistId, role: 'primary' })
          .onConflictDoNothing()
          .run();
      }
    } else {
      currentAlbumId = existingAlb.id;
      // Update coverUrl if existing is null or low-res
      if (!existingAlb.coverUrl && coverUrl) {
        db.update(albums).set({ coverUrl }).where(eq(albums.id, currentAlbumId)).run();
      }
    }

    // Lookup and import tracks for this album if not yet populated
    const existingTrackCount = db
      .select({ count: sql<number>`count(*)` })
      .from(tracks)
      .where(eq(tracks.albumId, currentAlbumId))
      .get()?.count ?? 0;

    if (existingTrackCount === 0 && item.collectionId) {
      const lookupData = await fetchWithTimeout(
        `https://itunes.apple.com/lookup?id=${item.collectionId}&entity=song`
      );

      if (lookupData?.results) {
        const songItems = lookupData.results.filter(
          (x: any) => x.wrapperType === 'track' && x.trackName
        );

        let totalRuntime = 0;

        for (const s of songItems) {
          const trackSlug = slugify(`${s.trackName}-${s.trackNumber}`, { lower: true, strict: true }) || `track-${s.trackId}`;
          const durationSeconds = s.trackTimeMillis ? Math.round(s.trackTimeMillis / 1000) : 0;
          totalRuntime += durationSeconds;

          db.insert(tracks)
            .values({
              title: s.trackName,
              slug: trackSlug,
              albumId: currentAlbumId,
              artistId,
              trackNumber: s.trackNumber || 1,
              discNumber: s.discNumber || 1,
              durationSeconds,
              explicit: s.trackExplicitness === 'explicit' ? 1 : 0,
              createdAt: now,
            })
            .onConflictDoNothing()
            .run();
        }

        if (songItems.length > 0) {
          db.update(albums)
            .set({
              trackCount: songItems.length,
              runtimeSeconds: totalRuntime > 0 ? totalRuntime : null,
            })
            .where(eq(albums.id, currentAlbumId))
            .run();
        }
      }
    }
  }
}

/**
 * Searches Deezer and iTunes for an artist by name, imports them with complete
 * discography, genuine cover artwork, and song tracks.
 */
export async function searchAndImportArtist(query: string): Promise<number | null> {
  const cleanQ = query.trim();
  if (cleanQ.length < 2) return null;

  const now = Math.floor(Date.now() / 1000);

  // 1. Search Deezer for artist
  const deezerData = await fetchWithTimeout(
    `https://api.deezer.com/search/artist?q=${encodeURIComponent(cleanQ)}`
  );

  if (!deezerData?.data || deezerData.data.length === 0) return null;

  // Find exact or closest match
  const lowerQ = cleanQ.toLowerCase();
  const matchedArtist =
    deezerData.data.find((a: any) => a.name.toLowerCase() === lowerQ) ||
    deezerData.data.find((a: any) => a.name.toLowerCase().includes(lowerQ)) ||
    deezerData.data[0];

  const artistName = matchedArtist.name;
  const artistSlug = slugify(artistName, { lower: true, strict: true }) || `artist-${matchedArtist.id}`;
  
  let imageUrl = matchedArtist.picture_big || matchedArtist.picture_medium || null;
  if (VERIFIED_ARTIST_PHOTOS[artistSlug]) {
    imageUrl = VERIFIED_ARTIST_PHOTOS[artistSlug];
  }

  let artistRecord = db.select().from(artists).where(eq(artists.slug, artistSlug)).get();
  let artistId: number;

  if (!artistRecord) {
    const inserted = db
      .insert(artists)
      .values({
        name: artistName,
        slug: artistSlug,
        bio: `${artistName} is a celebrated musician cataloged on Overtone. Explore their complete discography, albums, ratings, and track details.`,
        imageUrl,
        createdAt: now,
      })
      .returning({ id: artists.id })
      .get();

    artistId = inserted.id;
  } else {
    artistId = artistRecord.id;
    if ((!artistRecord.imageUrl || artistRecord.imageUrl.includes(PLACEHOLDER_AVATAR_HASH)) && imageUrl) {
      db.update(artists).set({ imageUrl }).where(eq(artists.id, artistId)).run();
    }
  }

  // 2. Fetch full discography
  await ensureArtistDiscography(artistId, 5);

  return artistId;
}
