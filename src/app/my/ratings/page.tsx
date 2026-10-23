import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth/actions';
import { db } from '@/lib/db';
import { ratings, albums, artists } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { formatDate } from '@/lib/utils';
import { Disc3, Compass } from 'lucide-react';
import styles from './page.module.css';
import { connection } from 'next/server';

export const metadata: Metadata = {
  title: 'My Ratings | Overtone',
  description: 'View and manage all music albums you have rated on Overtone.',
};

export default async function MyRatingsPage() {
  await connection();
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  // Fetch user ratings synchronously with better-sqlite3
  const userRatings = db
    .select({
      id: ratings.id,
      score: ratings.score,
      createdAt: ratings.createdAt,
      updatedAt: ratings.updatedAt,
      albumId: albums.id,
      albumTitle: albums.title,
      albumSlug: albums.slug,
      albumCover: albums.coverUrl,
      albumType: albums.albumType,
      releaseDate: albums.releaseDate,
      artistName: artists.name,
      artistSlug: artists.slug,
    })
    .from(ratings)
    .innerJoin(albums, eq(ratings.targetId, albums.id))
    .leftJoin(artists, eq(albums.artistId, artists.id))
    .where(and(eq(ratings.userId, user.id), eq(ratings.targetType, 'album')))
    .orderBy(desc(ratings.createdAt))
    .all();

  // Compute stats
  const totalCount = userRatings.length;
  const avgScore =
    totalCount > 0
      ? (userRatings.reduce((acc, curr) => acc + curr.score, 0) / totalCount).toFixed(1)
      : '—';
  const highestScore =
    totalCount > 0
      ? Math.max(...userRatings.map((r) => r.score))
      : '—';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>My Ratings</h1>
          <p className={styles.subtitle}>
            Your personal music ratings log and history
          </p>
        </div>
      </header>

      {/* Summary Stats */}
      <section className={styles.statsSummary} aria-label="Ratings statistics">
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Albums Rated</span>
          <span className={styles.statValue}>{totalCount}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Average Score</span>
          <span className={`${styles.statValue} ${styles.statRating}`}>{avgScore}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Highest Score</span>
          <span className={`${styles.statValue} ${styles.statRating}`}>{highestScore}</span>
        </div>
      </section>

      {/* Ratings List */}
      {totalCount === 0 ? (
        <div className={styles.emptyState}>
          <Disc3 className={styles.emptyIcon} size={48} aria-hidden="true" />
          <h2 className={styles.emptyTitle}>You haven&apos;t rated any albums yet</h2>
          <p className={styles.emptyText}>
            Explore albums in our catalog and rate them on a scale of 0 to 100 to build your music profile.
          </p>
          <Link href="/discover" className="btn btn-primary">
            <Compass size={16} /> Discover Music
          </Link>
        </div>
      ) : (
        <ul className={styles.ratingsList} role="list" aria-label="List of your rated albums">
          {userRatings.map((rating) => {
            const releaseYear = rating.releaseDate
              ? rating.releaseDate.slice(0, 4)
              : null;

            return (
              <li key={rating.id} className={styles.ratingRow}>
                <div className={styles.thumbContainer}>
                  {rating.albumCover ? (
                    <img
                      src={rating.albumCover}
                      alt={`Cover for ${rating.albumTitle}`}
                      className={styles.thumbImg}
                      loading="lazy"
                    />
                  ) : (
                    <div className={styles.thumbPlaceholder} aria-hidden="true">
                      <Disc3 size={28} />
                    </div>
                  )}
                </div>

                <div className={styles.albumInfo}>
                  <Link
                    href={`/album/${rating.albumSlug}`}
                    className={styles.albumTitle}
                    title={rating.albumTitle}
                  >
                    {rating.albumTitle}
                  </Link>
                  {rating.artistName && (
                    <Link
                      href={
                        rating.artistSlug
                          ? `/artist/${rating.artistSlug}`
                          : `/search?q=${encodeURIComponent(rating.artistName)}`
                      }
                      className={styles.artistName}
                      title={rating.artistName}
                    >
                      {rating.artistName}
                    </Link>
                  )}
                  <div className={styles.metaInfo}>
                    {releaseYear && <span>{releaseYear}</span>}
                    {rating.albumType && (
                      <span style={{ textTransform: 'capitalize' }}>
                        {rating.albumType}
                      </span>
                    )}
                    <span>Rated {formatDate(rating.createdAt)}</span>
                  </div>
                </div>

                <div className={styles.scoreWrapper}>
                  <span
                    className={styles.scoreBadge}
                    aria-label={`Score: ${rating.score} out of 100`}
                  >
                    {rating.score}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
