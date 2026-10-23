import Link from 'next/link';
import { User, Globe } from 'lucide-react';
import SafeImage from '@/components/ui/SafeImage';
import styles from './ArtistCard.module.css';

export interface ArtistCardProps {
  slug: string;
  name: string;
  imageUrl?: string | null;
  country?: string | null;
  formedYear?: number | null;
  disbandedYear?: number | null;
  avgRating?: number | null;
  ratingCount?: number | null;
}

function scoreToDisplay(score: number): string {
  return (score / 10).toFixed(1);
}

export default function ArtistCard({
  slug,
  name,
  imageUrl,
  country,
  formedYear,
  disbandedYear,
  avgRating,
  ratingCount,
}: ArtistCardProps) {
  const initial = name ? name.trim().charAt(0).toUpperCase() : '?';

  let yearsText = '';
  if (formedYear) {
    if (disbandedYear) {
      yearsText = `${formedYear}–${disbandedYear}`;
    } else {
      yearsText = `${formedYear}–present`;
    }
  }

  return (
    <Link href={`/artists/${slug}`} className={styles.card} aria-label={`View artist profile for ${name}`}>
      <div className={styles.avatarWrapper}>
        <SafeImage
          src={imageUrl}
          alt={name}
          className={styles.avatarImage}
          fallback={
            <div className={styles.avatarFallback} aria-hidden="true">
              <span className={styles.avatarInitial}>{initial}</span>
            </div>
          }
        />
        {avgRating !== null && avgRating !== undefined && ratingCount !== undefined && ratingCount !== null && ratingCount > 0 && (
          <span className={styles.ratingBadge} title={`Average Rating: ${scoreToDisplay(avgRating)}/10 from ${ratingCount} ratings`}>
            ★ {scoreToDisplay(avgRating)}
          </span>
        )}
      </div>

      <div className={styles.info}>
        <h3 className={styles.name}>{name}</h3>
        {country && (
          <p className={styles.country}>
            <Globe size={13} className={styles.metaIcon} aria-hidden="true" />
            <span>{country}</span>
          </p>
        )}
        {yearsText && !country && (
          <p className={styles.years}>{yearsText}</p>
        )}
      </div>
    </Link>
  );
}

export function ArtistGrid({
  children,
  columns = 5,
}: {
  children: React.ReactNode;
  columns?: 3 | 4 | 5 | 6;
}) {
  const colClass =
    columns === 3
      ? styles.grid3
      : columns === 4
      ? styles.grid4
      : columns === 6
      ? styles.grid6
      : styles.grid5;

  return <div className={`${styles.grid} ${colClass}`}>{children}</div>;
}
