import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { connection } from 'next/server';
import { db, sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/actions';
import SafeImage from '@/components/ui/SafeImage';
import { ArrowLeft, Disc3, Calendar, User as UserIcon, Lock, Globe, Star, Quote } from 'lucide-react';
import styles from './page.module.css';

interface ListPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ListPageProps): Promise<Metadata> {
  await connection();
  const { id } = await params;
  const listId = parseInt(id, 10);
  if (isNaN(listId)) {
    return { title: 'List Not Found' };
  }

  const listRow = db.all(sql`
    SELECT title, description FROM lists WHERE id = ${listId}
  `)[0] as { title: string; description: string | null } | undefined;

  if (!listRow) {
    return { title: 'List Not Found' };
  }

  return {
    title: `${listRow.title} — Curated List`,
    description: listRow.description || `View albums in "${listRow.title}" on Overtone.`,
  };
}

function scoreToDisplay(score: number): string {
  return (score / 10).toFixed(1);
}

function getYear(date?: string | null): string {
  if (!date) return '';
  return date.substring(0, 4);
}

export default async function ListDetailPage({ params }: ListPageProps) {
  await connection();
  const { id } = await params;
  const listId = parseInt(id, 10);
  if (isNaN(listId)) {
    notFound();
  }

  // 1. Fetch list and creator
  const list = db.all(sql`
    SELECT 
      l.*,
      u.username,
      u.displayName,
      u.avatarUrl
    FROM lists l
    LEFT JOIN users u ON l.userId = u.id
    WHERE l.id = ${listId}
  `)[0] as {
    id: number;
    userId: number;
    title: string;
    description: string | null;
    isPublic: number;
    coverUrl: string | null;
    createdAt: number | null;
    updatedAt: number | null;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  } | undefined;

  if (!list) {
    notFound();
  }

  // Check privacy
  let currentUser = null;
  try {
    currentUser = await getCurrentUser();
  } catch {
    // Guest
  }

  const isOwner = currentUser?.id === list.userId;

  if (list.isPublic === 0 && !isOwner) {
    notFound();
  }

  // 2. Fetch list items with album and artist info
  const items = db.all(sql`
    SELECT 
      li.id as itemId,
      li.position,
      li.annotation,
      a.id as albumId,
      a.title as albumTitle,
      a.slug as albumSlug,
      a.coverUrl as coverUrl,
      a.releaseDate as releaseDate,
      a.albumType as albumType,
      ar.id as artistId,
      ar.name as artistName,
      ar.slug as artistSlug,
      AVG(r.score) as avgRating,
      COUNT(r.id) as ratingCount
    FROM list_items li
    LEFT JOIN albums a ON li.albumId = a.id
    LEFT JOIN artists ar ON a.artistId = ar.id
    LEFT JOIN ratings r ON r.targetType = 'album' AND r.targetId = a.id
    WHERE li.listId = ${listId}
    GROUP BY li.id
    ORDER BY li.position ASC
  `) as Array<{
    itemId: number;
    position: number;
    annotation: string | null;
    albumId: number | null;
    albumTitle: string | null;
    albumSlug: string | null;
    coverUrl: string | null;
    releaseDate: string | null;
    albumType: string | null;
    artistId: number | null;
    artistName: string | null;
    artistSlug: string | null;
    avgRating: number | null;
    ratingCount: number;
  }>;

  const creatorName = list.displayName || list.username || 'Anonymous';
  const creatorInitial = creatorName.trim().charAt(0).toUpperCase();

  return (
    <div className={styles.page}>
      <div className="container">
        {/* Back Link */}
        <div className={styles.backNav}>
          <Link href="/lists" className={styles.backLink}>
            <ArrowLeft size={16} aria-hidden="true" />
            <span>All Lists</span>
          </Link>
        </div>

        {/* Header */}
        <header className={styles.header}>
          <div className={styles.badgeRow}>
            {list.isPublic === 1 ? (
              <span className={styles.publicBadge}>
                <Globe size={12} aria-hidden="true" />
                <span>Public List</span>
              </span>
            ) : (
              <span className={styles.privateBadge}>
                <Lock size={12} aria-hidden="true" />
                <span>Private List</span>
              </span>
            )}
            <span className={styles.countBadge}>
              {items.length} {items.length === 1 ? 'album' : 'albums'}
            </span>
          </div>

          <h1 className={styles.title}>{list.title}</h1>

          {list.description && (
            <p className={styles.description}>{list.description}</p>
          )}

          <div className={styles.creatorMeta}>
            <div className={styles.creatorAvatar} aria-hidden="true">
              {creatorInitial}
            </div>
            <div className={styles.creatorDetails}>
              <span className={styles.curatedBy}>Curated by</span>
              <span className={styles.creatorName}>{creatorName}</span>
            </div>
            {list.updatedAt && (
              <span className={styles.dateMeta}>
                Updated {new Date(list.updatedAt * 1000).toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>
        </header>

        {/* List Content */}
        <main className={styles.listSection} aria-label="Albums in list">
          {items.length === 0 ? (
            <div className={styles.emptyState}>
              <Disc3 size={44} className={styles.emptyIcon} aria-hidden="true" />
              <h2 className={styles.emptyTitle}>This list is currently empty</h2>
              <p className={styles.emptyText}>
                No albums have been added to this list yet.
              </p>
            </div>
          ) : (
            <ol className={styles.itemsList}>
              {items.map((item) => {
                const year = getYear(item.releaseDate);

                return (
                  <li key={item.itemId} className={styles.itemRow}>
                    <span className={styles.position}>{item.position}</span>

                    <div className={styles.artworkWrapper}>
                      <SafeImage
                        src={item.coverUrl}
                        alt={item.albumTitle || ''}
                        className={styles.artwork}
                        fallback={
                          <div className={styles.artworkFallback}>
                            <Disc3 size={24} className={styles.fallbackIcon} aria-hidden="true" />
                          </div>
                        }
                      />
                    </div>

                    <div className={styles.itemContent}>
                      <div className={styles.itemHeader}>
                        <div className={styles.titleArea}>
                          {item.albumSlug ? (
                            <Link href={`/music/${item.albumSlug}`} className={styles.albumTitle}>
                              {item.albumTitle}
                            </Link>
                          ) : (
                            <span className={styles.albumTitle}>{item.albumTitle || 'Unknown Album'}</span>
                          )}

                          <div className={styles.subMeta}>
                            {item.artistSlug ? (
                              <Link href={`/artists/${item.artistSlug}`} className={styles.artistLink}>
                                {item.artistName}
                              </Link>
                            ) : (
                              <span className={styles.artistText}>{item.artistName}</span>
                            )}
                            {year && <span className={styles.year}>{year}</span>}
                            {item.albumType && item.albumType !== 'album' && (
                              <span className={styles.typeBadge}>{item.albumType}</span>
                            )}
                          </div>
                        </div>

                        {item.avgRating !== null && item.ratingCount > 0 && (
                          <div className={styles.ratingBox}>
                            <Star size={14} className={styles.starIcon} aria-hidden="true" />
                            <span className={styles.ratingScore}>{scoreToDisplay(item.avgRating)}</span>
                          </div>
                        )}
                      </div>

                      {item.annotation && (
                        <div className={styles.annotationBox}>
                          <Quote size={14} className={styles.quoteIcon} aria-hidden="true" />
                          <p className={styles.annotationText}>{item.annotation}</p>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </main>
      </div>
    </div>
  );
}
