import Link from 'next/link';
import { Disc3 } from 'lucide-react';
import SafeImage from '@/components/ui/SafeImage';
import styles from './AlbumCard.module.css';

interface AlbumCardProps {
  slug: string;
  title: string;
  artistName: string;
  coverUrl?: string | null;
  releaseDate?: string | null;
  albumType?: string;
  avgRating?: number | null;
  ratingCount?: number;
}

function scoreToDisplay(score: number): string {
  return (score / 10).toFixed(1);
}

function getYear(date?: string | null): string {
  if (!date) return '';
  return date.substring(0, 4);
}

export default function AlbumCard({
  slug,
  title,
  artistName,
  coverUrl,
  releaseDate,
  albumType,
  avgRating,
  ratingCount,
}: AlbumCardProps) {
  const year = getYear(releaseDate);

  return (
    <Link href={`/music/${slug}`} className={styles.card}>
      <div className={styles.artworkWrapper}>
        <SafeImage
          src={coverUrl}
          alt={`${title} by ${artistName}`}
          className={styles.artwork}
          fallback={
            <div className={styles.artworkFallback}>
              <Disc3 size={32} className={styles.artworkFallbackIcon} aria-hidden="true" />
            </div>
          }
        />
        {avgRating !== null && avgRating !== undefined && ratingCount && ratingCount > 0 && (
          <span className={styles.ratingOverlay}>
            {scoreToDisplay(avgRating)}
          </span>
        )}
      </div>
      <div className={styles.info}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.artist}>{artistName}</p>
        <div className={styles.meta}>
          {year && <span className={styles.year}>{year}</span>}
          {albumType && albumType !== 'album' && (
            <span className={styles.type}>{albumType}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* Grid wrapper component */
export function AlbumGrid({
  children,
  columns = 5,
}: {
  children: React.ReactNode;
  columns?: 4 | 5 | 6;
}) {
  const gridClass =
    columns === 4
      ? styles.grid4
      : columns === 6
        ? styles.grid6
        : styles.grid5;

  return <div className={`${styles.grid} ${gridClass}`}>{children}</div>;
}

/* Compact list item */
export function AlbumListItem({
  slug,
  title,
  artistName,
  coverUrl,
  avgRating,
}: {
  slug: string;
  title: string;
  artistName: string;
  coverUrl?: string | null;
  avgRating?: number | null;
}) {
  return (
    <Link href={`/music/${slug}`} className={styles.listItem}>
      {coverUrl ? (
        <img
          src={coverUrl}
          alt=""
          className={styles.listArtwork}
          loading="lazy"
        />
      ) : (
        <div className={styles.listArtwork} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Disc3 size={20} style={{ opacity: 0.3, color: 'var(--color-text-tertiary)' }} aria-hidden="true" />
        </div>
      )}
      <div className={styles.listInfo}>
        <span className={styles.listTitle}>{title}</span>
        <span className={styles.listArtist}>{artistName}</span>
      </div>
      {avgRating !== null && avgRating !== undefined && (
        <span className={styles.listRating}>{scoreToDisplay(avgRating)}</span>
      )}
    </Link>
  );
}
