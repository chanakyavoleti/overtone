import { NormalizedArtist, NormalizedAlbum } from '../types';
import { classifyAlbumType } from '../normalization';
import slugify from 'slugify';

export const DEEZER_PLACEHOLDER_HASH = 'c9d19c4bba2c1605876c762729974916';

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

export function isValidDeezerPhoto(url?: string | null): boolean {
  if (!url) return false;
  if (url.includes('/artist//')) return false;
  if (url.includes(DEEZER_PLACEHOLDER_HASH)) return false;
  if (url.includes('abd95cd3882021d0f16006cc391f993c')) return false;
  return true;
}

/**
 * Searches Deezer for artists matching a query.
 */
export async function searchDeezerArtists(query: string, limit = 15): Promise<NormalizedArtist[]> {
  const cleanQ = query.trim();
  if (cleanQ.length < 1) return [];

  const url = `https://api.deezer.com/search/artist?q=${encodeURIComponent(cleanQ)}&limit=${limit}`;
  const data = await fetchWithTimeout(url);

  if (!data?.data) return [];

  return data.data.map((item: any) => {
    let pic = item.picture_xl || item.picture_big || item.picture_medium || null;
    if (!isValidDeezerPhoto(pic)) {
      pic = null;
    }

    const slug = slugify(item.name, { lower: true, strict: true }) || `artist-${item.id}`;

    return {
      provider: 'deezer',
      providerId: item.id,
      name: item.name,
      slug,
      imageUrl: pic,
    };
  });
}

/**
 * Fetches albums for a Deezer artist with multi-page pagination support.
 */
export async function fetchDeezerDiscography(
  deezerArtistId: string | number,
  maxPages = 3
): Promise<NormalizedAlbum[]> {
  const albums: NormalizedAlbum[] = [];
  const seenIds = new Set<string>();

  let nextIndex = 0;
  const limit = 50;

  for (let page = 0; page < maxPages; page++) {
    const url = `https://api.deezer.com/artist/${deezerArtistId}/albums?limit=${limit}&index=${nextIndex}`;
    const data = await fetchWithTimeout(url);

    if (!data?.data || data.data.length === 0) break;

    for (const item of data.data) {
      const albId = String(item.id);
      if (seenIds.has(albId)) continue;
      seenIds.add(albId);

      const coverUrl = item.cover_xl || item.cover_big || item.cover_medium || null;
      const albumType = classifyAlbumType(item.title, item.record_type);
      const baseSlug = slugify(item.title, { lower: true, strict: true }) || `album-${albId}`;

      albums.push({
        provider: 'deezer',
        providerId: albId,
        title: item.title,
        slug: baseSlug,
        releaseDate: item.release_date || null,
        albumType,
        coverUrl,
        trackCount: item.nb_tracks || 0,
      });
    }

    if (!data.next || data.data.length < limit) break;
    nextIndex += limit;
  }

  return albums;
}
