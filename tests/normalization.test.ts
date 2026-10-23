import { describe, it, expect } from 'vitest';
import {
  normalizeSearchQuery,
  expandQueryAliases,
  calculateArtistMatchScore,
  normalizeAlbumTitle,
  classifyAlbumType,
} from '../src/lib/metadata/normalization';

describe('Search Normalization', () => {
  it('normalizes diacritics, case, and whitespace', () => {
    expect(normalizeSearchQuery('  Björk  ')).toBe('bjork');
    expect(normalizeSearchQuery('Mötley Crüe')).toBe('motley crue');
    expect(normalizeSearchQuery('A. R.  Rahman')).toBe('a r rahman');
  });

  it('handles initials and punctuation consistently', () => {
    expect(normalizeSearchQuery('S.P.B.')).toBe('s p b');
    expect(normalizeSearchQuery('A.R. Rahman')).toBe('a r rahman');
    expect(normalizeSearchQuery('Devi Sri Prasad (DSP)')).toBe('devi sri prasad dsp');
  });

  it('expands known Indian artist aliases', () => {
    const spbAliases = expandQueryAliases('SPB');
    expect(spbAliases).toContain('S. P. Balasubrahmanyam');

    const arAliases = expandQueryAliases('AR Rahman');
    expect(arAliases).toContain('A. R. Rahman');

    const dspAliases = expandQueryAliases('DSP');
    expect(dspAliases).toContain('Devi Sri Prasad');

    const keeravaniAliases = expandQueryAliases('MM Keeravani');
    expect(keeravaniAliases).toContain('M. M. Keeravani');
  });

  it('correctly calculates ranking and match scores', () => {
    expect(calculateArtistMatchScore('Arijit Singh', 'Arijit Singh')).toBe(100);
    expect(calculateArtistMatchScore('SPB', 'S. P. Balasubrahmanyam')).toBeGreaterThanOrEqual(90);
    expect(calculateArtistMatchScore('AR Rahman', 'A. R. Rahman')).toBeGreaterThanOrEqual(90);
    expect(calculateArtistMatchScore('DSP', 'Devi Sri Prasad')).toBeGreaterThanOrEqual(90);
    expect(calculateArtistMatchScore('Ilayaraja', 'Ilaiyaraaja')).toBeGreaterThanOrEqual(90);
    expect(calculateArtistMatchScore('Random Query', 'The Beatles')).toBe(0);
  });

  it('tolerates misspellings and transliteration differences', () => {
    // Exact user examples from problem description
    expect(calculateArtistMatchScore('devi shree prasad', 'Devi Sri Prasad')).toBeGreaterThanOrEqual(80);
    expect(calculateArtistMatchScore('dsp', 'Devi Sri Prasad')).toBeGreaterThanOrEqual(90);
    expect(calculateArtistMatchScore('ar rehman', 'A. R. Rahman')).toBeGreaterThanOrEqual(80);
    expect(calculateArtistMatchScore('ilayaraja', 'Ilaiyaraaja')).toBeGreaterThanOrEqual(90);
    expect(calculateArtistMatchScore('spb', 'S. P. Balasubrahmanyam')).toBeGreaterThanOrEqual(90);
    expect(calculateArtistMatchScore('arjith singh', 'Arijit Singh')).toBeGreaterThanOrEqual(80);
    expect(calculateArtistMatchScore('anirudh', 'Anirudh Ravichander')).toBeGreaterThanOrEqual(80);
    expect(calculateArtistMatchScore('sid sriram', 'Sid Sriram')).toBeGreaterThanOrEqual(95);
    expect(calculateArtistMatchScore('shreya goshal', 'Shreya Ghoshal')).toBeGreaterThanOrEqual(80);

    // Safeguards: Short ambiguous queries should NOT match random artists
    expect(calculateArtistMatchScore('ar', 'Pink Floyd')).toBe(0);
    expect(calculateArtistMatchScore('sp', 'Radiohead')).toBe(0);
  });
});

describe('Album Classification and Title Normalization', () => {
  it('identifies Soundtracks and Film Scores accurately', () => {
    expect(classifyAlbumType('Roja (Original Motion Picture Soundtrack)')).toBe('soundtrack');
    expect(classifyAlbumType('Pushpa - The Rise (Soundtrack)')).toBe('soundtrack');
    expect(classifyAlbumType('Naatu Naatu (From "RRR") - Single')).toBe('soundtrack');
  });

  it('identifies EPs and Singles accurately', () => {
    expect(classifyAlbumType('Stay - Single', 'single', 1)).toBe('single');
    expect(classifyAlbumType('My Dear Melancholy,', 'ep', 6)).toBe('ep');
    expect(classifyAlbumType('Abbey Road', 'album', 17)).toBe('album');
    expect(classifyAlbumType('Greatest Hits', 'compilation')).toBe('compilation');
  });

  it('normalizes album titles for deduplication', () => {
    expect(normalizeAlbumTitle('Abbey Road (Remastered 2019)')).toBe('abbey road');
    expect(normalizeAlbumTitle('Currents (Deluxe Edition)')).toBe('currents');
    expect(normalizeAlbumTitle('OK Computer - 20th Anniversary Edition')).toBe('ok computer');
  });
});
