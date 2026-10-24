/**
 * Normalization utilities for music metadata search, artist matching,
 * and Indian regional transliterations.
 */

// Known alias and alternative spelling dictionary
export const KNOWN_ARTIST_ALIASES: Record<string, string[]> = {
  // Telugu & Multi-lingual
  'devi-sri-prasad': ['DSP', 'Devi Sriprasad', 'Devisri Prasad', 'Devi Sri Prasad', 'Devi Shree Prasad', 'Devi Sri'],
  'dsp': ['Devi Sri Prasad', 'Devi Sriprasad', 'DSP', 'Devi Shree Prasad'],
  's-p-balasubrahmanyam': [
    'SPB', 'S.P.B.', 'S. P. B.', 'SP Balu', 'S. P. Balasubramaniam', 'S. P. Balasubrahmanyam',
    'S.P. Balasubrahmanyam', 'SP Balasubrahmanyam', 'S P Balasubrahmanyam', 'S P Balasubramaniam',
    'ఎస్. పి. బాలసుబ్రహ్మణ్యం', 'எஸ். பி. பாலசுப்பிரமணியம்'
  ],
  'm-m-keeravani': [
    'MM Keeravani', 'M. M. Keeravani', 'M. M. Keeravaani', 'M.M. Keeravani', 'Marakathamani', 'M M Keeravani', 'Keeravani'
  ],
  'thaman-s': ['Thaman', 'S. Thaman', 'SS Thaman', 'S Thaman', 'Ghantasala Sai Srinivas Thaman', 'Thaman S'],
  'sid-sriram': ['Sid Sriram', 'Sidharth Sriram', 'Sid'],
  'ram-miriyala': ['Ram Miriyala'],

  // Tamil & Multi-lingual
  'a-r-rahman': [
    'AR Rahman', 'A. R. Rahman', 'A.R. Rahman', 'A R Rahman', 'AR Rehman', 'A.R. Rehman',
    'Alla Rakha Rahman', 'ஏ. ஆர். ரகுமான்', 'ए. आर. रहमान', 'Rahman'
  ],
  'ilaiyaraaja': [
    'Ilayaraja', 'Ilaiyaraaja', 'Ilaiyaraja', 'Illayaraja', 'Illaiyaraja',
    'Maestro Ilaiyaraaja', 'Isaignani', 'இளையராஜா'
  ],
  'harris-jayaraj': ['Harris Jayaraj', 'Harris Jeyaraj'],
  'yuvan-shankar-raja': ['Yuvan Shankar Raja', 'Yuvan', 'U1', 'YSR'],
  'd-imman': ['D. Imman', 'D Imman', 'Imman'],
  'santhosh-narayanan': ['Santhosh Narayanan', 'SaNa', 'Santhosh'],
  'vijay-antony': ['Vijay Antony'],
  'anirudh-ravichander': ['Anirudh', 'Anirudh Ravichander', 'Ani'],

  // Hindi / Bollywood
  'arijit-singh': ['Arijit Singh', 'Arjit Singh', 'Arjith Singh', 'Arijit', 'अरिजित सिंह'],
  'sonu-nigam': ['Sonu Nigam', 'Sonu Niigaam', 'Sonu'],
  'shreya-ghoshal': ['Shreya Ghoshal', 'Shreya Goshal', 'Shreya Ghosal', 'Shreya', 'श्रेया घोषाल'],
  'sunidhi-chauhan': ['Sunidhi Chauhan', 'Sunidhi'],
  'pritam': ['Pritam', 'Pritam Chakraborty'],
  'amit-trivedi': ['Amit Trivedi'],
  'vishal-shekhar': ['Vishal-Shekhar', 'Vishal & Shekhar', 'Vishal Dadlani & Shekhar Ravjiani'],
  'kishore-kumar': ['Kishore Kumar', 'Kishore', 'किशोर कुमार'],
  'lata-mangeshkar': ['Lata Mangeshkar', 'Lata', 'लता मंगेशकर'],

  // Malayalam
  'k-j-yesudas': ['K. J. Yesudas', 'K.J. Yesudas', 'KJ Yesudas', 'Yesudas', 'കെ.ജെ. യേശുദാസ്'],
  'k-s-chithra': ['K. S. Chithra', 'K.S. Chithra', 'KS Chithra', 'Chitra', 'K.S. Chitra', 'കെ.എസ്. ചിത്ര'],
  'm-g-sreekumar': ['M. G. Sreekumar', 'M.G. Sreekumar', 'MG Sreekumar'],
  'vidyasagar': ['Vidyasagar'],
  'gopi-sundar': ['Gopi Sundar', 'Gopi Sunder'],
  'sushin-shyam': ['Sushin Shyam'],
  'bijibal': ['Bijibal'],

  // Kannada
  'hamsalekha': ['Hamsalekha'],
  'arjun-janya': ['Arjun Janya'],
  'vijay-prakash': ['Vijay Prakash'],
  'charan-raj': ['Charan Raj'],
};

