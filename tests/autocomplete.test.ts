import { describe, it, expect } from 'vitest';
import {
  calculateArtistMatchScore,
  phoneticNormalize,
  levenshteinDistance,
  expandQueryAliases,
} from '../src/lib/metadata/normalization';

describe('Typo-Tolerant Autocomplete & Match Scoring', () => {
  it('correctly calculates Levenshtein distance', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    expect(levenshteinDistance('rahman', 'rehman')).toBe(1);
    expect(levenshteinDistance('arijit', 'arjith')).toBe(2);
    expect(levenshteinDistance('prasad', 'prasad')).toBe(0);
  });

  it('normalizes common Indian and international transliteration variants', () => {
    expect(phoneticNormalize('devi shree prasad')).toBe('devi sri prasad');
    expect(phoneticNormalize('ar rehman')).toBe('ar rahman');
    expect(phoneticNormalize('arjith singh')).toBe('arijit singh');
    expect(phoneticNormalize('shreya goshal')).toBe('shreya ghoshal');
    expect(phoneticNormalize('ilayaraja')).toBe('ilaiyaraaja');
  });

  it('matches all specified user test cases with high score (>=80)', () => {
    const testCases: Array<[string, string]> = [
      ['devi shree prasad', 'Devi Sri Prasad'],
      ['dsp', 'Devi Sri Prasad'],
      ['ar rehman', 'A. R. Rahman'],
      ['ilayaraja', 'Ilaiyaraaja'],
      ['spb', 'S. P. Balasubrahmanyam'],
      ['arjith singh', 'Arijit Singh'],
      ['anirudh', 'Anirudh Ravichander'],
      ['sid sriram', 'Sid Sriram'],
      ['shreya goshal', 'Shreya Ghoshal'],
    ];

    for (const [query, targetName] of testCases) {
      const score = calculateArtistMatchScore(query, targetName);
      expect(score, `Query "${query}" matching "${targetName}"`).toBeGreaterThanOrEqual(80);
    }
  });

  it('protects short ambiguous queries from aggressive fuzzy matching', () => {
    // 2-character queries should only match exact or clean prefix
    expect(calculateArtistMatchScore('ar', 'Pink Floyd')).toBe(0);
    expect(calculateArtistMatchScore('sp', 'Metallica')).toBe(0);
    expect(calculateArtistMatchScore('ds', 'Nirvana')).toBe(0);

    // But should match when the artist's first word starts with that exact prefix
    expect(calculateArtistMatchScore('ar', 'AR Rahman')).toBeGreaterThanOrEqual(85);
  });
});
