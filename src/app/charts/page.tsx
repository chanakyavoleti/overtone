import { Metadata } from 'next';
import Link from 'next/link';
import { db, sql } from '@/lib/db';
import { Disc3, Music, User, Trophy, Star } from 'lucide-react';
import styles from './page.module.css';
import { connection } from 'next/server';

export const metadata: Metadata = {
  title: 'Top Charts — Highest Rated Albums, Tracks & Artists',
  description: 'Explore the top 50 highest rated albums, tracks, and artists of all time on Overtone, ranked by community ratings.',
};

interface ChartsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function scoreToDisplay(score: number): string {
  return (score / 10).toFixed(1);
}

function getYear(date?: string | null): string {
  if (!date) return '';
  return date.substring(0, 4);
}

export default async function ChartsPage({ searchParams }: ChartsPageProps) {
  await connection();
  const sp = await searchParams;
  const tabParam = typeof sp.tab === 'string' ? sp.tab : 'albums';
  const activeTab = tabParam === 'tracks' ? 'tracks' : tabParam === 'artists' ? 'artists' : 'albums';

  // 1. Albums Query (exact SQL requested)
  const albumRows = db.all(sql`
    SELECT a.*, ar.name as artistName, ar.slug as artistSlug, AVG(r.score) as avgRating, COUNT(r.id) as ratingCount
    FROM albums a
    LEFT JOIN artists ar ON a.artistId = ar.id
    LEFT JOIN ratings r ON r.targetType = 'album' AND r.targetId = a.id
    GROUP BY a.id HAVING ratingCount > 0
    ORDER BY avgRating DESC LIMIT 50
  `) as Array<{
    id: number;
    title: string;
    slug: string;
    artistName: string | null;
    artistSlug: string | null;
    coverUrl: string | null;
    releaseDate: string | null;
    avgRating: number;
    ratingCount: number;
  }>;

  // 2. Tracks Query
  const trackRows = db.all(sql`
    SELECT t.*, a.title as albumTitle, a.slug as albumSlug, a.coverUrl as coverUrl, ar.name as artistName, ar.slug as artistSlug, AVG(r.score) as avgRating, COUNT(r.id) as ratingCount
    FROM tracks t
    LEFT JOIN albums a ON t.albumId = a.id
    LEFT JOIN artists ar ON t.artistId = ar.id
    LEFT JOIN ratings r ON r.targetType = 'track' AND r.targetId = t.id
    GROUP BY t.id HAVING ratingCount > 0
    ORDER BY avgRating DESC LIMIT 50
  `) as Array<{
    id: number;
    title: string;
    slug: string;
    albumTitle: string | null;
    albumSlug: string | null;
    coverUrl: string | null;
    artistName: string | null;
    artistSlug: string | null;
    avgRating: number;
    ratingCount: number;
  }>;

  // 3. Artists Query
  const artistRows = db.all(sql`
    SELECT ar.*, AVG(r.score) as avgRating, COUNT(r.id) as ratingCount
    FROM artists ar
    LEFT JOIN ratings r ON r.targetType = 'artist' AND r.targetId = ar.id
    GROUP BY ar.id HAVING ratingCount > 0
    ORDER BY avgRating DESC LIMIT 50
  `) as Array<{
    id: number;
    name: string;
    slug: string;
    imageUrl: string | null;
    country: string | null;
    formedYear: number | null;
    avgRating: number;
    ratingCount: number;
  }>;

  return (
    <div className={styles.page}>
      <div className="container">
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <div className={styles.eyebrow}>
              <Trophy size={16} className={styles.trophyIcon} aria-hidden="true" />
              <span>Community Rankings</span>
            </div>
            <h1 className={styles.title}>Charts</h1>
            <p className={styles.subtitle}>
              The highest-rated music of all time, ranked purely by the Overtone community.
            </p>
          </div>

          {/* Navigation Tabs */}
          <nav className={styles.tabNav} role="tablist" aria-label="Charts categories">
            <Link
              href="/charts?tab=albums"
              role="tab"
              aria-selected={activeTab === 'albums'}
              className={`${styles.tabBtn} ${activeTab === 'albums' ? styles.tabActive : ''}`}
            >
              Albums
              {albumRows.length > 0 && <span className={styles.tabBadge}>{albumRows.length}</span>}
            </Link>
            <Link
              href="/charts?tab=tracks"
              role="tab"
              aria-selected={activeTab === 'tracks'}
              className={`${styles.tabBtn} ${activeTab === 'tracks' ? styles.tabActive : ''}`}
            >
              Tracks
              {trackRows.length > 0 && <span className={styles.tabBadge}>{trackRows.length}</span>}
            </Link>
            <Link
              href="/charts?tab=artists"
              role="tab"
              aria-selected={activeTab === 'artists'}
              className={`${styles.tabBtn} ${activeTab === 'artists' ? styles.tabActive : ''}`}
            >
              Artists
              {artistRows.length > 0 && <span className={styles.tabBadge}>{artistRows.length}</span>}
            </Link>
          </nav>
        </header>

        {/* Content Section */}
        <main className={styles.content}>
          {/* Albums Chart */}
          {activeTab === 'albums' && (
            <section aria-label="Top Albums Chart">
              {albumRows.length === 0 ? (
                <div className={styles.emptyCard}>
                  <Disc3 size={44} className={styles.emptyIcon} aria-hidden="true" />
                  <h2 className={styles.emptyHeading}>No Rated Albums Yet</h2>
                  <p className={styles.emptyText}>
                    Community charts are dynamically calculated from member ratings. Discover music and submit your ratings to populate the chart!
                  </p>
                  <Link href="/discover" className="btn btn-primary">
                    Discover Music
                  </Link>
                </div>
              ) : (
                <ol className={styles.chartList}>
                  {albumRows.map((album, index) => {
                    const rank = index + 1;
                    const year = getYear(album.releaseDate);

                    return (
                      <li key={album.id} className={styles.chartItem}>
                        <span className={styles.rank}>{rank}</span>

                        <div className={styles.artworkWrapper}>
                          {album.coverUrl ? (
                            <img
                              src={album.coverUrl}
                              alt={`${album.title} cover`}
                              className={styles.artwork}
                              loading="lazy"
                            />
                          ) : (
                            <div className={styles.artworkFallback}>
                              <Disc3 size={24} className={styles.fallbackIcon} aria-hidden="true" />
                            </div>
                          )}
                        </div>

                        <div className={styles.mainInfo}>
                          <Link href={`/music/${album.slug}`} className={styles.itemTitle}>
                            {album.title}
                          </Link>
                          <div className={styles.itemSubRow}>
                            {album.artistSlug ? (
                              <Link href={`/artists/${album.artistSlug}`} className={styles.itemArtist}>
                                {album.artistName}
                              </Link>
                            ) : (
                              <span className={styles.itemArtist}>{album.artistName || 'Unknown Artist'}</span>
                            )}
                            {year && <span className={styles.itemYear}>{year}</span>}
                          </div>
                        </div>

                        <div className={styles.ratingBox}>
                          <div className={styles.scoreRow}>
                            <Star size={16} className={styles.starIcon} aria-hidden="true" />
                            <span className={styles.scoreNumber}>{scoreToDisplay(album.avgRating)}</span>
                          </div>
                          <span className={styles.ratingCount}>
                            {album.ratingCount} {album.ratingCount === 1 ? 'rating' : 'ratings'}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          )}

          {/* Tracks Chart */}
          {activeTab === 'tracks' && (
            <section aria-label="Top Tracks Chart">
              {trackRows.length === 0 ? (
                <div className={styles.emptyCard}>
                  <Music size={44} className={styles.emptyIcon} aria-hidden="true" />
                  <h2 className={styles.emptyHeading}>No Rated Tracks Yet</h2>
                  <p className={styles.emptyText}>
                    Community charts are dynamically calculated from member ratings. Listen to tracks and rate your favorites!
                  </p>
                  <Link href="/discover" className="btn btn-primary">
                    Explore Music
                  </Link>
                </div>
              ) : (
                <ol className={styles.chartList}>
                  {trackRows.map((track, index) => {
                    const rank = index + 1;

                    return (
                      <li key={track.id} className={styles.chartItem}>
                        <span className={styles.rank}>{rank}</span>

                        <div className={styles.artworkWrapper}>
                          {track.coverUrl ? (
                            <img
                              src={track.coverUrl}
                              alt=""
                              className={styles.artwork}
                              loading="lazy"
                            />
                          ) : (
                            <div className={styles.artworkFallback}>
                              <Music size={24} className={styles.fallbackIcon} aria-hidden="true" />
                            </div>
                          )}
                        </div>

                        <div className={styles.mainInfo}>
                          <span className={styles.itemTitle}>{track.title}</span>
                          <div className={styles.itemSubRow}>
                            {track.artistSlug ? (
                              <Link href={`/artists/${track.artistSlug}`} className={styles.itemArtist}>
                                {track.artistName}
                              </Link>
                            ) : (
                              <span className={styles.itemArtist}>{track.artistName}</span>
                            )}
                            {track.albumTitle && (
                              <span className={styles.albumMeta}>• {track.albumTitle}</span>
                            )}
                          </div>
                        </div>

                        <div className={styles.ratingBox}>
                          <div className={styles.scoreRow}>
                            <Star size={16} className={styles.starIcon} aria-hidden="true" />
                            <span className={styles.scoreNumber}>{scoreToDisplay(track.avgRating)}</span>
                          </div>
                          <span className={styles.ratingCount}>
                            {track.ratingCount} {track.ratingCount === 1 ? 'rating' : 'ratings'}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          )}

          {/* Artists Chart */}
          {activeTab === 'artists' && (
            <section aria-label="Top Artists Chart">
              {artistRows.length === 0 ? (
                <div className={styles.emptyCard}>
                  <User size={44} className={styles.emptyIcon} aria-hidden="true" />
                  <h2 className={styles.emptyHeading}>No Rated Artists Yet</h2>
                  <p className={styles.emptyText}>
                    Community charts reflect aggregate member ratings. Visit artist pages and submit your ratings to rank artists!
                  </p>
                  <Link href="/artists" className="btn btn-primary">
                    Browse Artists
                  </Link>
                </div>
              ) : (
                <ol className={styles.chartList}>
                  {artistRows.map((artist, index) => {
                    const rank = index + 1;
                    const initial = artist.name.trim().charAt(0).toUpperCase();

                    return (
                      <li key={artist.id} className={styles.chartItem}>
                        <span className={styles.rank}>{rank}</span>

                        <div className={`${styles.artworkWrapper} ${styles.artistAvatar}`}>
                          {artist.imageUrl ? (
                            <img
                              src={artist.imageUrl}
                              alt={artist.name}
                              className={styles.artwork}
                              loading="lazy"
                            />
                          ) : (
                            <div className={styles.avatarFallback}>
                              <span className={styles.avatarInitial}>{initial}</span>
                            </div>
                          )}
                        </div>

                        <div className={styles.mainInfo}>
                          <Link href={`/artists/${artist.slug}`} className={styles.itemTitle}>
                            {artist.name}
                          </Link>
                          <div className={styles.itemSubRow}>
                            {artist.country && <span className={styles.itemCountry}>{artist.country}</span>}
                            {artist.formedYear && <span className={styles.itemYear}>Est. {artist.formedYear}</span>}
                          </div>
                        </div>

                        <div className={styles.ratingBox}>
                          <div className={styles.scoreRow}>
                            <Star size={16} className={styles.starIcon} aria-hidden="true" />
                            <span className={styles.scoreNumber}>{scoreToDisplay(artist.avgRating)}</span>
                          </div>
                          <span className={styles.ratingCount}>
                            {artist.ratingCount} {artist.ratingCount === 1 ? 'rating' : 'ratings'}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
