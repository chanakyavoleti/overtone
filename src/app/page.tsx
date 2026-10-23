import Link from 'next/link';
import { db } from '@/lib/db';
import { albums, artists, genres, editorialFeatures } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/actions';
import AlbumCard, { AlbumGrid } from '@/components/music/AlbumCard';
import styles from './page.module.css';
import { connection } from 'next/server';

export default async function HomePage() {
  await connection();
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    // Session retrieval error - continue as guest
  }

  // Featured editorial
  let feature = null;
  try {
    feature = db
      .select()
      .from(editorialFeatures)
      .where(eq(editorialFeatures.isActive, 1))
      .orderBy(editorialFeatures.position)
      .limit(1)
      .get();
  } catch (err) {
    console.error('Failed to query editorial feature:', err);
  }

  // Top rated albums (raw SQL for aggregate)
  let topAlbums: any[] = [];
  try {
    topAlbums = (db.all(sql`
      SELECT a.*, ar.name as artistName,
        AVG(r.score) as avgRating, COUNT(r.id) as ratingCount
      FROM albums a
      LEFT JOIN artists ar ON a.artistId = ar.id
      LEFT JOIN ratings r ON r.targetType = 'album' AND r.targetId = a.id
      GROUP BY a.id
      HAVING ratingCount > 0
      ORDER BY avgRating DESC
      LIMIT 10
    `) as any[]) || [];
  } catch (err) {
    console.error('Failed to query top rated albums:', err);
  }

  // Recently added
  let recentAlbums: any[] = [];
  try {
    recentAlbums = db
      .select({
        id: albums.id,
        title: albums.title,
        slug: albums.slug,
        coverUrl: albums.coverUrl,
        releaseDate: albums.releaseDate,
        albumType: albums.albumType,
        artistId: albums.artistId,
        artistName: artists.name,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .orderBy(desc(albums.createdAt))
      .limit(10)
      .all();
  } catch (err) {
    console.error('Failed to query recent albums:', err);
  }

  // Genres
  let allGenres: any[] = [];
  try {
    allGenres = db.select().from(genres).all();
  } catch (err) {
    console.error('Failed to query genres:', err);
  }

  return (
    <div className={styles.page}>
      {/* Hero section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          {feature ? (
            <>
              <h1 className={styles.heroTitle}>{feature.title}</h1>
              {feature.subtitle && <p className={styles.heroSubtitle}>{feature.subtitle}</p>}
              {feature.body && <p className={styles.heroBody}>{feature.body}</p>}
            </>
          ) : (
            <>
              <h1 className={styles.heroTitle}>Discover music that matters</h1>
              <p className={styles.heroSubtitle}>
                Rate albums, write reviews, and find your next favorite record.
              </p>
            </>
          )}
          {!user && (
            <div className={styles.heroCta}>
              <Link href="/register" className={styles.heroBtn}>
                Get started
              </Link>
              <Link href="/discover" className={styles.heroBtnSecondary}>
                Explore music
              </Link>
            </div>
          )}
        </div>
      </section>

      <div className="container">
        {/* Top Rated */}
        {topAlbums.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Highest Rated</h2>
              <Link href="/charts" className={styles.seeAll}>
                See all &rarr;
              </Link>
            </div>
            <AlbumGrid columns={5}>
              {topAlbums.map((album: any) => (
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
          </section>
        )}

        {/* Recently Added */}
        {recentAlbums.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recently Added</h2>
              <Link href="/music" className={styles.seeAll}>
                Browse all &rarr;
              </Link>
            </div>
            <AlbumGrid columns={5}>
              {recentAlbums.map((album) => (
                <AlbumCard
                  key={album.id}
                  slug={album.slug}
                  title={album.title}
                  artistName={album.artistName || 'Unknown Artist'}
                  coverUrl={album.coverUrl}
                  releaseDate={album.releaseDate}
                  albumType={album.albumType}
                />
              ))}
            </AlbumGrid>
          </section>
        )}

        {/* Genres */}
        {allGenres.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Explore by Genre</h2>
            </div>
            <div className={styles.genreGrid}>
              {allGenres.map((genre) => (
                <Link
                  key={genre.id}
                  href={`/genres/${genre.slug}`}
                  className={styles.genreChip}
                >
                  {genre.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {topAlbums.length === 0 && recentAlbums.length === 0 && (
          <section className={styles.emptyState}>
            <h2 className={styles.emptyTitle}>Welcome to Overtone</h2>
            <p className={styles.emptyText}>
              The music catalog is being set up. Run the seed script to populate initial data.
            </p>
            <code className={styles.emptyCode}>npx tsx src/lib/db/seed.ts</code>
          </section>
        )}
      </div>
    </div>
  );
}
