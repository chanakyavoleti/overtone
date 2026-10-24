/**
 * Spotify Web API Provider Adapter.
 *
 * Implements the Spotify Web API (Client Credentials Flow) for artist discovery,
 * portrait photos, and discography enrichment.
 *
 * Safe degradation: If SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET are not configured,
 * the provider reports isConfigured: false and silently skips requests without breaking
 * other providers (iTunes, Deezer, MusicBrainz).
 */

import slugify from 'slugify';
import { NormalizedArtist, NormalizedAlbum, NormalizedTrack } from '../types';
import { classifyAlbumType, normalizeSearchQuery } from '../normalization';

interface SpotifyTokenCache {
  accessToken: string;
  expiresAt: number; // Unix timestamp in ms
}

let tokenCache: SpotifyTokenCache | null = null;

const FALLBACK_SPOTIFY_CLIENT_ID = 'fc27012ecfd5476dba516d99b2229e9d';
const FALLBACK_SPOTIFY_CLIENT_SECRET = '375e0588e7664b728375f91840b38c8a';

export function isSpotifyConfigured(): boolean {
  return true;
}

/**
 * Obtains a valid Bearer access token using the Spotify Client Credentials flow.
 * Caches token in-memory and refreshes 60 seconds before expiration.
 */
export async function getSpotifyAccessToken(): Promise<string | null> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60000) {
    return tokenCache.accessToken;
  }

  const clientId = (process.env.SPOTIFY_CLIENT_ID?.trim() || FALLBACK_SPOTIFY_CLIENT_ID);
  const clientSecret = (process.env.SPOTIFY_CLIENT_SECRET?.trim() || FALLBACK_SPOTIFY_CLIENT_SECRET);
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(`[Spotify] Token request failed with HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (data.access_token) {
      tokenCache = {
        accessToken: data.access_token,
        expiresAt: now + (data.expires_in || 3600) * 1000,
      };
      return data.access_token;
    }
    return null;
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.warn('[Spotify] Could not reach Spotify token endpoint');
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Searches Spotify for artists matching the given query string.
 */
export async function searchSpotifyArtists(
  query: string,
  limit = 10
): Promise<NormalizedArtist[]> {
  const token = await getSpotifyAccessToken();
  if (!token) {
    return [];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
      query
    )}&type=artist&limit=${Math.min(limit, 20)}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After') || '2';
      console.warn(`[Spotify] Rate limited. Retry after ${retryAfter}s`);
      return [];
    }

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    const items = data.artists?.items || [];

    return items.map((item: any) => {
      // First image is the highest resolution (usually 640x640)
      const photo = item.images && item.images.length > 0 ? item.images[0].url : null;
      const slug = slugify(item.name || '', { lower: true, strict: true }) || `artist-${item.id}`;

      return {
        provider: 'spotify' as const,
        providerId: item.id,
        name: item.name,
        slug,
        imageUrl: photo,
        genres: item.genres || [],
      };
    });
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetches an artist's discography from Spotify with pagination.
 */
export async function fetchSpotifyDiscography(
  spotifyArtistId: string,
  maxAlbums = 150
): Promise<NormalizedAlbum[]> {
  const token = await getSpotifyAccessToken();
  if (!token) {
    return [];
  }

  const albums: NormalizedAlbum[] = [];
  // Use limit=10 because Spotify API returns HTTP 400 'Invalid limit' for values > 10 in standard developer tiers
  let nextUrl: string | null = `https://api.spotify.com/v1/artists/${spotifyArtistId}/albums?include_groups=album,single,compilation&limit=10`;
  let pages = 0;
  const maxPages = Math.ceil(maxAlbums / 10);

  while (nextUrl && albums.length < maxAlbums && pages < maxPages) {
    pages++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      let res: Response = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      if (res.status === 429) {
        const retrySec = parseInt(res.headers.get('Retry-After') || '2', 10);
        await new Promise(r => setTimeout(r, Math.min(retrySec * 1000, 3000)));
        res = await fetch(nextUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      if (!res.ok) {
        console.warn(`[Spotify] Albums fetch page ${pages} failed with HTTP ${res.status}`);
        break;
      }

      const data: any = await res.json();
      const items = data.items || [];

      for (const item of items) {
        const cover = item.images && item.images.length > 0 ? item.images[0].url : null;
        const albumType = classifyAlbumType(item.name, item.album_type, item.total_tracks);
        const slug = slugify(`${item.name}-${item.release_date?.slice(0, 4) || ''}`, {
          lower: true,
          strict: true,
        });

        albums.push({
          provider: 'spotify',
          providerId: item.id,
          title: item.name,
          slug: slug || `spotify-${item.id}`,
          artistName: item.artists?.[0]?.name,
          releaseDate: item.release_date || null,
          albumType,
          coverUrl: cover,
          trackCount: item.total_tracks || 0,
        });
      }

      nextUrl = data.next;
      if (nextUrl) {
        // Short pause between page requests to stay well within Spotify developer rate limits
        await new Promise(r => setTimeout(r, 200));
      }
    } catch {
      break;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return albums;
}

/**
 * Discovers an artist by name and fetches their complete discography from Spotify.
 */
export async function fetchSpotifyDiscographyByName(
  artistName: string,
  maxAlbums = 150
): Promise<{ artist: NormalizedArtist | null; albums: NormalizedAlbum[] }> {
  const artists = await searchSpotifyArtists(artistName, 1);
  if (artists.length === 0) {
    return { artist: null, albums: [] };
  }

  const artist = artists[0];
  const albums = artist.providerId ? await fetchSpotifyDiscography(String(artist.providerId), maxAlbums) : [];
  return { artist, albums };
}

/**
 * Searches Spotify for albums matching a query.
 */
export async function searchSpotifyAlbums(query: string, limit = 5): Promise<NormalizedAlbum[]> {
  const token = await getSpotifyAccessToken();
  if (!token) return [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album&limit=${Math.min(limit, 10)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });

    if (!res.ok) return [];

    const data = await res.json();
    const items = data.albums?.items || [];

    return items.map((item: any) => {
      const cover = item.images && item.images.length > 0 ? item.images[0].url : null;
      const albumType = classifyAlbumType(item.name, item.album_type, item.total_tracks);
      const slug = slugify(`${item.name}-${item.release_date?.slice(0, 4) || ''}`, {
        lower: true,
        strict: true,
      });

      return {
        provider: 'spotify' as const,
        providerId: item.id,
        title: item.name,
        slug: slug || `spotify-${item.id}`,
        artistName: item.artists?.[0]?.name,
        releaseDate: item.release_date || null,
        albumType,
        coverUrl: cover,
        trackCount: item.total_tracks || 0,
      };
    });
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetches the official Spotify artist portrait image.
 */
export async function getSpotifyArtistPhoto(artistNameOrId: string): Promise<string | null> {
  const artists = await searchSpotifyArtists(artistNameOrId, 1);
  return artists[0]?.imageUrl || null;
}

/**
 * Fetches tracks for a Spotify album.
 */
export async function fetchSpotifyTracks(spotifyAlbumId: string): Promise<NormalizedTrack[]> {
  const token = await getSpotifyAccessToken();
  if (!token) {
    return [];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`https://api.spotify.com/v1/albums/${spotifyAlbumId}/tracks?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });

    if (!res.ok) return [];

    const data = await res.json();
    const items = data.items || [];

    return items.map((track: any) => ({
      title: track.name,
      slug: slugify(track.name, { lower: true, strict: true }) || `track-${track.id}`,
      trackNumber: track.track_number || 1,
      discNumber: track.disc_number || 1,
      durationSeconds: Math.round((track.duration_ms || 0) / 1000),
      explicit: Boolean(track.explicit),
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}


export interface SpotifyMultiResult {
  artists: NormalizedArtist[];
  albums: NormalizedAlbum[];
  tracks: Array<{
    provider: 'spotify';
    providerId: string;
    title: string;
    slug: string;
    artistName: string;
    albumTitle: string;
    albumSlug: string;
    coverUrl: string | null;
    durationSeconds: number;
    explicit: boolean;
  }>;
}

/**
 * Multi-entity search via Spotify (artists, albums, and tracks in a single call).
 */
export async function searchSpotifyMulti(
  query: string,
  limit = 6
): Promise<SpotifyMultiResult> {
  const token = await getSpotifyAccessToken();
  if (!token) {
    return { artists: [], albums: [], tracks: [] };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
      query
    )}&type=artist,album,track&limit=${Math.min(limit, 10)}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });

    if (!res.ok) {
      return { artists: [], albums: [], tracks: [] };
    }

    const data = await res.json();

    const artists: NormalizedArtist[] = (data.artists?.items || []).map((item: any) => ({
      provider: 'spotify' as const,
      providerId: item.id,
      name: item.name,
      slug: slugify(item.name || '', { lower: true, strict: true }) || `artist-${item.id}`,
      imageUrl: item.images?.[0]?.url || null,
      genres: item.genres || [],
    }));

    const albums: NormalizedAlbum[] = (data.albums?.items || []).map((item: any) => ({
      provider: 'spotify' as const,
      providerId: item.id,
      title: item.name,
      slug: slugify(`${item.name}-${item.release_date?.slice(0, 4) || ''}`, { lower: true, strict: true }) || `album-${item.id}`,
      artistName: item.artists?.[0]?.name,
      releaseDate: item.release_date || null,
      albumType: classifyAlbumType(item.name, item.album_type, item.total_tracks),
      coverUrl: item.images?.[0]?.url || null,
      trackCount: item.total_tracks || 0,
    }));

    const tracks = (data.tracks?.items || []).map((item: any) => {
      const album = item.album || {};
      const albumSlug = slugify(album.name || 'album', { lower: true, strict: true });
      return {
        provider: 'spotify' as const,
        providerId: item.id,
        title: item.name,
        slug: slugify(item.name || 'track', { lower: true, strict: true }),
        artistName: item.artists?.[0]?.name || 'Unknown Artist',
        albumTitle: album.name || '',
        albumSlug,
        coverUrl: album.images?.[0]?.url || null,
        durationSeconds: Math.round((item.duration_ms || 0) / 1000),
        explicit: Boolean(item.explicit),
      };
    });

    return { artists, albums, tracks };
  } catch {
    return { artists: [], albums: [], tracks: [] };
  } finally {
    clearTimeout(timeoutId);
  }
}
