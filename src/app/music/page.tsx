import { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import { albums, artists, ratings } from '@/lib/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import AlbumCard, { AlbumGrid } from '@/components/music/AlbumCard';
import styles from './page.module.css';
import { connection } from 'next/server';

export const metadata: Metadata = {
  title: 'Music Catalog',
  description: 'Browse all albums, EPs, and releases on Overtone. Discover new music and community ratings.',
};

interface MusicPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MusicPage({ searchParams }: MusicPageProps) {
  await connection();
  const sp = await searchParams;
  const pageParam = typeof sp.page === 'string' ? sp.page : Array.isArray(sp.page) ? sp.page[0] : '1';
  const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  let totalAlbums = 0;
  let albumList: any[] = [];

  try {
    const countResult = db
      .select({ count: sql<number>`count(*)` })
      .from(albums)
      .get();
    totalAlbums = countResult?.count ?? 0;

    albumList = db
      .select({
        id: albums.id,
        title: albums.title,
        slug: albums.slug,
        coverUrl: albums.coverUrl,
        releaseDate: albums.releaseDate,
        albumType: albums.albumType,
        artistId: albums.artistId,
        artistName: artists.name,
        avgRating: sql<number | null>`AVG(${ratings.score})`,
        ratingCount: sql<number>`COUNT(${ratings.id})`,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .leftJoin(
        ratings,
        and(eq(ratings.targetType, 'album'), eq(ratings.targetId, albums.id))
      )
      .groupBy(albums.id)
      .orderBy(desc(albums.createdAt))
      .limit(limit)
      .offset(offset)
      .all();
  } catch (err) {
    console.error('Failed to query albums for directory:', err);
  }

  const totalPages = Math.max(1, Math.ceil(totalAlbums / limit));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className="container">
          <div className={styles.headerContent}>
            <h1 className={styles.title}>Music</h1>
            <p className={styles.subtitle}>
              Explore the entire catalog of albums, EPs, and releases.
            </p>
          </div>
        </div>
      </header>

      <main className="container">
        <div className={styles.content}>
          <div className={styles.catalogStats}>
            <span>
              Showing {albumList.length > 0 ? offset + 1 : 0}–
              {Math.min(offset + albumList.length, totalAlbums)} of {totalAlbums} albums
            </span>
          </div>

          {albumList.length > 0 ? (
            <div className={styles.gridSection}>
              <AlbumGrid columns={5}>
                {albumList.map((album) => (
                  <AlbumCard
                    key={album.id}
                    slug={album.slug}
                    title={album.title}
                    artistName={album.artistName || 'Unknown Artist'}
                    coverUrl={album.coverUrl}
                    releaseDate={album.releaseDate}
                    albumType={album.albumType}
                    avgRating={album.avgRating}
                    ratingCount={album.ratingCount}
                  />
                ))}
              </AlbumGrid>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <h2 className={styles.emptyTitle}>No albums found</h2>
              <p className={styles.emptyText}>
                No albums are available on this page.
              </p>
              {page > 1 && (
                <Link href="/music" className={styles.backLink}>
                  &larr; Back to first page
                </Link>
              )}
            </div>
          )}

          {totalPages > 1 && (
            <nav className={styles.pagination} aria-label="Pagination navigation">
              {hasPrev ? (
                <Link
                  href={`/music?page=${page - 1}`}
                  className={styles.pageBtn}
                  aria-label="Previous page"
                >
                  &larr; Previous
                </Link>
              ) : (
                <span
                  className={`${styles.pageBtn} ${styles.disabled}`}
                  aria-disabled="true"
                >
                  &larr; Previous
                </span>
              )}

              <div className={styles.pageIndicator}>
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              </div>

              {hasNext ? (
                <Link
                  href={`/music?page=${page + 1}`}
                  className={styles.pageBtn}
                  aria-label="Next page"
                >
                  Next &rarr;
                </Link>
              ) : (
                <span
                  className={`${styles.pageBtn} ${styles.disabled}`}
                  aria-disabled="true"
                >
                  Next &rarr;
                </span>
              )}
            </nav>
          )}
        </div>
      </main>
    </div>
  );
}