// Canonical slug mappings to merge duplicate aliases and spellings to authoritative profiles
export const CANONICAL_SLUG_MAP: Record<string, string> = {
  // Telugu
  'dsp': 'devi-sri-prasad',
  'devisri-prasad': 'devi-sri-prasad',
  'devi-sriprasad': 'devi-sri-prasad',
  'devi-shree-prasad': 'devi-sri-prasad',
  'spb': 's-p-balasubrahmanyam',
  'sp-balasubrahmanyam': 's-p-balasubrahmanyam',
  's-p-balasubramaniam': 's-p-balasubrahmanyam',
  'sp-balasubramaniam': 's-p-balasubrahmanyam',
  'bala-subramanyam': 's-p-balasubrahmanyam',
  'mm-keeravaani': 'mm-keeravani',
  'm-m-keeravani': 'mm-keeravani',
  'm-m-keeravaani': 'mm-keeravani',
  'keeravani': 'mm-keeravani',
  'thaman-s': 'thaman',
  's-thaman': 'thaman',
  'ss-thaman': 'thaman',

  // Tamil
  'ar-rahman': 'a-r-rahman',
  'a-r-rehman': 'a-r-rahman',
  'ar-rehman': 'a-r-rahman',
  'rahman': 'a-r-rahman',
  'anirudh': 'anirudh-ravichander',
  'ani': 'anirudh-ravichander',
  'ilayaraja': 'ilaiyaraaja',
  'illayaraja': 'ilaiyaraaja',
  'illaiyaraja': 'ilaiyaraaja',
  'yuvan': 'yuvan-shankar-raja',
  'sana': 'santhosh-narayanan',
  'imman': 'd-imman',

  // Hindi / Bollywood
  'arijit': 'arijit-singh',
  'arjit-singh': 'arijit-singh',
  'arjith-singh': 'arijit-singh',
  'shreya': 'shreya-ghoshal',
  'shreya-goshal': 'shreya-ghoshal',
  'shreya-ghosal': 'shreya-ghoshal',
  'sonu': 'sonu-nigam',
  'sunidhi': 'sunidhi-chauhan',
  'kishore': 'kishore-kumar',
  'lata': 'lata-mangeshkar',

  // Malayalam
  'kj-yesudas': 'k-j-yesudas',
  'yesudas': 'k-j-yesudas',
  'ks-chitra': 'ks-chithra',
  'k-s-chitra': 'ks-chithra',
  'k-s-chithra': 'ks-chithra',
  'chitra': 'ks-chithra',
  'chithra': 'ks-chithra',
};

/**
 * Resolves any alias, acronym, or alternate spelling slug into the canonical artist slug.
 */
export function resolveCanonicalSlug(slugOrAlias: string): string {
  const clean = (slugOrAlias || '').trim().toLowerCase();
  if (CANONICAL_SLUG_MAP[clean]) {
    return CANONICAL_SLUG_MAP[clean];
  }
  const cleanDash = clean.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (CANONICAL_SLUG_MAP[cleanDash]) {
    return CANONICAL_SLUG_MAP[cleanDash];
  }
  return cleanDash;
}

/**
 * Normalizes search text by trimming, lowercasing, converting Unicode
 * accents/diacritics, and collapsing spaces and special punctuation.
 */
export function normalizeSearchQuery(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[.\-_,':;!?"'()[\]{}|\\]/g, ' ') // convert punctuation to space
    .replace(/\s+/g, ' ') // collapse multiple spaces
    .trim()
    .toLowerCase();
}

/**
 * Resolves a query to known canonical aliases or search variations.
 */
