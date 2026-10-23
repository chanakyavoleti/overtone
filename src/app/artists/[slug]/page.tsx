import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { connection } from 'next/server';
import { db, sql } from '@/lib/db';
import { artists, albums, ratings } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/actions';
import AlbumCard, { AlbumGrid } from '@/components/music/AlbumCard';
import RatingControl from '@/components/music/RatingControl';
import SafeImage from '@/components/ui/SafeImage';
import { Globe, Calendar, Star, Disc3, LogIn, Clapperboard, CheckCircle2 } from 'lucide-react';
import styles from './page.module.css';
import { enrichArtistDiscographyUnified, getOrImportArtistBySlug } from '@/lib/metadata/metadataManager';
import { VERIFIED_ARTIST_PHOTOS } from '@/lib/db/discographyService';

interface ArtistPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArtistPageProps): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const artist = db.select().from(artists).where(eq(artists.slug, slug)).get();

  const displayName = artist ? artist.name : slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return {
    title: `${displayName} — Discography & Ratings`,
    description: artist?.bio || `Explore albums, reviews, and community ratings for ${displayName} on Overtone.`,
  };
}

export default async function ArtistDetailPage({ params }: ArtistPageProps) {
  await connection();
  const { slug } = await params;

  // 1. Fetch artist (or dynamically import on demand)
  let artist = await getOrImportArtistBySlug(slug);
  if (!artist) {
    notFound();
  }

  // Ensure artist image is verified and not a placeholder
  if (
    !artist.imageUrl ||
    artist.imageUrl.includes('c9d19c4bba2c1605876c762729974916') ||
    artist.imageUrl.includes('abd95cd3882021d0f16006cc391f993c')
  ) {
    const verified = VERIFIED_ARTIST_PHOTOS[artist.slug];
    if (verified) {
      db.update(artists).set({ imageUrl: verified }).where(eq(artists.id, artist.id)).run();
      artist = { ...artist, imageUrl: verified };
    }
  }

  // Ensure complete discography is populated and purified via Spotify
  try {
    const existingCount = db
      .select({ count: sql<number>`count(*)` })
      .from(albums)
      .where(eq(albums.artistId, artist.id))
      .get()?.count ?? 0;

    const hasLegacyThirdParty = db
      .select({ id: albums.id })
      .from(albums)
      .where(
        and(
          eq(albums.artistId, artist.id),
          sql`coverUrl LIKE '%dzcdn.net%' OR coverUrl LIKE '%mzstatic.com%' OR (coverUrl NOT LIKE '%scdn.co%' AND coverUrl IS NOT NULL)`
        )
      )
      .get();

    if (artist.enrichmentStatus !== 'complete' || existingCount < 10 || Boolean(hasLegacyThirdParty)) {
      await enrichArtistDiscographyUnified(artist.id, { forceRefresh: true });
    }
  } catch (err) {
    console.error('Error auto-enriching discography:', err);
  }

  // 2. Fetch genres
  const artistGenresList = db.all(sql`
    SELECT g.id, g.name, g.slug
    FROM genres g
    INNER JOIN artist_genres ag ON ag.genreId = g.id
    WHERE ag.artistId = ${artist.id}
    ORDER BY g.name ASC
  `) as Array<{ id: number; name: string; slug: string }>;

  // 3. Aggregate rating
  const ratingAgg = db.all(sql`
    SELECT 
      AVG(score) as avgRating,
      COUNT(id) as ratingCount
    FROM ratings
    WHERE targetType = 'artist' AND targetId = ${artist.id}
  `)[0] as { avgRating: number | null; ratingCount: number } | undefined;

  const avgRating = ratingAgg?.avgRating !== null && ratingAgg?.avgRating !== undefined
    ? Number(ratingAgg.avgRating)
    : null;
  const ratingCount = Number(ratingAgg?.ratingCount || 0);

  // 4. Current user rating
  let currentUser = null;
  let userRating: number | null = null;
  try {
    currentUser = await getCurrentUser();
    if (currentUser) {
      const existing = db
        .select()
        .from(ratings)
        .where(
          and(
            eq(ratings.userId, currentUser.id),
            eq(ratings.targetType, 'artist'),
            eq(ratings.targetId, artist.id)
          )
        )
        .get();
      userRating = existing?.score ?? null;
    }
  } catch {
    // Guest user
  }

  // 5. Discography
  const albumsList = db.all(sql`
    SELECT 
      a.id,
      a.title,
      a.slug,
      a.albumType,
      a.coverUrl,
      a.releaseDate,
      AVG(r.score) as avgRating,
      COUNT(r.id) as ratingCount
    FROM albums a
    LEFT JOIN ratings r ON r.targetType = 'album' AND r.targetId = a.id
    WHERE a.artistId = ${artist.id}
    GROUP BY a.id
    ORDER BY a.releaseDate DESC, a.title ASC
  `) as Array<{
    id: number;
    title: string;
    slug: string;
    albumType: string;
    coverUrl: string | null;
    releaseDate: string | null;
    avgRating: number | null;
    ratingCount: number;
  }>;

  const studioAlbums = albumsList.filter((a) => a.albumType === 'album');
  const soundtracks = albumsList.filter((a) => a.albumType === 'soundtrack');
  const eps = albumsList.filter((a) => a.albumType === 'ep');
  const singles = albumsList.filter((a) => a.albumType === 'single');
  const compilations = albumsList.filter((a) => a.albumType === 'compilation' || (!['album', 'soundtrack', 'ep', 'single'].includes(a.albumType)));

  // Format years active
  let yearsActive = '';
  if (artist.formedYear) {
    if (artist.disbandedYear) {
      yearsActive = `${artist.formedYear}–${artist.disbandedYear}`;
    } else {
      yearsActive = `${artist.formedYear}–present`;
    }
  }

  // Parse aliases if present
  let parsedAliases: string[] = [];
  if (artist.aliases) {
    try {
      parsedAliases = JSON.parse(artist.aliases);
    } catch {
      parsedAliases = [artist.aliases];
    }
  }

  const initial = artist.name.trim().charAt(0).toUpperCase();

  return (
    <div className={styles.page}>
      {/* Hero Header */}
      <div className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            {/* Artist Avatar */}
            <div className={styles.avatarContainer}>
              <SafeImage
                src={artist.imageUrl}
                alt={artist.name}
                className={styles.avatarImage}
                fallback={
                  <div className={styles.avatarFallback} aria-hidden="true">
                    <span className={styles.avatarInitial}>{initial}</span>
                  </div>
                }
              />
            </div>

            {/* Artist Info */}
            <div className={styles.artistDetails}>
              <div className={styles.badgesRow}>
                <span className={styles.typeBadge}>Artist</span>
                {yearsActive && (
                  <span className={styles.metaBadge}>
                    <Calendar size={13} aria-hidden="true" />
                    <span>{yearsActive}</span>
                  </span>
                )}
                {artist.country && (
                  <span className={styles.metaBadge}>
                    <Globe size={13} aria-hidden="true" />
                    <span>{artist.country}</span>
                  </span>
                )}
                {albumsList.length > 0 && (
                  <span className={styles.metaBadge} title="Catalog metadata verified and synchronized">
                    <CheckCircle2 size={13} style={{ color: 'var(--color-success, #10b981)' }} aria-hidden="true" />
                    <span>{albumsList.length} Releases</span>
                  </span>
                )}
              </div>

              <h1 className={styles.name}>{artist.name}</h1>

              {parsedAliases.length > 0 && (
                <p className={styles.subtitle} style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>
                  Also known as: {parsedAliases.slice(0, 4).join(', ')}
                </p>
              )}

              {/* Genres */}
              {artistGenresList.length > 0 && (
                <div className={styles.genreList} aria-label="Artist genres">
                  {artistGenresList.map((g) => (
                    <Link key={g.id} href={`/genres/${g.slug}`} className={styles.genreTag}>
                      {g.name}
                    </Link>
                  ))}
                </div>
              )}

              {/* Ratings and User Action Row */}
              <div className={styles.actionRow}>
                <div className={styles.aggregateRating}>
                  <Star size={20} className={styles.starIcon} aria-hidden="true" />
                  <div className={styles.ratingNumbers}>
                    <span className={styles.ratingScore}>
                      {avgRating !== null ? (avgRating / 10).toFixed(1) : '—'}
                    </span>
                    <span className={styles.ratingMax}>/10</span>
                  </div>
                  <span className={styles.ratingCount}>
                    ({ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'})
                  </span>
                </div>

                <div className={styles.userRateAction}>
                  {currentUser ? (
                    <RatingControl
                      targetType="artist"
                      targetId={artist.id}
                      initialRating={userRating}
                      targetName={artist.name}
                    />
                  ) : (
                    <Link href="/login" className={styles.loginToRateBtn}>
                      <LogIn size={15} aria-hidden="true" />
                      <span>Sign in to rate</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Bio Section */}
        {artist.bio && (
          <section className={styles.bioSection} aria-labelledby="bio-heading">
            <h2 id="bio-heading" className={styles.sectionTitle}>
              Biography
            </h2>
            <p className={styles.bioText}>{artist.bio}</p>
          </section>
        )}

        {/* Discography Section */}
        <section className={styles.discographySection} aria-labelledby="discography-heading">
          <h2 id="discography-heading" className={styles.discographyHeading}>
            Discography
          </h2>

          {albumsList.length === 0 ? (
            <div className={styles.emptyDiscography}>
              <Disc3 size={40} className={styles.emptyIcon} aria-hidden="true" />
              <p>No albums or releases found for this artist.</p>
            </div>
          ) : (
            <div className={styles.albumSections}>
              {/* Studio Albums */}
              {studioAlbums.length > 0 && (
                <div className={styles.albumGroup}>
                  <div className={styles.groupHeader}>
                    <h3 className={styles.groupTitle}>Studio Albums</h3>
                    <span className={styles.groupCount}>{studioAlbums.length}</span>
                  </div>
                  <AlbumGrid columns={5}>
                    {studioAlbums.map((album) => (
                      <AlbumCard
                        key={album.id}
                        slug={album.slug}
                        title={album.title}
                        artistName={artist.name}
                        coverUrl={album.coverUrl}
                        releaseDate={album.releaseDate}
                        albumType={album.albumType}
                        avgRating={album.avgRating !== null ? Number(album.avgRating) : null}
                        ratingCount={Number(album.ratingCount || 0)}
                      />
                    ))}
                  </AlbumGrid>
                </div>
              )}

              {/* Soundtracks & Film Scores */}
              {soundtracks.length > 0 && (
                <div className={styles.albumGroup}>
                  <div className={styles.groupHeader}>
                    <h3 className={styles.groupTitle} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clapperboard size={18} aria-hidden="true" />
                      Soundtracks & Film Scores
                    </h3>
                    <span className={styles.groupCount}>{soundtracks.length}</span>
                  </div>
                  <AlbumGrid columns={5}>
                    {soundtracks.map((album) => (
                      <AlbumCard
                        key={album.id}
                        slug={album.slug}
                        title={album.title}
                        artistName={artist.name}
                        coverUrl={album.coverUrl}
                        releaseDate={album.releaseDate}
                        albumType={album.albumType}
                        avgRating={album.avgRating !== null ? Number(album.avgRating) : null}
                        ratingCount={Number(album.ratingCount || 0)}
                      />
                    ))}
                  </AlbumGrid>
                </div>
              )}

              {/* EPs */}
              {eps.length > 0 && (
                <div className={styles.albumGroup}>
                  <div className={styles.groupHeader}>
                    <h3 className={styles.groupTitle}>EPs</h3>
                    <span className={styles.groupCount}>{eps.length}</span>
                  </div>
                  <AlbumGrid columns={5}>
                    {eps.map((album) => (
                      <AlbumCard
                        key={album.id}
                        slug={album.slug}
                        title={album.title}
                        artistName={artist.name}
                        coverUrl={album.coverUrl}
                        releaseDate={album.releaseDate}
                        albumType={album.albumType}
                        avgRating={album.avgRating !== null ? Number(album.avgRating) : null}
                        ratingCount={Number(album.ratingCount || 0)}
                      />
                    ))}
                  </AlbumGrid>
                </div>
              )}

              {/* Singles */}
              {singles.length > 0 && (
                <div className={styles.albumGroup}>
                  <div className={styles.groupHeader}>
                    <h3 className={styles.groupTitle}>Singles</h3>
                    <span className={styles.groupCount}>{singles.length}</span>
                  </div>
                  <AlbumGrid columns={5}>
                    {singles.map((album) => (
                      <AlbumCard
                        key={album.id}
                        slug={album.slug}
                        title={album.title}
                        artistName={artist.name}
                        coverUrl={album.coverUrl}
                        releaseDate={album.releaseDate}
                        albumType={album.albumType}
                        avgRating={album.avgRating !== null ? Number(album.avgRating) : null}
                        ratingCount={Number(album.ratingCount || 0)}
                      />
                    ))}
                  </AlbumGrid>
                </div>
              )}

              {/* Compilations & Collections */}
              {compilations.length > 0 && (
                <div className={styles.albumGroup}>
                  <div className={styles.groupHeader}>
                    <h3 className={styles.groupTitle}>Compilations & Anthologies</h3>
                    <span className={styles.groupCount}>{compilations.length}</span>
                  </div>
                  <AlbumGrid columns={5}>
                    {compilations.map((album) => (
                      <AlbumCard
                        key={album.id}
                        slug={album.slug}
                        title={album.title}
                        artistName={artist.name}
                        coverUrl={album.coverUrl}
                        releaseDate={album.releaseDate}
                        albumType={album.albumType}
                        avgRating={album.avgRating !== null ? Number(album.avgRating) : null}
                        ratingCount={Number(album.ratingCount || 0)}
                      />
                    ))}
                  </AlbumGrid>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
