import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import slugify from 'slugify';
import { db } from '@/lib/db';
import { albums, artists, tracks, genres, albumGenres, ratings, reviews, users } from '@/lib/db/schema';
import { eq, and, sql, asc, desc, avg, count } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/actions';
import AlbumCard, { AlbumGrid } from '@/components/music/AlbumCard';
import RatingControl, { RatingBadge } from '@/components/ui/RatingControl';
import ReviewSection from '@/components/music/ReviewSection';
import SafeImage from '@/components/ui/SafeImage';
import { Disc3, Clock, Calendar, Tag, ShieldAlert } from 'lucide-react';
import { isSpotifyConfigured, fetchSpotifyTracks, searchSpotifyAlbums } from '@/lib/metadata/providers/spotify';
import styles from './page.module.css';

interface AlbumPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: AlbumPageProps): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  let albumRecord = null;
  try {
    albumRecord = db
      .select({
        title: albums.title,
        releaseDate: albums.releaseDate,
        artistName: artists.name,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .where(eq(albums.slug, slug))
      .get();
  } catch (err) {
    console.error('generateMetadata error:', err);
  }

  if (!albumRecord) {
    return {
      title: 'Album Not Found',
    };
  }

  const artist = albumRecord.artistName || 'Unknown Artist';
  const year = albumRecord.releaseDate ? ` (${albumRecord.releaseDate.substring(0, 4)})` : '';

  return {
    title: `${albumRecord.title}${year} by ${artist}`,
    description: `Listen to, rate, and read reviews for ${albumRecord.title} by ${artist} on Overtone.`,
  };
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTotalRuntime(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min`;
}

export default async function AlbumDetailPage({ params }: AlbumPageProps) {
  await connection();
  const { slug } = await params;

  // 1. Fetch Album and Artist
  let album = null;
  try {
    album = db
      .select({
        id: albums.id,
        title: albums.title,
        slug: albums.slug,
        releaseDate: albums.releaseDate,
        albumType: albums.albumType,
        coverUrl: albums.coverUrl,
        label: albums.label,
        runtimeSeconds: albums.runtimeSeconds,
        trackCount: albums.trackCount,
        providerId: albums.providerId,
        artistId: albums.artistId,
        artistName: artists.name,
        artistSlug: artists.slug,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .where(eq(albums.slug, slug))
      .get();
  } catch (err) {
    console.error('Failed to get album details:', err);
  }

  if (!album) {
    notFound();
  }

  // 2. Fetch Current User
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    // Guest user
  }

  // 3. Fetch Tracks
  let trackList: any[] = [];
  try {
    trackList = db
      .select({
        id: tracks.id,
        title: tracks.title,
        slug: tracks.slug,
        trackNumber: tracks.trackNumber,
        discNumber: tracks.discNumber,
        durationSeconds: tracks.durationSeconds,
        explicit: tracks.explicit,
      })
      .from(tracks)
      .where(eq(tracks.albumId, album.id))
      .orderBy(asc(tracks.discNumber), asc(tracks.trackNumber), asc(tracks.id))
      .all();

    if (trackList.length === 0 && album.artistName) {
      try {
        if (isSpotifyConfigured()) {
          let spotifyTracks: Array<{
            title: string;
            slug: string;
            trackNumber: number;
            discNumber: number;
            durationSeconds: number;
            explicit: boolean;
          }> = [];

          if (album.providerId) {
            spotifyTracks = await fetchSpotifyTracks(String(album.providerId));
          }

          if (spotifyTracks.length === 0) {
            const foundAlbums = await searchSpotifyAlbums(`${album.artistName} ${album.title}`, 1);
            if (foundAlbums.length > 0 && foundAlbums[0].providerId) {
              spotifyTracks = await fetchSpotifyTracks(String(foundAlbums[0].providerId));
            }
          }

          if (spotifyTracks.length > 0) {
            const now = Math.floor(Date.now() / 1000);
            let totalRuntime = 0;
            for (const s of spotifyTracks) {
              totalRuntime += s.durationSeconds;
              db.insert(tracks).values({
                title: s.title,
                slug: s.slug,
                albumId: album.id,
                artistId: album.artistId,
                trackNumber: s.trackNumber,
                discNumber: s.discNumber,
                durationSeconds: s.durationSeconds,
                explicit: s.explicit ? 1 : 0,
                createdAt: now,
              }).onConflictDoNothing().run();
            }

            db.update(albums).set({
              trackCount: spotifyTracks.length,
              runtimeSeconds: totalRuntime > 0 ? totalRuntime : null,
            }).where(eq(albums.id, album.id)).run();

            trackList = db
              .select({
                id: tracks.id,
                title: tracks.title,
                slug: tracks.slug,
                trackNumber: tracks.trackNumber,
                discNumber: tracks.discNumber,
                durationSeconds: tracks.durationSeconds,
                explicit: tracks.explicit,
              })
              .from(tracks)
              .where(eq(tracks.albumId, album.id))
              .orderBy(asc(tracks.discNumber), asc(tracks.trackNumber), asc(tracks.id))
              .all();
          }
        } else {
          // Fallback legacy iTunes lookup
          const itunesRes = await fetch(
            `https://itunes.apple.com/search?term=${encodeURIComponent(`${album.artistName} ${album.title}`)}&entity=album&limit=1`,
            { signal: AbortSignal.timeout(6000) }
          );
          if (itunesRes.ok) {
            const itunesData = await itunesRes.json();
            if (itunesData.results && itunesData.results[0]?.collectionId) {
              const lookupRes = await fetch(
                `https://itunes.apple.com/lookup?id=${itunesData.results[0].collectionId}&entity=song`,
                { signal: AbortSignal.timeout(6000) }
              );
              if (lookupRes.ok) {
                const lookupData = await lookupRes.json();
                const songItems = lookupData.results.filter(
                  (x: any) => x.wrapperType === 'track' && x.trackName
                );
                const now = Math.floor(Date.now() / 1000);
                let totalRuntime = 0;
                for (const s of songItems) {
                  const trackSlug = slugify(`${s.trackName}-${s.trackNumber}`, { lower: true, strict: true }) || `track-${s.trackId}`;
                  const durationSeconds = s.trackTimeMillis ? Math.round(s.trackTimeMillis / 1000) : 0;
                  totalRuntime += durationSeconds;
                  db.insert(tracks).values({
                    title: s.trackName,
                    slug: trackSlug,
                    albumId: album.id,
                    artistId: album.artistId,
                    trackNumber: s.trackNumber || 1,
                    discNumber: s.discNumber || 1,
                    durationSeconds,
                    explicit: s.trackExplicitness === 'explicit' ? 1 : 0,
                    createdAt: now,
                  }).onConflictDoNothing().run();
                }
                if (songItems.length > 0) {
                  db.update(albums).set({
                    trackCount: songItems.length,
                    runtimeSeconds: totalRuntime > 0 ? totalRuntime : null,
                  }).where(eq(albums.id, album.id)).run();

                  trackList = db
                    .select({
                      id: tracks.id,
                      title: tracks.title,
                      slug: tracks.slug,
                      trackNumber: tracks.trackNumber,
                      discNumber: tracks.discNumber,
                      durationSeconds: tracks.durationSeconds,
                      explicit: tracks.explicit,
                    })
                    .from(tracks)
                    .where(eq(tracks.albumId, album.id))
                    .orderBy(asc(tracks.discNumber), asc(tracks.trackNumber), asc(tracks.id))
                    .all();
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Error auto-populating album tracks:', err);
      }
    }
  } catch (err) {
    console.error('Failed to get tracks:', err);
  }

  // 4. Fetch Genres
  let albumGenresList: any[] = [];
  try {
    albumGenresList = db
      .select({
        id: genres.id,
        name: genres.name,
        slug: genres.slug,
      })
      .from(albumGenres)
      .innerJoin(genres, eq(albumGenres.genreId, genres.id))
      .where(eq(albumGenres.albumId, album.id))
      .all();
  } catch (err) {
    console.error('Failed to get genres:', err);
  }

  // 5. Aggregate Ratings
  let avgScore: number | null = null;
  let ratingCount = 0;
  try {
    const agg = db
      .select({
        avgScore: avg(ratings.score),
        count: count(),
      })
      .from(ratings)
      .where(
        and(eq(ratings.targetType, 'album'), eq(ratings.targetId, album.id))
      )
      .get();

    avgScore = agg?.avgScore ? Math.round(Number(agg.avgScore)) : null;
    ratingCount = agg?.count ?? 0;
  } catch (err) {
    console.error('Failed to get rating aggregate:', err);
  }

  // 6. User Rating (if authenticated)
  let userRating: number | null = null;
  if (user) {
    try {
      const userRatingRecord = db
        .select({ score: ratings.score })
        .from(ratings)
        .where(
          and(
            eq(ratings.userId, user.id),
            eq(ratings.targetType, 'album'),
            eq(ratings.targetId, album.id)
          )
        )
        .get();
      userRating = userRatingRecord?.score ?? null;
    } catch (err) {
      console.error('Failed to get user rating:', err);
    }
  }

  // 7. Other albums by same artist
  let otherAlbums: any[] = [];
  if (album.artistId) {
    try {
      otherAlbums = db
        .select({
          id: albums.id,
          title: albums.title,
          slug: albums.slug,
          coverUrl: albums.coverUrl,
          releaseDate: albums.releaseDate,
          albumType: albums.albumType,
          avgRating: sql<number | null>`AVG(${ratings.score})`,
          ratingCount: sql<number>`COUNT(${ratings.id})`,
        })
        .from(albums)
        .leftJoin(
          ratings,
          and(eq(ratings.targetType, 'album'), eq(ratings.targetId, albums.id))
        )
        .where(
          and(
            eq(albums.artistId, album.artistId),
            sql`${albums.id} != ${album.id}`
          )
        )
        .groupBy(albums.id)
        .orderBy(desc(albums.releaseDate), desc(albums.createdAt))
        .limit(5)
        .all();
    } catch (err) {
      console.error('Failed to get other albums:', err);
    }
  }

  // 8. Reviews
  let albumReviews: any[] = [];
  try {
    albumReviews = db
      .select({
        id: reviews.id,
        title: reviews.title,
        body: reviews.body,
        createdAt: reviews.createdAt,
        userId: reviews.userId,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        score: ratings.score,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .leftJoin(
        ratings,
        and(
          eq(ratings.userId, reviews.userId),
          eq(ratings.targetType, 'album'),
          eq(ratings.targetId, album.id)
        )
      )
      .where(
        and(eq(reviews.targetType, 'album'), eq(reviews.targetId, album.id))
      )
      .orderBy(desc(reviews.createdAt))
      .all();
  } catch (err) {
    console.error('Failed to get album reviews:', err);
  }

  // Calculate total runtime if not stored
  const calculatedRuntime =
    album.runtimeSeconds ||
    trackList.reduce((acc, t) => acc + (t.durationSeconds || 0), 0);
  const totalRuntimeText = formatTotalRuntime(calculatedRuntime);
  const releaseYear = album.releaseDate ? album.releaseDate.substring(0, 4) : '';

  return (
    <div className={styles.page}>
      <div className="container">
        {/* Album Header Section */}
        <header className={styles.header}>
          <div className={styles.artworkContainer}>
            <SafeImage
              src={album.coverUrl}
              alt={`${album.title} by ${album.artistName || 'Unknown Artist'}`}
              className={styles.artwork}
              fallback={
                <div className={styles.artworkFallback}>
                  <Disc3 size={80} className={styles.artworkFallbackIcon} aria-hidden="true" />
                </div>
              }
            />
          </div>

          <div className={styles.infoArea}>
            <div className={styles.typeBadgeRow}>
              <span className={styles.typeBadge}>
                {album.albumType ? album.albumType.toUpperCase() : 'ALBUM'}
              </span>
            </div>

            <h1 className={styles.title}>{album.title}</h1>

            <div className={styles.artistRow}>
              {album.artistSlug ? (
                <Link href={`/artists/${album.artistSlug}`} className={styles.artistLink}>
                  {album.artistName}
                </Link>
              ) : (
                <span className={styles.artistName}>
                  {album.artistName || 'Unknown Artist'}
                </span>
              )}
            </div>

            {/* Metadata row */}
            <div className={styles.metaRow}>
              {releaseYear && (
                <span className={styles.metaItem}>
                  <Calendar size={15} aria-hidden="true" />
                  <span>{releaseYear}</span>
                </span>
              )}
              {album.label && (
                <span className={styles.metaItem}>
                  <Tag size={15} aria-hidden="true" />
                  <span>{album.label}</span>
                </span>
              )}
              {trackList.length > 0 && (
                <span className={styles.metaItem}>
                  <span>
                    {trackList.length} {trackList.length === 1 ? 'track' : 'tracks'}
                  </span>
                </span>
              )}
              {totalRuntimeText && (
                <span className={styles.metaItem}>
                  <Clock size={15} aria-hidden="true" />
                  <span>{totalRuntimeText}</span>
                </span>
              )}
            </div>

            {/* Genre Pills */}
            {albumGenresList.length > 0 && (
              <div className={styles.genresRow} aria-label="Genres">
                {albumGenresList.map((g) => (
                  <Link
                    key={g.id}
                    href={`/genres/${g.slug}`}
                    className={styles.genrePill}
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Ratings Section */}
            <div className={styles.ratingsWrapper}>
              <div className={styles.aggregateRating}>
                <span className={styles.ratingHeading}>Community Score</span>
                <RatingBadge score={avgScore} count={ratingCount} />
              </div>

              <div className={styles.userRatingContainer}>
                {user ? (
                  <RatingControl
                    targetType="album"
                    targetId={album.id}
                    currentRating={userRating}
                    isAuthenticated={true}
                    label="Your Rating"
                  />
                ) : (
                  <div className={styles.guestRatingPrompt}>
                    <span className={styles.guestPromptLabel}>Your Rating</span>
                    <Link
                      href={`/login?redirect=/music/${album.slug}`}
                      className={styles.guestRatingLink}
                    >
                      Sign in to rate
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Tracklist Section */}
        <section className={styles.tracklistSection} aria-labelledby="tracklist-heading">
          <div className={styles.sectionHeader}>
            <h2 id="tracklist-heading" className={styles.sectionTitle}>
              Tracklist
            </h2>
            {trackList.length > 0 && (
              <span className={styles.sectionSubtext}>
                {trackList.length} tracks {totalRuntimeText ? `• ${totalRuntimeText}` : ''}
              </span>
            )}
          </div>

          {trackList.length > 0 ? (
            <div className={styles.tableWrapper}>
              <table className={styles.trackTable}>
                <thead>
                  <tr>
                    <th scope="col" className={styles.thNum}>#</th>
                    <th scope="col" className={styles.thTitle}>Title</th>
                    <th scope="col" className={styles.thDuration}>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {trackList.map((track, idx) => (
                    <tr key={track.id} className={styles.trackRow}>
                      <td className={styles.tdNum}>
                        {track.trackNumber ?? idx + 1}
                      </td>
                      <td className={styles.tdTitle}>
                        <div className={styles.trackTitleGroup}>
                          <span className={styles.trackTitleText}>{track.title}</span>
                          {track.explicit === 1 && (
                            <span
                              className={styles.explicitBadge}
                              title="Explicit content"
                              aria-label="Explicit"
                            >
                              E
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={styles.tdDuration}>
                        {formatDuration(track.durationSeconds)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.noTracks}>
              <p>No tracklist available for this album yet.</p>
            </div>
          )}
        </section>

        {/* Reviews Section */}
        <ReviewSection
          albumId={album.id}
          albumTitle={album.title}
          initialReviews={albumReviews}
          currentUser={
            user
              ? {
                  id: user.id,
                  username: user.username,
                  displayName: user.displayName,
                }
              : null
          }
        />

        {/* Other Albums by Same Artist */}
        {otherAlbums.length > 0 && (
          <section className={styles.otherAlbumsSection} aria-labelledby="more-by-heading">
            <div className={styles.sectionHeader}>
              <h2 id="more-by-heading" className={styles.sectionTitle}>
                More by {album.artistName}
              </h2>
              {album.artistSlug && (
                <Link
                  href={`/artists/${album.artistSlug}`}
                  className={styles.seeArtistLink}
                >
                  View artist &rarr;
                </Link>
              )}
            </div>
            <AlbumGrid columns={5}>
              {otherAlbums.map((other) => (
                <AlbumCard
                  key={other.id}
                  slug={other.slug}
                  title={other.title}
                  artistName={album.artistName || 'Unknown Artist'}
                  coverUrl={other.coverUrl}
                  releaseDate={other.releaseDate}
                  albumType={other.albumType}
                  avgRating={other.avgRating}
                  ratingCount={other.ratingCount}
                />
              ))}
            </AlbumGrid>
          </section>
        )}
      </div>
    </div>
  );
}