export function expandQueryAliases(query: string): string[] {
  const normalized = normalizeSearchQuery(query);
  const results = new Set<string>();
  results.add(query.trim());

  for (const [canonicalSlug, aliases] of Object.entries(KNOWN_ARTIST_ALIASES)) {
    const normCanonical = normalizeSearchQuery(canonicalSlug);
    const normAliases = aliases.map(normalizeSearchQuery);

    if (normCanonical === normalized || normAliases.includes(normalized)) {
      results.add(canonicalSlug.replace(/-/g, ' '));
      aliases.forEach(a => results.add(a));
    }
  }

  return Array.from(results);
}

/**
 * Computes the Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], prev, row[j]) + 1;
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }

  return row[b.length];
}

/**
 * Normalizes phonetic variations common in Indian and international transliterations
 * (e.g. shree -> sri, rehman -> rahman, arjith -> arijit, goshal -> ghoshal).
 */
export function phoneticNormalize(text: string): string {
  const norm = normalizeSearchQuery(text);
  return norm
    .replace(/\bshree\b|\bshri\b/g, 'sri')
    .replace(/\brehman\b/g, 'rahman')
    .replace(/\bgoshal\b|\bghosal\b/g, 'ghoshal')
    .replace(/\bchitra\b/g, 'chithra')
    .replace(/\barjith\b|\barjit\b/g, 'arijit')
    .replace(/\bsunder\b/g, 'sundar')
    .replace(/\bilayaraja\b|\billayaraja\b/g, 'ilaiyaraaja')
    .replace(/\byuvanshankar\b/g, 'yuvan shankar')
    .replace(/\bbalasubramaniam\b|\bbalasubramanyam\b/g, 'balasubrahmanyam')
    .replace(/\bee/g, 'i')
    .replace(/\boo/g, 'u');
}

/**
 * Calculates a match score between a user search query and an artist name.
 * Higher score indicates better relevance (0 to 100).
 * Implements typo-tolerant matching while strictly safeguarding short ambiguous queries.
 */
export function calculateArtistMatchScore(query: string, artistName: string, aliases: string[] = []): number {
  const normQ = normalizeSearchQuery(query);
  const normArtist = normalizeSearchQuery(artistName);

  if (!normQ || !normArtist) return 0;

  // 1. Exact match
  if (normArtist === normQ) return 100;

  // 2. Exact alias match
  for (const alias of aliases) {
    if (normalizeSearchQuery(alias) === normQ) return 98;
  }

  // Check known aliases dictionary
  for (const [slug, aliasList] of Object.entries(KNOWN_ARTIST_ALIASES)) {
    const nSlug = normalizeSearchQuery(slug);
    const nList = aliasList.map(normalizeSearchQuery);

    if ((normArtist === nSlug || nList.includes(normArtist)) && (nSlug === normQ || nList.includes(normQ))) {
      return 95;
    }
  }

  // 3. Phonetic match (e.g. "devi shree prasad" vs "devi sri prasad", "ar rehman" vs "ar rahman")
  const phonQ = phoneticNormalize(query);
  const phonArtist = phoneticNormalize(artistName);
  if (phonQ === phonArtist) return 94;

  for (const alias of aliases) {
    if (phoneticNormalize(alias) === phonQ) return 93;
  }
  for (const [, aliasList] of Object.entries(KNOWN_ARTIST_ALIASES)) {
    const pList = aliasList.map(phoneticNormalize);
    if (pList.includes(phonArtist) && pList.includes(phonQ)) {
      return 93;
    }
  }

  // 4. Query matches initials (e.g. "spb" matches "s p balasubrahmanyam", "dsp" matches "devi sri prasad")
  const initials = normArtist
    .split(/\s+/)
    .map(w => w[0])
    .join('');
  if (initials === normQ.replace(/\s+/g, '')) return 92;

  // 5. Short query safety guard:
  // If query is <= 2 characters (e.g. "ar", "sp"), do NOT apply aggressive fuzzy matching.
  // Only permit strict prefix match if artist name starts with it.
  if (normQ.length <= 2) {
    if (normArtist.startsWith(normQ + ' ') || normArtist === normQ) return 85;
    return 0;
  }

  // 6. Artist name starts with query
  if (normArtist.startsWith(normQ)) return 86;

  // 7. Query starts with artist name
  if (normQ.startsWith(normArtist)) return 82;

  // 8. Word-level exact matching (e.g. query "anirudh" matches "anirudh ravichander")
  const qWords = normQ.split(/\s+/).filter(w => w.length > 1);
  const aWords = normArtist.split(/\s+/).filter(w => w.length > 1);

  if (qWords.length === 1 && aWords.includes(qWords[0])) {
    return 84;
  }

  // 9. Typo-tolerant Levenshtein fuzzy matching
  // Dynamic threshold based on length
  const maxDistance = normQ.length <= 4 ? 1 : normQ.length <= 8 ? 2 : 3;
  const fullDistance = levenshteinDistance(normQ, normArtist);
  if (fullDistance <= maxDistance) {
    return Math.max(70, 90 - fullDistance * 6);
  }

  // Phonetic Levenshtein
  const phonDistance = levenshteinDistance(phonQ, phonArtist);
  if (phonDistance <= maxDistance) {
    return Math.max(70, 88 - phonDistance * 6);
  }

  // Multi-word typo matching (e.g. "devi shree prasad" vs "devi sri prasad")
  if (qWords.length > 1 && aWords.length > 1 && Math.abs(qWords.length - aWords.length) <= 1) {
    let wordMatches = 0;
    for (const qw of qWords) {
      if (aWords.some(aw => aw === qw || levenshteinDistance(qw, aw) <= (qw.length <= 4 ? 1 : 2))) {
        wordMatches++;
      }
    }
    if (wordMatches === qWords.length) {
      return 85;
    }
    if (wordMatches >= qWords.length - 1 && wordMatches >= 2) {
      return 75;
    }
  }

  // 10. Substring match
  if (normArtist.includes(normQ)) return 70;

  // 11. Partial token overlap
  const matchedWords = qWords.filter(qw => aWords.some(aw => aw.includes(qw) || qw.includes(aw)));
  if (matchedWords.length > 0) {
    return Math.round(50 + (matchedWords.length / qWords.length) * 25);
  }

  return 0;
}

