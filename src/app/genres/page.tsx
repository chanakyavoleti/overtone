import { Metadata } from 'next';
import Link from 'next/link';
import { db, sql } from '@/lib/db';
import { Layers, Disc3, ArrowRight } from 'lucide-react';
import styles from './page.module.css';
import { connection } from 'next/server';

export const metadata: Metadata = {
  title: 'Genres — Explore Music by Style',
  description: 'Browse music genres on Overtone. Discover classic and modern styles, top albums, and genre histories.',
};

export default async function GenresPage() {
  await connection();
  const genreRows = db.all(sql`
    SELECT 
      g.id,
      g.name,
      g.slug,
      g.description,
      COUNT(ag.albumId) as albumCount
    FROM genres g
    LEFT JOIN album_genres ag ON g.id = ag.genreId
    GROUP BY g.id
    ORDER BY albumCount DESC, g.name ASC
  `) as Array<{
    id: number;
    name: string;
    slug: string;
    description: string | null;
    albumCount: number;
  }>;

  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <h1 className={styles.title}>Genres</h1>
            <p className={styles.subtitle}>
              Explore music through musical styles, movements, and cultural traditions.
            </p>
          </div>
          {genreRows.length > 0 && (
            <span className={styles.counter}>
              {genreRows.length} {genreRows.length === 1 ? 'genre' : 'genres'}
            </span>
          )}
        </header>

        {genreRows.length === 0 ? (
          <div className={styles.emptyState}>
            <Layers size={40} className={styles.emptyIcon} aria-hidden="true" />
            <h2 className={styles.emptyTitle}>No genres found</h2>
            <p className={styles.emptyText}>There are currently no music genres cataloged.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {genreRows.map((genre) => (
              <Link
                key={genre.id}
                href={`/genres/${genre.slug}`}
                className={styles.card}
                aria-label={`Explore ${genre.name} genre with ${genre.albumCount} albums`}
              >
                <div className={styles.cardContent}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.genreName}>{genre.name}</h2>
                    <span className={styles.albumCount}>
                      <Disc3 size={13} className={styles.countIcon} aria-hidden="true" />
                      <span>{genre.albumCount} {genre.albumCount === 1 ? 'album' : 'albums'}</span>
                    </span>
                  </div>

                  {genre.description && (
                    <p className={styles.description}>{genre.description}</p>
                  )}
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.viewLink}>
                    <span>Explore genre</span>
                    <ArrowRight size={14} className={styles.arrowIcon} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
