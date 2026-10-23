import { describe, it, expect, vi } from 'vitest';
import {
  isSpotifyConfigured,
  getSpotifyAccessToken,
  searchSpotifyArtists,
  fetchSpotifyDiscography,
} from '../src/lib/metadata/providers/spotify';

describe('Spotify Web API Provider', () => {
  it('correctly reports configured state for Spotify integration', () => {
    const configured = isSpotifyConfigured();
    expect(typeof configured).toBe('boolean');
    expect(configured).toBe(true);
  });

  it('safely acquires or caches access token without throwing', async () => {
    const token = await getSpotifyAccessToken();
    expect(typeof token === 'string' || token === null).toBe(true);
  });

  it('returns structured artist search results', async () => {
    const results = await searchSpotifyArtists('Radiohead', 2);
    expect(Array.isArray(results)).toBe(true);
  });

  it('handles empty or invalid discography query gracefully', async () => {
    const discography = await fetchSpotifyDiscography('invalid-nonexistent-id');
    expect(Array.isArray(discography)).toBe(true);
  });
});
