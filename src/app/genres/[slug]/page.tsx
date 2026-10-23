import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db, sql } from '@/lib/db';
import { genres } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import AlbumCard, { AlbumGrid } from '@/components/music/AlbumCard';
import { ArrowLeft, Disc3, Tag } from 'lucide-react';
import { connection } from 'next/server';
import styles from './page.module.css';

interface GenrePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: GenrePageProps): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const genre = db.select().from(genres).where(eq(genres.slug, slug)).get();

  if (!genre) {
    return {
      title: 'Genre Not Found',
    };
  }

  return {
    title: `${genre.name} Albums & Discographies`,
    description: genre.description || `Browse top-rated ${genre.name} albums, reviews, and community discussions on Overtone.`,
  };
}

export default async function GenreDetailPage({ params }: GenrePageProps) {
  await connection();
  const { slug } = await params;

  // 1. Fetch genre
  const genre = db.select().from(genres).where(eq(genres.slug, slug)).get();
  if (!genre) {
    notFound();
  }

  // 2. Fetch albums in genre with artist name and average rating
  const albumRows = db.all(sql`
    SELECT 
      a.id,
      a.title,
      a.slug,
      a.coverUrl,
      a.releaseDate,
      a.albumType,
      ar.name as artistName,
      AVG(r.score) as avgRating,
      COUNT(r.id) as ratingCount
    FROM album_genres ag
    INNER JOIN albums a ON a.id = ag.albumId
    LEFT JOIN artists ar ON a.artistId = ar.id
    LEFT JOIN ratings r ON r.targetType = 'album' AND r.targetId = a.id
    WHERE ag.genreId = ${genre.id}
    GROUP BY a.id
    ORDER BY avgRating DESC, a.title ASC
  `) as Array<{
    id: number;
    title: string;
    slug: string;
    coverUrl: string | null;
    releaseDate: string | null;
    albumType: string;
    artistName: string | null;
    avgRating: number | null;
    ratingCount: number;
  }>;

  return (
    <div className={styles.page}>
      <div className="container">
        {/* Navigation back */}
        <div className={styles.backNav}>
          <Link href="/genres" className={styles.backLink}>
            <ArrowLeft size={16} aria-hidden="true" />
            <span>All Genres</span>
          </Link>
        </div>

        {/* Header */}
        <header className={styles.header}>
          <div className={styles.badgeRow}>
            <span className={styles.tagBadge}>
              <Tag size={13} aria-hidden="true" />
              <span>Genre</span>
            </span>
            <span className={styles.albumCountBadge}>
              {albumRows.length} {albumRows.length === 1 ? 'album' : 'albums'}
            </span>
          </div>

          <h1 className={styles.title}>{genre.name}</h1>

          {genre.description && (
            <p className={styles.description}>{genre.description}</p>
          )}
        </header>

        {/* Albums list */}
        <section aria-labelledby="genre-albums-heading" className={styles.albumSection}>
          <div className={styles.sectionHeader}>
            <h2 id="genre-albums-heading" className={styles.sectionTitle}>
              Albums in {genre.name}
            </h2>
          </div>

          {albumRows.length === 0 ? (
            <div className={styles.emptyState}>
              <Disc3 size={40} className={styles.emptyIcon} aria-hidden="true" />
              <h3 className={styles.emptyTitle}>No albums in this genre yet</h3>
              <p className={styles.emptyText}>
                There are currently no albums linked to the {genre.name} genre. Check back as new music is added!
              </p>
            </div>
          ) : (
            <AlbumGrid columns={5}>
              {albumRows.map((album) => (
                <AlbumCard
                  key={album.id}
                  slug={album.slug}
                  title={album.title}
                  artistName={album.artistName || 'Unknown Artist'}
                  coverUrl={album.coverUrl}
                  releaseDate={album.releaseDate}
                  albumType={album.albumType}
                  avgRating={album.avgRating !== null ? Number(album.avgRating) : null}
                  ratingCount={Number(album.ratingCount || 0)}
                />
              ))}
            </AlbumGrid>
          )}
        </section>
      </div>
    </div>
  );
}
