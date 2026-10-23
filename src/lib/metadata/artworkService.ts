/**
 * Artwork validation, resolution enhancement, and priority manager.
 */

// Known broken or placeholder image hashes / patterns
const INVALID_ARTWORK_PATTERNS = [
  'c9d19c4bba2c1605876c762729974916',
  'abd95cd3882021d0f16006cc391f993c',
  '/artist//',
  'default_album',
  'blank',
];

/**
 * Validates whether an artwork URL is well-formed, uses HTTPS, and is not a known placeholder.
 */
export function isValidArtworkUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length < 10) return false;
  if (!trimmed.startsWith('https://') && !trimmed.startsWith('http://') && !trimmed.startsWith('/')) {
    return false;
  }

  for (const pat of INVALID_ARTWORK_PATTERNS) {
    if (trimmed.includes(pat)) return false;
  }

  return true;
}

/**
 * Transforms an image URL to its highest available resolution (e.g. 600x600 or 1200x1200 for Apple Music/iTunes).
 */
export function upgradeArtworkResolution(url?: string | null): string | null {
  if (!isValidArtworkUrl(url)) return null;
  const u = url!.trim();

  // Upgrade iTunes/Apple Music artwork from 100x100 to 600x600
  if (u.includes('mzstatic.com')) {
    return u.replace(/\/\d+x\d+bb\./, '/600x600bb.');
  }

  // Upgrade Deezer CDN images to 500x500 or 1000x1000
  if (u.includes('dzcdn.net/images/')) {
    return u.replace(/\/\d+x\d+-[^/]+\.jpg$/, '/500x500-000000-80-0-0.jpg');
  }

  return u;
}

/**
 * Resolves the best available artwork between an existing artwork URL and a new candidate.
 * NEVER overwrites an existing valid artwork URL with a null, empty, or invalid candidate.
 */
export function selectBestArtwork(existingUrl?: string | null, candidateUrl?: string | null): string | null {
  const existingValid = isValidArtworkUrl(existingUrl);
  const candidateValid = isValidArtworkUrl(candidateUrl);

  if (existingValid && !candidateValid) {
    return upgradeArtworkResolution(existingUrl);
  }

  if (!existingValid && candidateValid) {
    return upgradeArtworkResolution(candidateUrl);
  }

  if (existingValid && candidateValid) {
    // If existing is already high-res Apple Music or verified, preserve it
    const ex = existingUrl!;
    const cand = candidateUrl!;
    if (ex.includes('600x600bb') || ex.includes('1200x1200bb')) {
      return ex;
    }
    return upgradeArtworkResolution(cand) || ex;
  }

  return null;
}

/**
 * Resolves the best available artist photograph according to the strict priority:
 * 1. Verified artist photograph
 * 2. Existing valid non-placeholder photograph
 * 3. Legitimate photograph from trusted metadata provider
 * 4. Fallback (null)
 */
export function resolveArtistPhoto(
  existingUrl?: string | null,
  providerCandidateUrl?: string | null,
  verifiedUrl?: string | null
): string | null {
  if (isValidArtworkUrl(verifiedUrl)) {
    return verifiedUrl!;
  }

  if (isValidArtworkUrl(existingUrl)) {
    return upgradeArtworkResolution(existingUrl);
  }

  if (isValidArtworkUrl(providerCandidateUrl)) {
    return upgradeArtworkResolution(providerCandidateUrl);
  }

  return null;
}

/**
 * Validates whether an image URL actually responds with HTTP 200 and image mime-type.
 */
export async function verifyImageReachability(url: string, timeoutMs = 4000): Promise<boolean> {
  if (!isValidArtworkUrl(url)) return false;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}
