import { Metadata } from 'next';
import Link from 'next/link';
import { db, sql } from '@/lib/db';
import { lists, listItems, users } from '@/lib/db/schema';
import { eq, count } from 'drizzle-orm';
import Pagination from '@/components/ui/Pagination';
import { ListMusic, Plus, Disc3, Calendar, User as UserIcon } from 'lucide-react';
import styles from './page.module.css';
import { connection } from 'next/server';

export const metadata: Metadata = {
  title: 'Community Lists — Curated Album Selections',
  description: 'Browse music lists created by the Overtone community. Discover rankings, themed playlists, and genre deep-dives.',
};

interface ListsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ListsPage({ searchParams }: ListsPageProps) {
  await connection();
  const sp = await searchParams;
  const pageParam = typeof sp.page === 'string' ? sp.page : Array.isArray(sp.page) ? sp.page[0] : '1';
  const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
  const pageSize = 18;
  const offset = (page - 1) * pageSize;

  // 1. Total public lists
  const countRow = db.all(sql`
    SELECT COUNT(*) as total FROM lists WHERE isPublic = 1
  `)[0] as { total: number } | undefined;

  const total = Number(countRow?.total || 0);
  const totalPages = Math.ceil(total / pageSize) || 1;

  // 2. Fetch public lists with creator info and item counts
  const listRows = db.all(sql`
    SELECT 
      l.id,
      l.title,
      l.description,
      l.isPublic,
      l.coverUrl,
      l.createdAt,
      l.updatedAt,
      l.userId,
      u.username,
      u.displayName,
      u.avatarUrl,
      COUNT(li.id) as itemCount
    FROM lists l
    LEFT JOIN users u ON l.userId = u.id
    LEFT JOIN list_items li ON l.id = li.listId
    WHERE l.isPublic = 1
    GROUP BY l.id
    ORDER BY l.updatedAt DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `) as Array<{
    id: number;
    title: string;
    description: string | null;
    isPublic: number;
    coverUrl: string | null;
    createdAt: number | null;
    updatedAt: number | null;
    userId: number;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    itemCount: number;
  }>;

  return (
    <div className={styles.page}>
      <div className="container">
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <div className={styles.eyebrow}>
              <ListMusic size={16} className={styles.eyebrowIcon} aria-hidden="true" />
              <span>Community Curation</span>
            </div>
            <h1 className={styles.title}>Lists</h1>
            <p className={styles.subtitle}>
              Browse lists curated by music enthusiasts, from essential discographies to deep cuts.
            </p>
          </div>

          <div className={styles.headerActions}>
            <Link href="/my/lists" className="btn btn-primary">
              <Plus size={16} aria-hidden="true" />
              <span>Create List</span>
            </Link>
          </div>
        </header>

        {/* Lists Grid */}
        {listRows.length === 0 ? (
          <div className={styles.emptyState}>
            <ListMusic size={44} className={styles.emptyIcon} aria-hidden="true" />
            <h2 className={styles.emptyTitle}>No public lists yet</h2>
            <p className={styles.emptyText}>
              Be the first to create and publish a curated music list for the community!
            </p>
            <Link href="/my/lists" className="btn btn-primary">
              Create a List
            </Link>
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {listRows.map((list) => {
                const creator = list.displayName || list.username || 'Anonymous';
                const creatorInitial = creator.trim().charAt(0).toUpperCase();
                const countText = `${list.itemCount} ${list.itemCount === 1 ? 'entry' : 'entries'}`;

                return (
                  <Link
                    key={list.id}
                    href={`/lists/${list.id}`}
                    className={styles.card}
                    aria-label={`View list: ${list.title} by ${creator}`}
                  >
                    <div className={styles.cardTop}>
                      <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>{list.title}</h2>
                        <span className={styles.itemBadge}>
                          <Disc3 size={13} aria-hidden="true" />
                          <span>{countText}</span>
                        </span>
                      </div>

                      {list.description && (
                        <p className={styles.cardDescription}>{list.description}</p>
                      )}
                    </div>

                    <div className={styles.cardFooter}>
                      <div className={styles.creatorInfo}>
                        <div className={styles.creatorAvatar} aria-hidden="true">
                          {creatorInitial}
                        </div>
                        <span className={styles.creatorName}>{creator}</span>
                      </div>

                      {list.updatedAt && (
                        <span className={styles.dateMeta}>
                          {new Date(list.updatedAt * 1000).toLocaleDateString(undefined, {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              basePath="/lists"
            />
          </>
        )}
      </div>
    </div>
  );
}
