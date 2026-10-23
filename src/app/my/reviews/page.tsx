import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth/actions';
import { db } from '@/lib/db';
import { reviews, albums, artists, ratings } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { formatDate } from '@/lib/utils';
import { BookOpen, Disc3, ArrowRight, Compass } from 'lucide-react';
import styles from './page.module.css';
import { connection } from 'next/server';

export const metadata: Metadata = {
  title: 'My Reviews | Overtone',
  description: 'Manage and review all music album reviews you have published on Overtone.',
};

export default async function MyReviewsPage() {
  await connection();
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  // Fetch reviews synchronously with better-sqlite3
  const userReviews = db
    .select({
      id: reviews.id,
      title: reviews.title,
      body: reviews.body,
      createdAt: reviews.createdAt,
      updatedAt: reviews.updatedAt,
      albumId: albums.id,
      albumTitle: albums.title,
      albumSlug: albums.slug,
      albumCover: albums.coverUrl,
      releaseDate: albums.releaseDate,
      artistName: artists.name,
      artistSlug: artists.slug,
      score: ratings.score,
    })
    .from(reviews)
    .innerJoin(albums, eq(reviews.targetId, albums.id))
    .leftJoin(artists, eq(albums.artistId, artists.id))
    .leftJoin(ratings, eq(reviews.ratingId, ratings.id))
    .where(and(eq(reviews.userId, user.id), eq(reviews.targetType, 'album')))
    .orderBy(desc(reviews.createdAt))
    .all();

  const totalReviews = userReviews.length;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>My Reviews</h1>
        <p className={styles.subtitle}>
          Your thoughts, deep-dives, and track-by-track impressions
        </p>
        <span className={styles.countBadge}>
          {totalReviews} {totalReviews === 1 ? 'review written' : 'reviews written'}
        </span>
      </header>

      {totalReviews === 0 ? (
        <div className={styles.emptyState}>
          <BookOpen className={styles.emptyIcon} size={48} aria-hidden="true" />
          <h2 className={styles.emptyTitle}>You haven&apos;t written any reviews yet</h2>
          <p className={styles.emptyText}>
            Share your analysis and opinions with the community. Find an album you love (or dislike) and write your first review.
          </p>
          <Link href="/discover" className="btn btn-primary">
            <Compass size={16} /> Explore Music Catalog
          </Link>
        </div>
      ) : (
        <ul className={styles.reviewsList} role="list" aria-label="Your published reviews">
          {userReviews.map((review) => {
            const releaseYear = review.releaseDate
              ? review.releaseDate.slice(0, 4)
              : null;

            return (
              <li key={review.id} className={styles.reviewCard}>
                <div className={styles.albumSidebar}>
                  <div className={styles.albumCoverWrapper}>
                    {review.albumCover ? (
                      <img
                        src={review.albumCover}
                        alt={`Cover artwork for ${review.albumTitle}`}
                        className={styles.albumCover}
                        loading="lazy"
                      />
                    ) : (
                      <div className={styles.albumCoverPlaceholder} aria-hidden="true">
                        <Disc3 size={32} />
                      </div>
                    )}
                  </div>
                  <div className={styles.albumMeta}>
                    <Link
                      href={`/album/${review.albumSlug}`}
                      className={styles.albumTitle}
                      title={review.albumTitle}
                    >
                      {review.albumTitle}
                    </Link>
                    {review.artistName && (
                      <Link
                        href={
                          review.artistSlug
                            ? `/artist/${review.artistSlug}`
                            : `/search?q=${encodeURIComponent(review.artistName)}`
                        }
                        className={styles.artistName}
                        title={review.artistName}
                      >
                        {review.artistName}
                      </Link>
                    )}
                    {releaseYear && (
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                        ({releaseYear})
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.reviewMain}>
                  <div className={styles.reviewHeader}>
                    {review.score !== null && review.score !== undefined ? (
                      <span
                        className={styles.scoreBadge}
                        aria-label={`Score: ${review.score} out of 100`}
                      >
                        {review.score} / 100
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className={styles.reviewDate}>
                      Published {formatDate(review.createdAt)}
                    </span>
                  </div>

                  {review.title && (
                    <h2 className={styles.reviewTitle}>{review.title}</h2>
                  )}

                  <p className={styles.reviewBody}>{review.body}</p>

                  <div className={styles.reviewFooter}>
                    <Link
                      href={`/album/${review.albumSlug}`}
                      className={styles.viewLink}
                    >
                      View Album Page <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