/**
 * Normalizes an album title for deduplication (e.g. removing remaster/deluxe suffixes).
 */
export function normalizeAlbumTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/\s*\(?(Original Motion Picture Soundtrack|Soundtrack|OST|From "[^"]*")\)?/gi, '')
    .replace(/\s*\(?(Deluxe|Remastered|Bonus Track|Special|\d+(?:st|nd|rd|th)?\s*Anniversary|Expanded|Live|Collector's|Edition|Mix)[^)]*\)?/gi, '')
    .replace(/\s*-\s*(\d+(?:st|nd|rd|th)?\s*Anniversary|Deluxe|Remastered|Bonus Track|Special|Anniversary|Expanded|Live)[^-]*/gi, '')
    .replace(/[.\-_,':;!?"'()[\]{}|\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Determines whether an album is a Soundtrack, EP, Single, Compilation, or Studio Album.
 */
export function classifyAlbumType(
  title: string,
  rawType?: string,
  trackCount?: number
): 'album' | 'ep' | 'single' | 'compilation' | 'soundtrack' {
  const lower = (title || '').toLowerCase();
  const rawLower = (rawType || '').toLowerCase();

  if (
    /\b(soundtrack|ost|motion picture|original score|score from|music from)\b/i.test(lower) ||
    lower.includes('soundtrack') ||
    lower.includes('original motion picture') ||
    lower.includes('from "') ||
    lower.includes('(from ') ||
    rawLower.includes('soundtrack')
  ) {
    return 'soundtrack';
  }

  if (
    lower.includes('- single') ||
    lower.includes('(single)') ||
    lower.includes('single version') ||
    rawLower === 'single' ||
    (trackCount !== undefined && trackCount <= 2 && !lower.includes('ep'))
  ) {
    return 'single';
  }

  if (
    lower.includes('- ep') ||
    lower.includes('(ep)') ||
    rawLower === 'ep' ||
    (trackCount !== undefined && trackCount >= 3 && trackCount <= 6)
  ) {
    return 'ep';
  }

  if (
    lower.includes('greatest hits') ||
    lower.includes('best of') ||
    lower.includes('anthology') ||
    lower.includes('collection') ||
    lower.includes('the essential') ||
    lower.includes('discography') ||
    rawLower === 'compilation'
  ) {
    return 'compilation';
  }

  return 'album';
}
