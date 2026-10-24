import { Metadata } from 'next';
import Link from 'next/link';
import { db, sql } from '@/lib/db';
import AlbumCard, { AlbumGrid } from '@/components/music/AlbumCard';
import SafeImage from '@/components/ui/SafeImage';
import { Sparkles, Compass, Flame, Gem, Disc3, ArrowRight, Layers } from 'lucide-react';
import styles from './page.module.css';
import { connection } from 'next/server';

export const metadata: Metadata = {
  title: 'Discover Music — Top Rated, Recent Releases & Hidden Gems',
  description: 'Discover exceptional music on Overtone. Explore top rated albums, new additions, genres, and community hidden gems.',
};

export default async function DiscoverPage() {
  await connection();
  // 1. Featured Editorial Feature (if any)
  const editorialFeature = db.all(sql`
    SELECT ef.*, a.slug as albumSlug, a.coverUrl as albumCoverUrl
    FROM editorial_features ef
    LEFT JOIN albums a ON ef.targetType = 'album' AND ef.targetId = a.id
    WHERE ef.isActive = 1
    ORDER BY ef.position ASC
    LIMIT 1
  `)[0] as {
    id: number;
    title: string;
    subtitle: string | null;
    body: string | null;
    targetType: string | null;
    targetId: number | null;
    imageUrl: string | null;
    albumSlug: string | null;
    albumCoverUrl: string | null;
  } | undefined;

  // 2. Top Rated Albums
  const topRatedAlbums = db.all(sql`
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
    FROM albums a
    LEFT JOIN artists ar ON a.artistId = ar.id
    LEFT JOIN ratings r ON r.targetType = 'album' AND r.targetId = a.id
    GROUP BY a.id HAVING ratingCount > 0
    ORDER BY avgRating DESC LIMIT 10
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

  // 3. Genres Exploration
  const genresList = db.all(sql`
    SELECT 
      g.id,
      g.name,
      g.slug,
      g.description,
      COUNT(ag.albumId) as albumCount
    FROM genres g
    LEFT JOIN album_genres ag ON g.id = ag.genreId
    GROUP BY g.id
    ORDER BY albumCount DESC, g.name ASC LIMIT 8
  `) as Array<{
    id: number;
    name: string;
    slug: string;
    description: string | null;
    albumCount: number;
  }>;

  // 5. Hidden Gems (ratingCount between 1 and 3, score >= 70)
  const hiddenGems = db.all(sql`
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
    FROM albums a
    LEFT JOIN artists ar ON a.artistId = ar.id
    LEFT JOIN ratings r ON r.targetType = 'album' AND r.targetId = a.id
    GROUP BY a.id 
    HAVING ratingCount BETWEEN 1 AND 3 AND avgRating >= 70
    ORDER BY avgRating DESC, ratingCount DESC LIMIT 10
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
        {/* Page Header */}
        <header className={styles.header}>
          <div className={styles.eyebrow}>
            <Compass size={16} className={styles.eyebrowIcon} aria-hidden="true" />
            <span>Curation & Discovery</span>
          </div>
          <h1 className={styles.title}>Discover</h1>
          <p className={styles.subtitle}>
            Explore highlights, critically-acclaimed landmarks, new additions, and community discoveries.
          </p>
        </header>

        {/* Editorial Feature Banner */}
        {editorialFeature && (
          <section className={styles.editorialBanner} aria-label="Editorial feature">
            <div className={styles.editorialContent}>
              <span className={styles.editorialBadge}>
                <Sparkles size={13} aria-hidden="true" />
                <span>Editorial Spotlight</span>
              </span>
              <h2 className={styles.editorialTitle}>{editorialFeature.title}</h2>
              {editorialFeature.subtitle && (
                <p className={styles.editorialSubtitle}>{editorialFeature.subtitle}</p>
              )}
              {editorialFeature.body && (
                <p className={styles.editorialBody}>{editorialFeature.body}</p>
              )}
              {editorialFeature.albumSlug && (
                <Link href={`/music/${editorialFeature.albumSlug}`} className="btn btn-primary">
                  View Album & Reviews
                </Link>
              )}
            </div>
            <div className={styles.editorialImageWrapper}>
              <SafeImage
                src={
                  editorialFeature.imageUrl && !editorialFeature.imageUrl.startsWith('/images/editorial/')
                    ? editorialFeature.imageUrl
                    : editorialFeature.albumCoverUrl || editorialFeature.imageUrl
                }
                alt={editorialFeature.title}
                className={styles.editorialImage}
                fallback={<div className={styles.editorialImageFallback} />}
              />
            </div>
          </section>
        )}

        {/* 1. Top Rated Albums */}
        <section className={styles.section} aria-labelledby="top-rated-heading">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleArea}>
              <div className={styles.sectionBadge}>
                <Flame size={15} className={styles.flameIcon} aria-hidden="true" />
                <span>Community Favorites</span>
              </div>
              <h2 id="top-rated-heading" className={styles.sectionTitle}>
                Top Rated Albums
              </h2>
            </div>
            <Link href="/charts" className={styles.viewAllLink}>
              <span>View full charts</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          {topRatedAlbums.length === 0 ? (
            <div className={styles.emptyCard}>
              <Disc3 size={32} className={styles.emptyIcon} aria-hidden="true" />
              <p>No rated albums yet. Once members start reviewing, top albums will appear here.</p>
            </div>
          ) : (
            <AlbumGrid columns={5}>
              {topRatedAlbums.map((album) => (
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

        {/* 2. Genre Exploration */}
        <section className={styles.section} aria-labelledby="genres-heading">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleArea}>
              <div className={styles.sectionBadge}>
                <Layers size={14} aria-hidden="true" />
                <span>Categories</span>
              </div>
              <h2 id="genres-heading" className={styles.sectionTitle}>
                Explore by Genre
              </h2>
            </div>
            <Link href="/genres" className={styles.viewAllLink}>
              <span>All genres</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          <div className={styles.genreChipsGrid}>
            {genresList.map((g) => (
              <Link key={g.id} href={`/genres/${g.slug}`} className={styles.genreChip}>
                <span className={styles.genreChipName}>{g.name}</span>
                <span className={styles.genreChipCount}>
                  {g.albumCount} {g.albumCount === 1 ? 'album' : 'albums'}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* 4. Hidden Gems */}
        <section className={styles.section} aria-labelledby="gems-heading">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleArea}>
              <div className={styles.sectionBadge}>
                <Gem size={14} className={styles.gemIcon} aria-hidden="true" />
                <span>Under the Radar</span>
              </div>
              <h2 id="gems-heading" className={styles.sectionTitle}>
                Hidden Gems
              </h2>
              <p className={styles.sectionDescription}>
                High-scoring albums discovered by a select few listeners.
              </p>
            </div>
          </div>

          {hiddenGems.length === 0 ? (
            <div className={styles.emptyCard}>
              <Gem size={32} className={styles.gemIcon} aria-hidden="true" />
              <p>
                No hidden gems detected yet. Rate emerging or niche albums to help spotlight them here!
              </p>
            </div>
          ) : (
            <AlbumGrid columns={5}>
              {hiddenGems.map((album) => (
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
