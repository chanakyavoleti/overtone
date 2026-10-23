import { Metadata } from 'next';
import Link from 'next/link';
import { db, sql } from '@/lib/db';
import { artists } from '@/lib/db/schema';
import { count } from 'drizzle-orm';
import ArtistCard, { ArtistGrid } from '@/components/music/ArtistCard';
import Pagination from '@/components/ui/Pagination';
import { Users, Search, X } from 'lucide-react';
import styles from './page.module.css';
import { connection } from 'next/server';
import { searchArtistsUnified } from '@/lib/metadata/metadataManager';

export const metadata: Metadata = {
  title: 'Artists',
  description: 'Browse musicians, bands, and artists on Overtone. View ratings, discographies, and community reviews.',
};

interface ArtistsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ArtistsPage({ searchParams }: ArtistsPageProps) {
  await connection();
  const sp = await searchParams;
  const pageParam = typeof sp.page === 'string' ? sp.page : Array.isArray(sp.page) ? sp.page[0] : '1';
  const queryParam = typeof sp.q === 'string' ? sp.q.trim() : Array.isArray(sp.q) ? sp.q[0]?.trim() : '';
  const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  let total = 0;
  let artistRecords: Array<{
    id: number;
    name: string;
    slug: string;
    bio: string | null;
    imageUrl: string | null;
    country: string | null;
    formedYear: number | null;
    disbandedYear: number | null;
    avgRating: number | null;
    ratingCount: number;
  }> = [];

  if (queryParam) {
    const searchRes = await searchArtistsUnified(queryParam, {
      limit: pageSize,
      offset,
      includeExternal: true,
    });
    total = searchRes.total;
    artistRecords = searchRes.artists;
  } else {
    const countRow = db.select({ total: count() }).from(artists).get();
    total = countRow?.total ?? 0;

    artistRecords = db.all(sql`
      SELECT 
        ar.id,
        ar.name,
        ar.slug,
        ar.bio,
        ar.imageUrl,
        ar.country,
        ar.formedYear,
        ar.disbandedYear,
        AVG(r.score) as avgRating,
        COUNT(r.id) as ratingCount
      FROM artists ar
      LEFT JOIN ratings r ON r.targetType = 'artist' AND r.targetId = ar.id
      GROUP BY ar.id
      ORDER BY ar.name COLLATE NOCASE ASC
      LIMIT ${pageSize} OFFSET ${offset}
    `) as any;
  }

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <h1 className={styles.title}>Artists</h1>
            <p className={styles.subtitle}>
              Browse musicians and bands across all eras, genres, and regional industries.
            </p>
          </div>
          {total > 0 && (
            <span className={styles.counter} aria-label={`${total} total artists`}>
              {total} {total === 1 ? 'artist' : 'artists'}
            </span>
          )}
        </header>

        {/* Search & Filter Bar */}
        <form action="/artists" method="GET" className={styles.searchBar} role="search">
          <div className={styles.searchInputWrapper}>
            <Search size={16} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="text"
              name="q"
              defaultValue={queryParam}
              placeholder="Find artists by name, alias (e.g. SPB, AR Rahman), or country..."
              className={styles.searchInput}
              aria-label="Find artists by name or country"
            />
          </div>
          <button type="submit" className={styles.searchSubmitBtn}>
            Search
          </button>
          {queryParam && (
            <Link href="/artists" className={styles.clearSearchBtn} aria-label="Clear search filter">
              <X size={14} style={{ marginRight: 4 }} />
              Clear
            </Link>
          )}
        </form>

        {queryParam && (
          <div className={styles.searchStatus}>
            <span>
              {total === 0 ? 'No matching artists' : `Found ${total} ${total === 1 ? 'artist' : 'artists'}`} matching &ldquo;<strong>{queryParam}</strong>&rdquo;
            </span>
          </div>
        )}

        {artistRecords.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrapper}>
              <Users size={40} className={styles.emptyIcon} aria-hidden="true" />
            </div>
            <h2 className={styles.emptyTitle}>No artists found</h2>
            <p className={styles.emptyText}>
              {queryParam
                ? `We couldn't find any artists matching "${queryParam}". Try searching another name, transliteration, or reset filters.`
                : 'There are currently no artists cataloged in this section.'}
            </p>
            {queryParam && (
              <Link href="/artists" className={styles.searchSubmitBtn} style={{ marginTop: 'var(--space-4)', textDecoration: 'none' }}>
                View All Artists
              </Link>
            )}
          </div>
        ) : (
          <>
            <ArtistGrid columns={5}>
              {artistRecords.map((artist) => (
                <ArtistCard
                  key={artist.id}
                  slug={artist.slug}
                  name={artist.name}
                  imageUrl={artist.imageUrl}
                  country={artist.country}
                  formedYear={artist.formedYear}
                  disbandedYear={artist.disbandedYear}
                  avgRating={artist.avgRating !== null ? Number(artist.avgRating) : null}
                  ratingCount={Number(artist.ratingCount || 0)}
                />
              ))}
            </ArtistGrid>

            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                basePath={queryParam ? `/artists?q=${encodeURIComponent(queryParam)}` : '/artists'}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
