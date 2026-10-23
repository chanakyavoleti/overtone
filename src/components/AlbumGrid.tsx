import Link from 'next/link';
import { Disc3 } from 'lucide-react';
import SafeImage from '@/components/ui/SafeImage';
import styles from './AlbumGrid.module.css';

export interface AlbumGridItem {
  id: number;
  title: string;
  slug: string;
  coverUrl?: string | null;
  artistName?: string | null;
  artistSlug?: string | null;
  releaseDate?: string | null;
  albumType?: string | null;
  score?: number | null;
  status?: 'owned' | 'wishlist' | 'listened' | string | null;
}

export interface AlbumGridProps {
  albums: AlbumGridItem[];
  emptyMessage?: string;
  showStatus?: boolean;
}

export default function AlbumGrid({
  albums,
  emptyMessage = 'No albums found.',
  showStatus = false,
}: AlbumGridProps) {
  if (!albums || albums.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Disc3 className={styles.emptyIcon} size={36} aria-hidden="true" />
        <h3 className={styles.emptyTitle}>Nothing here yet</h3>
        <p className={styles.emptyText}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className={styles.grid} role="list" aria-label="Album collection">
      {albums.map((album) => {
        const releaseYear = album.releaseDate
          ? album.releaseDate.slice(0, 4)
          : null;

        return (
          <li key={album.id} className={styles.card}>
            <div className={styles.coverContainer}>
              <SafeImage
                src={album.coverUrl}
                alt={`Cover artwork for ${album.title}`}
                className={styles.coverImage}
                fallback={
                  <div className={styles.coverPlaceholder} aria-hidden="true">
                    <Disc3 size={40} />
                  </div>
                }
              />

              {album.score !== undefined && album.score !== null && (
                <span className={styles.coverBadge} aria-label={`Score: ${album.score} out of 100`}>
                  {album.score}
                </span>
              )}

              {showStatus && album.status && (
                <span
                  className={`${styles.statusBadge} ${
                    album.status === 'owned'
                      ? styles.statusOwned
                      : album.status === 'wishlist'
                      ? styles.statusWishlist
                      : styles.statusListened
                  }`}
                >
                  {album.status}
                </span>
              )}
            </div>

            <div className={styles.info}>
              <Link href={`/album/${album.slug}`} className={styles.title} title={album.title}>
                {album.title}
              </Link>

              {album.artistName && (
                <Link
                  href={album.artistSlug ? `/artist/${album.artistSlug}` : `/search?q=${encodeURIComponent(album.artistName)}`}
                  className={styles.artist}
                  title={album.artistName}
                >
                  {album.artistName}
                </Link>
              )}

              <div className={styles.meta}>
                {releaseYear && <span>{releaseYear}</span>}
                {album.albumType && (
                  <span style={{ textTransform: 'capitalize' }}>{album.albumType}</span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
