import { NormalizedArtist } from '../types';
import slugify from 'slugify';

async function fetchWithTimeout(url: string, timeoutMs = 6000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'OvertoneMusicPlatform/1.0.0 ( contact@overtone.local )',
        Accept: 'application/json',
      },
    });
    clearTimeout(id);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(id);
    return null;
  }
}

/**
 * Searches MusicBrainz for artist information and alias expansion.
 */
export async function searchMusicBrainzArtists(query: string): Promise<NormalizedArtist[]> {
  const cleanQ = query.trim();
  if (cleanQ.length < 2) return [];

  const url = `https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(cleanQ)}&fmt=json&limit=5`;
  const data = await fetchWithTimeout(url);

  if (!data?.artists) return [];

  return data.artists.map((item: any) => {
    const aliases = (item.aliases || []).map((a: any) => a.name).filter(Boolean);
    const slug = slugify(item.name, { lower: true, strict: true }) || `artist-${item.id}`;

    let formedYear: number | null = null;
    if (item['life-span']?.begin) {
      const yr = parseInt(item['life-span'].begin.substring(0, 4), 10);
      if (!isNaN(yr)) formedYear = yr;
    }

    return {
      provider: 'musicbrainz',
      providerId: item.id,
      name: item.name,
      slug,
      country: item.country || (item.area?.name === 'India' ? 'India' : null),
      formedYear,
      aliases,
    };
  });
}
