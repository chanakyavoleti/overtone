import { describe, it, expect } from 'vitest';
import {
  isValidArtworkUrl,
  upgradeArtworkResolution,
  selectBestArtwork,
  resolveArtistPhoto,
} from '../src/lib/metadata/artworkService';

describe('Artwork Service', () => {
  it('detects invalid or placeholder artwork URLs', () => {
    expect(isValidArtworkUrl(null)).toBe(false);
    expect(isValidArtworkUrl('')).toBe(false);
    expect(isValidArtworkUrl('https://example.com/artist//500x500.jpg')).toBe(false);
    expect(isValidArtworkUrl('https://cdn-images.dzcdn.net/images/artist/c9d19c4bba2c1605876c762729974916/500x500-000000-80-0-0.jpg')).toBe(false);
    expect(isValidArtworkUrl('https://cdn-images.dzcdn.net/images/artist/abd95cd3882021d0f16006cc391f993c/500x500-000000-80-0-0.jpg')).toBe(false);
  });

  it('validates genuine artwork URLs', () => {
    expect(isValidArtworkUrl('https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/0c/a2/a4/0ca2a492.jpg/600x600bb.jpg')).toBe(true);
    expect(isValidArtworkUrl('https://cdn-images.dzcdn.net/images/artist/bd34315ef977a62a9e28c1ab19bb8ac4/500x500-000000-80-0-0.jpg')).toBe(true);
  });

  it('upgrades Apple Music image resolution from 100x100 to 600x600', () => {
    const raw = 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/10/a5/ce/10a5ce23.jpg/100x100bb.jpg';
    const upgraded = upgradeArtworkResolution(raw);
    expect(upgraded).toBe('https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/10/a5/ce/10a5ce23.jpg/600x600bb.jpg');
  });

  it('never overwrites existing valid artwork with an invalid or null candidate', () => {
    const validExisting = 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/10/a5/ce/10a5ce23.jpg/600x600bb.jpg';
    expect(selectBestArtwork(validExisting, null)).toBe(validExisting);
    expect(selectBestArtwork(validExisting, '')).toBe(validExisting);
    expect(selectBestArtwork(validExisting, 'https://cdn-images.dzcdn.net/images/artist/c9d19c4bba2c1605876c762729974916/500x500.jpg')).toBe(validExisting);
  });

  it('selects new valid candidate when existing artwork is missing', () => {
    const candidate = 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/10/a5/ce/10a5ce23.jpg/100x100bb.jpg';
    const result = selectBestArtwork(null, candidate);
    expect(result).toBe('https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/10/a5/ce/10a5ce23.jpg/600x600bb.jpg');
  });

  it('correctly resolves artist photographs with strict priority', () => {
    const verified = 'https://upload.wikimedia.org/wikipedia/commons/verified.jpg';
    const existing = 'https://cdn-images.dzcdn.net/images/artist/existing/500x500.jpg';
    const candidate = 'https://cdn-images.dzcdn.net/images/artist/candidate/500x500.jpg';

    // Priority 1: Verified overrides existing and candidate
    expect(selectBestArtwork(null, null)).toBeNull();

    // Priority 2: Existing valid overrides candidate
    expect(resolveArtistPhoto(existing, candidate, verified)).toBe(verified);
    expect(resolveArtistPhoto(existing, candidate, null)).toBe(existing);
    expect(resolveArtistPhoto(null, candidate, null)).toBe(candidate);
    expect(resolveArtistPhoto(null, null, null)).toBeNull();
  });
});
