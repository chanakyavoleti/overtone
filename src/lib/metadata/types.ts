export type ReleaseType = 'album' | 'ep' | 'single' | 'compilation' | 'soundtrack';

export interface NormalizedArtist {
  provider: 'local' | 'itunes' | 'deezer' | 'musicbrainz' | 'spotify';
  providerId?: string | number;
  name: string;
  slug: string;
  bio?: string | null;
  imageUrl?: string | null;
  country?: string | null;
  formedYear?: number | null;
  disbandedYear?: number | null;
  aliases?: string[];
  genres?: string[];
  matchScore?: number;
}

export interface NormalizedAlbum {
  provider: 'itunes' | 'deezer' | 'musicbrainz' | 'spotify' | 'local';
  providerId?: string | number;
  title: string;
  slug: string;
  artistId?: number;
  artistName?: string;
  releaseDate?: string | null;
  albumType: ReleaseType;
  coverUrl?: string | null;
  label?: string | null;
  trackCount: number;
  runtimeSeconds?: number | null;
  tracks?: NormalizedTrack[];
}

export interface NormalizedTrack {
  title: string;
  slug: string;
  trackNumber: number;
  discNumber: number;
  durationSeconds: number;
  explicit: boolean;
}

export interface EnrichmentStatus {
  artistId: number;
  status: 'pending' | 'in_progress' | 'complete' | 'failed' | 'partial';
  releasesDiscovered: number;
  releasesStored: number;
  releasesWithArtwork: number;
  releasesWithTracks: number;
  pagesProcessed: number;
  lastEnrichedAt: number;
  error?: string | null;
}
