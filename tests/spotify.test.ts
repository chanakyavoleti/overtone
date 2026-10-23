import { describe, it, expect, vi } from 'vitest';
import {
  isSpotifyConfigured,
  getSpotifyAccessToken,
  searchSpotifyArtists,
  fetchSpotifyDiscography,
} from '../src/lib/metadata/providers/spotify';

describe('Spotify Web API Provider', () => {
  it('correctly reports unconfigured state when credentials are not set', () => {
    // In default environment without SPOTIFY_CLIENT_ID, it should be false
    const configured = isSpotifyConfigured();
    expect(configured).toBe(false);
  });

  it('safely handles token requests when unconfigured without throwing', async () => {
    const token = await getSpotifyAccessToken();
    expect(token).toBeNull();
  });

  it('returns empty artist search results gracefully when unconfigured', async () => {
    const results = await searchSpotifyArtists('Radiohead');
    expect(results).toEqual([]);
  });

  it('returns empty discography gracefully when unconfigured', async () => {
    const discography = await fetchSpotifyDiscography('test-artist-id');
    expect(discography).toEqual([]);
  });
});
