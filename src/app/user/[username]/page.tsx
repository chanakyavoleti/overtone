import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { connection } from 'next/server';
import { db } from '@/lib/db';
import { users, ratings, reviews, lists, albums, artists, listItems } from '@/lib/db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { formatDate, getInitials } from '@/lib/utils';
import { Calendar, Star, BookOpen, ListMusic, Disc3 } from 'lucide-react';
import styles from './page.module.css';

interface UserProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: UserProfilePageProps): Promise<Metadata> {
  await connection();
  const { username } = await params;
  const user = db
    .select({
      displayName: users.displayName,
      username: users.username,
      bio: users.bio,
    })
    .from(users)
    .where(eq(users.username, username))
    .get();

  if (!user) {
    return { title: 'User Not Found | Overtone' };
  }

  const title = user.displayName || user.username;
  return {
    title: `${title} (@${user.username}) | Overtone`,
    description: user.bio || `Explore ${title}'s music ratings, reviews, and curated lists on Overtone.`,
  };
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  await connection();
  const { username } = await params;

  // 1. Fetch user (No password/email exposed!)
  const user = db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      bio: users.bio,
      avatarUrl: users.avatarUrl,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.username, username))
    .get();

  if (!user) {
    notFound();
  }

  // 2. Fetch stats
  const ratingsCount = db
    .select({ count: count() })
    .from(ratings)
    .where(eq(ratings.userId, user.id))
    .get()?.count ?? 0;

  const reviewsCount = db
    .select({ count: count() })
    .from(reviews)
    .where(eq(reviews.userId, user.id))
    .get()?.count ?? 0;

  const listsCount = db
    .select({ count: count() })
    .from(lists)
    .where(and(eq(lists.userId, user.id), eq(lists.isPublic, 1)))
    .get()?.count ?? 0;

  // 3. Fetch recent public ratings (recent 10)
  const recentRatings = db
    .select({
      id: ratings.id,
      score: ratings.score,
      createdAt: ratings.createdAt,
      albumId: albums.id,
      albumTitle: albums.title,
      albumSlug: albums.slug,
      albumCover: albums.coverUrl,
      artistName: artists.name,
      artistSlug: artists.slug,
    })
    .from(ratings)
    .innerJoin(albums, eq(ratings.targetId, albums.id))
    .leftJoin(artists, eq(albums.artistId, artists.id))
    .where(and(eq(ratings.userId, user.id), eq(ratings.targetType, 'album')))
    .orderBy(desc(ratings.createdAt))
    .limit(10)
    .all();

  // 4. Fetch recent public reviews (recent 5)
  const recentReviews = db
    .select({
      id: reviews.id,
      title: reviews.title,
      body: reviews.body,
      createdAt: reviews.createdAt,
      albumId: albums.id,
      albumTitle: albums.title,
      albumSlug: albums.slug,
      albumCover: albums.coverUrl,
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
    .limit(5)
    .all();

  // 5. Fetch public lists
  const publicLists = db
    .select({
      id: lists.id,
      title: lists.title,
      description: lists.description,
      createdAt: lists.createdAt,
      updatedAt: lists.updatedAt,
      itemCount: count(listItems.id),
    })
    .from(lists)
    .leftJoin(listItems, eq(lists.id, listItems.listId))
    .where(and(eq(lists.userId, user.id), eq(lists.isPublic, 1)))
    .groupBy(lists.id)
    .orderBy(desc(lists.updatedAt))
    .all();

  const initials = getInitials(user.displayName || user.username);

  return (
    <div className={styles.container}>
      {/* User Profile Header */}
      <header className={styles.profileHeader}>
        <div className={styles.avatarWrapper}>
          <div className={styles.avatar}>
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={`${user.displayName || user.username}'s avatar`}
                className={styles.avatarImage}
              />
            ) : (
              <span aria-hidden="true">{initials}</span>
            )}
          </div>
        </div>

        <div className={styles.profileInfo}>
          <div className={styles.nameRow}>
            <h1 className={styles.displayName}>
              {user.displayName || user.username}
            </h1>
            <span className={styles.username}>@{user.username}</span>

            {user.role === 'admin' && (
              <span className={`${styles.roleBadge} ${styles.roleAdmin}`}>
                Admin
              </span>
            )}
            {user.role === 'moderator' && (
              <span className={`${styles.roleBadge} ${styles.roleMod}`}>
                Moderator
              </span>
            )}
          </div>

          {user.bio ? (
            <p className={styles.bio}>{user.bio}</p>
          ) : (
            <p className={styles.bio} style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
              No bio provided yet.
            </p>
          )}

          <div className={styles.profileMeta}>
            <span className={styles.metaItem}>
              <Calendar size={15} aria-hidden="true" />
              <span>Joined {formatDate(user.createdAt)}</span>
            </span>
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      <section className={styles.statsRow} aria-label="User statistics">
        <div className={styles.statCard}>
          <div className={styles.statIcon} aria-hidden="true">
            <Star size={20} />
          </div>
          <div>
            <div className={styles.statValue}>{ratingsCount}</div>
            <div className={styles.statLabel}>Ratings</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} aria-hidden="true">
            <BookOpen size={20} />
          </div>
          <div>
            <div className={styles.statValue}>{reviewsCount}</div>
            <div className={styles.statLabel}>Reviews</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} aria-hidden="true">
            <ListMusic size={20} />
          </div>
          <div>
            <div className={styles.statValue}>{listsCount}</div>
            <div className={styles.statLabel}>Public Lists</div>
          </div>
        </div>
      </section>

      {/* Recent Ratings Section */}
      <section className={styles.section} aria-labelledby="ratings-heading">
        <div className={styles.sectionHeader}>
          <h2 id="ratings-heading" className={styles.sectionTitle}>
            Recent Ratings
          </h2>
          <span className={styles.sectionCount}>
            Showing {recentRatings.length} of {ratingsCount}
          </span>
        </div>

        {recentRatings.length === 0 ? (
          <div className={styles.emptyState}>No ratings yet.</div>
        ) : (
          <ul className={styles.ratingsGrid} role="list">
            {recentRatings.map((rating) => (
              <li key={rating.id} className={styles.ratingCard}>
                <div className={styles.coverContainer}>
                  {rating.albumCover ? (
                    <img
                      src={rating.albumCover}
                      alt={`Artwork for ${rating.albumTitle}`}
                      className={styles.coverImg}
                      loading="lazy"
                    />
                  ) : (
                    <div className={styles.coverPlaceholder} aria-hidden="true">
                      <Disc3 size={36} />
                    </div>
                  )}
                  <span
                    className={styles.scoreBadge}
                    aria-label={`Score: ${rating.score} out of 100`}
                  >
                    {rating.score}
                  </span>
                </div>
                <div className={styles.ratingCardInfo}>
                  <Link
                    href={`/album/${rating.albumSlug}`}
                    className={styles.albumLink}
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
                      className={styles.artistLink}
                      title={rating.artistName}
                    >
                      {rating.artistName}
                    </Link>
                  )}
                  <span className={styles.ratingDate}>
                    Rated {formatDate(rating.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent Reviews Section */}
      <section className={styles.section} aria-labelledby="reviews-heading">
        <div className={styles.sectionHeader}>
          <h2 id="reviews-heading" className={styles.sectionTitle}>
            Recent Reviews
          </h2>
          <span className={styles.sectionCount}>
            Showing {recentReviews.length} of {reviewsCount}
          </span>
        </div>

        {recentReviews.length === 0 ? (
          <div className={styles.emptyState}>No reviews yet.</div>
        ) : (
          <ul className={styles.reviewsList} role="list">
            {recentReviews.map((review) => (
              <li key={review.id} className={styles.reviewCard}>
                {review.albumCover ? (
                  <img
                    src={review.albumCover}
                    alt={`Cover for ${review.albumTitle}`}
                    className={styles.reviewThumb}
                    loading="lazy"
                  />
                ) : (
                  <div className={styles.reviewThumbPlaceholder} aria-hidden="true">
                    <Disc3 size={24} />
                  </div>
                )}
                <div className={styles.reviewContent}>
                  <div className={styles.reviewHeader}>
                    <div>
                      <Link
                        href={`/album/${review.albumSlug}`}
                        className={styles.reviewTarget}
                      >
                        {review.albumTitle}
                      </Link>
                      {review.artistName && (
                        <span style={{ color: 'var(--color-text-secondary)', marginLeft: 'var(--space-2)' }}>
                          by {review.artistName}
                        </span>
                      )}
                    </div>
                    {review.score !== null && review.score !== undefined && (
                      <span className={styles.reviewScoreBadge}>
                        {review.score} / 100
                      </span>
                    )}
                  </div>

                  {review.title && (
                    <h3 className={styles.reviewTitle}>{review.title}</h3>
                  )}

                  <p className={styles.reviewBody}>{review.body}</p>

                  <div className={styles.reviewDate}>
                    Reviewed on {formatDate(review.createdAt)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Public Lists Section */}
      <section className={styles.section} aria-labelledby="lists-heading">
        <div className={styles.sectionHeader}>
          <h2 id="lists-heading" className={styles.sectionTitle}>
            Public Lists
          </h2>
          <span className={styles.sectionCount}>
            {publicLists.length} {publicLists.length === 1 ? 'list' : 'lists'}
          </span>
        </div>

        {publicLists.length === 0 ? (
          <div className={styles.emptyState}>No public lists created yet.</div>
        ) : (
          <ul className={styles.listsGrid} role="list">
            {publicLists.map((list) => (
              <li key={list.id}>
                <Link href={`/lists/${list.id}`} className={styles.listCard}>
                  <h3 className={styles.listTitle}>{list.title}</h3>
                  {list.description ? (
                    <p className={styles.listDescription}>{list.description}</p>
                  ) : (
                    <p className={styles.listDescription} style={{ fontStyle: 'italic', color: 'var(--color-text-tertiary)' }}>
                      No description.
                    </p>
                  )}
                  <div className={styles.listMeta}>
                    <span>{list.itemCount} {list.itemCount === 1 ? 'album' : 'albums'}</span>
                    <span>Updated {formatDate(list.updatedAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
