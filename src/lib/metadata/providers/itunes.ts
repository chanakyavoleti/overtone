import { NormalizedArtist, NormalizedAlbum, NormalizedTrack } from '../types';
import { classifyAlbumType } from '../normalization';
import slugify from 'slugify';

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
 * Searches iTunes for artists across both India (IN) and Global (US) storefronts.
 */
export async function searchITunesArtists(query: string, limit = 20): Promise<NormalizedArtist[]> {
  const cleanQ = query.trim();
  if (cleanQ.length < 1) return [];

  const results: NormalizedArtist[] = [];
  const seenIds = new Set<number>();

  // Query both Indian storefront (for regional/film music) and US storefront
  const [dataIN, dataUS] = await Promise.all([
    fetchWithTimeout(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanQ)}&entity=musicArtist&country=IN&limit=15`),
    fetchWithTimeout(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanQ)}&entity=musicArtist&country=US&limit=10`),
  ]);

  const items = [...(dataIN?.results || []), ...(dataUS?.results || [])];

  for (const item of items) {
    if (!item.artistId || seenIds.has(item.artistId) || !item.artistName) continue;
    seenIds.add(item.artistId);

    const slug = slugify(item.artistName, { lower: true, strict: true }) || `artist-${item.artistId}`;

    results.push({
      provider: 'itunes',
      providerId: item.artistId,
      name: item.artistName,
      slug,
      country: item.primaryGenreName?.includes('Indian') || item.primaryGenreName?.includes('Tamil') || item.primaryGenreName?.includes('Telugu') || item.primaryGenreName?.includes('Bollywood') ? 'India' : null,
      genres: item.primaryGenreName ? [item.primaryGenreName] : [],
    });
  }

  return results;
}

/**
 * Retrieves albums for an artist from iTunes using direct artistId lookup and search fallback.
 * Supports multi-store (IN + US) and retrieves up to 200 albums per store.
 */
export async function fetchITunesDiscography(
  artistName: string,
  itunesArtistId?: string | number
): Promise<NormalizedAlbum[]> {
  const albums: NormalizedAlbum[] = [];
  const seenIds = new Set<string>();

  const storeUrls: string[] = [];

  let resolvedId = itunesArtistId;
  if (!resolvedId) {
    const artistLookup = await fetchWithTimeout(
      `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=musicArtist&limit=1`
    );
    if (artistLookup?.results?.[0]?.artistId) {
      resolvedId = artistLookup.results[0].artistId;
    }
  }

  if (resolvedId) {
    storeUrls.push(`https://itunes.apple.com/lookup?id=${resolvedId}&entity=album&country=IN&limit=200`);
    storeUrls.push(`https://itunes.apple.com/lookup?id=${resolvedId}&entity=album&country=US&limit=200`);
  }

  // Also include keyword search to catch soundtracks, collaborations, and compilations
  storeUrls.push(`https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=album&country=IN&limit=200`);
  storeUrls.push(`https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=album&country=US&limit=200`);

  const responses = await Promise.all(storeUrls.map(url => fetchWithTimeout(url)));

  const lowerName = artistName.toLowerCase();

  for (const data of responses) {
    if (!data?.results) continue;

    for (const item of data.results) {
      if (item.wrapperType !== 'collection' || !item.collectionId || !item.collectionName) continue;

      const collId = String(item.collectionId);
      if (seenIds.has(collId)) continue;
      seenIds.add(collId);

      // Verify artist credit roughly matches (or item is a soundtrack with matching artistName)
      const itemArtist = (item.artistName || '').toLowerCase();
      const isMatch = itemArtist.includes(lowerName) || lowerName.includes(itemArtist);

      // Clean coverUrl to high-res 600x600
      const coverUrl = item.artworkUrl100
        ? item.artworkUrl100.replace('100x100bb', '600x600bb')
        : null;

      const releaseDate = item.releaseDate ? item.releaseDate.substring(0, 10) : null;
      const albumType = classifyAlbumType(item.collectionName, item.collectionType, item.trackCount);

      const baseSlug = slugify(item.collectionName, { lower: true, strict: true }) || `album-${collId}`;

      albums.push({
        provider: 'itunes',
        providerId: collId,
        title: item.collectionName,
        slug: baseSlug,
        artistName: item.artistName || artistName,
        releaseDate,
        albumType,
        coverUrl,
        label: item.copyright || null,
        trackCount: item.trackCount || 0,
      });
    }
  }

  return albums;
}

/**
 * Retrieves tracklist for an iTunes collectionId.
 */
export async function fetchITunesTracks(collectionId: string | number): Promise<NormalizedTrack[]> {
  const url = `https://itunes.apple.com/lookup?id=${collectionId}&entity=song&country=IN`;
  const data = await fetchWithTimeout(url);

  if (!data?.results) return [];

  const songItems = data.results.filter(
    (x: any) => x.wrapperType === 'track' && x.trackName
  );

  return songItems.map((s: any) => ({
    title: s.trackName,
    slug: slugify(`${s.trackName}-${s.trackNumber}`, { lower: true, strict: true }) || `track-${s.trackId}`,
    trackNumber: s.trackNumber || 1,
    discNumber: s.discNumber || 1,
    durationSeconds: s.trackTimeMillis ? Math.round(s.trackTimeMillis / 1000) : 0,
    explicit: s.trackExplicitness === 'explicit',
  }));
}
