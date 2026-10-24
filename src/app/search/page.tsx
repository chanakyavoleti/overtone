'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Disc3, Mic2, Music, User as UserIcon, Clapperboard, Loader2 } from 'lucide-react';
import AlbumCard, { AlbumGrid } from '@/components/music/AlbumCard';
import SafeImage from '@/components/ui/SafeImage';
import styles from './page.module.css';

interface AlbumResult {
  id: number | string;
  title: string;
  slug: string;
  coverUrl: string | null;
  releaseDate: string | null;
  albumType: string;
  artistId: number;
  artistName: string | null;
}

interface ArtistResult {
  id: number | string;
  name: string;
  slug: string;
  imageUrl: string | null;
  country: string | null;
}

interface TrackResult {
  id: number | string;
  title: string;
  slug: string;
  durationSeconds?: number | null;
  albumId: number | string;
  artistId: number | string;
  artistName: string | null;
  albumTitle: string | null;
  albumSlug: string | null;
  coverUrl?: string | null;
}

interface UserResult {
  id: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface SearchResults {
  artists: ArtistResult[];
  albums: AlbumResult[];
  soundtracks: AlbumResult[];
  eps: AlbumResult[];
  tracks: TrackResult[];
  users: UserResult[];
}

type TabType = 'all' | 'artists' | 'albums' | 'soundtracks' | 'eps' | 'tracks' | 'users';

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialType = (searchParams.get('type') as TabType) || 'all';

  const [inputVal, setInputVal] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<TabType>(initialType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResults>({
    artists: [],
    albums: [],
    soundtracks: [],
    eps: [],
    tracks: [],
    users: [],
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const performSearch = useCallback(async (q: string, type: TabType) => {
    if (!q.trim()) {
      setResults({ artists: [], albums: [], soundtracks: [], eps: [], tracks: [], users: [] });
      setLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}&type=${type}`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error('Search request failed');
      }
      const data = await res.json();
      setResults(data.results || { artists: [], albums: [], soundtracks: [], eps: [], tracks: [], users: [] });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError('An error occurred while searching. Please try again.');
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    setInputVal(initialQuery);
    if (initialQuery) {
      performSearch(initialQuery, activeTab);
    }
  }, [initialQuery, activeTab, performSearch]);

  // Live search debounce when user types
  useEffect(() => {
    if (!inputVal.trim()) {
      setResults({ artists: [], albums: [], soundtracks: [], eps: [], tracks: [], users: [] });
      return;
    }
    const timer = setTimeout(() => {
      performSearch(inputVal, activeTab);
    }, 220);
    return () => clearTimeout(timer);
  }, [inputVal, activeTab, performSearch]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputVal.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}${activeTab !== 'all' ? `&type=${activeTab}` : ''}`);
    }
  };

  const handleTabChange = (newTab: TabType) => {
    setActiveTab(newTab);
    if (inputVal.trim()) {
      router.push(`/search?q=${encodeURIComponent(inputVal.trim())}${newTab !== 'all' ? `&type=${newTab}` : ''}`);
    }
  };

  const totalCount =
    results.artists.length +
    results.albums.length +
    results.soundtracks.length +
    results.eps.length +
    results.tracks.length +
    results.users.length;

  return (
    <div className={styles.searchPage}>
      <header className={styles.searchHeader}>
        <div className="container">
          <h1 className={styles.pageTitle}>Search</h1>

          <form onSubmit={handleFormSubmit} className={styles.searchForm} role="search">
            <div className={styles.inputWrapper}>
              <Search className={styles.searchIcon} size={20} aria-hidden="true" />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search artists, albums, soundtracks, EPs, tracks..."
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                autoFocus
                aria-label="Search query"
              />
              {loading && <Loader2 className={styles.loaderIcon} size={20} aria-hidden="true" />}
            </div>
            <button type="submit" className={styles.submitBtn}>
              Search
            </button>
          </form>

          {/* Navigation Category Tabs */}
          {initialQuery && (
            <div className={styles.tabs} role="tablist" aria-label="Search categories">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'all'}
                className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`}
                onClick={() => handleTabChange('all')}
              >
                All
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'artists'}
                className={`${styles.tab} ${activeTab === 'artists' ? styles.activeTab : ''}`}
                onClick={() => handleTabChange('artists')}
              >
                Artists {results.artists.length > 0 && `(${results.artists.length})`}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'albums'}
                className={`${styles.tab} ${activeTab === 'albums' ? styles.activeTab : ''}`}
                onClick={() => handleTabChange('albums')}
              >
                Albums {results.albums.length > 0 && `(${results.albums.length})`}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'soundtracks'}
                className={`${styles.tab} ${activeTab === 'soundtracks' ? styles.activeTab : ''}`}
                onClick={() => handleTabChange('soundtracks')}
              >
                Soundtracks {results.soundtracks.length > 0 && `(${results.soundtracks.length})`}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'eps'}
                className={`${styles.tab} ${activeTab === 'eps' ? styles.activeTab : ''}`}
                onClick={() => handleTabChange('eps')}
              >
                EPs & Singles {results.eps.length > 0 && `(${results.eps.length})`}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'tracks'}
                className={`${styles.tab} ${activeTab === 'tracks' ? styles.activeTab : ''}`}
                onClick={() => handleTabChange('tracks')}
              >
                Tracks {results.tracks.length > 0 && `(${results.tracks.length})`}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'users'}
                className={`${styles.tab} ${activeTab === 'users' ? styles.activeTab : ''}`}
                onClick={() => handleTabChange('users')}
              >
                Members {results.users.length > 0 && `(${results.users.length})`}
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="container">
        <div className={styles.content}>
          {error && (
            <div className={styles.errorMessage} role="alert">
              {error}
            </div>
          )}

          {!initialQuery && (
            <div className={styles.initialState}>
              <Search size={40} className={styles.initialIcon} aria-hidden="true" />
              <h2 className={styles.initialTitle}>Start searching</h2>
              <p className={styles.initialText}>
                Discover artists, studio albums, film soundtracks, singles & EPs, tracks, or fellow music lovers.
              </p>
            </div>
          )}

          {initialQuery && !loading && totalCount === 0 && (
            <div className={styles.emptyState}>
              <h2 className={styles.emptyTitle}>No results found</h2>
              <p className={styles.emptyText}>
                We couldn&apos;t find anything matching &ldquo;<strong>{initialQuery}</strong>&rdquo;. Check your spelling or try alternative aliases.
              </p>
            </div>
          )}

          {/* Artists Section */}
          {(activeTab === 'all' || activeTab === 'artists') && results.artists.length > 0 && (
            <section className={styles.resultSection} aria-labelledby="artists-heading">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleRow}>
                  <Mic2 size={20} aria-hidden="true" />
                  <h2 id="artists-heading" className={styles.sectionTitle}>
                    Artists
                  </h2>
                </div>
                {activeTab === 'all' && results.artists.length >= 6 && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('artists')}
                    className={styles.viewAllBtn}
                  >
                    View all artists &rarr;
                  </button>
                )}
              </div>
              <div className={styles.artistGrid}>
                {results.artists.map((artist) => (
                  <Link
                    key={artist.id}
                    href={`/artists/${artist.slug}`}
                    className={styles.artistCard}
                  >
                    <div className={styles.artistAvatarWrapper}>
                      <SafeImage
                        src={artist.imageUrl}
                        alt={artist.name}
                        className={styles.artistAvatar}
                        fallback={
                          <div className={styles.artistAvatarFallback}>
                            <Mic2 size={28} aria-hidden="true" />
                          </div>
                        }
                      />
                    </div>
                    <span className={styles.artistName}>{artist.name}</span>
                    {artist.country && (
                      <span className={styles.artistCountry}>{artist.country}</span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Studio Albums Section */}
          {(activeTab === 'all' || activeTab === 'albums') && results.albums.length > 0 && (
            <section className={styles.resultSection} aria-labelledby="albums-heading">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleRow}>
                  <Disc3 size={20} aria-hidden="true" />
                  <h2 id="albums-heading" className={styles.sectionTitle}>
                    Studio Albums
                  </h2>
                </div>
                {activeTab === 'all' && results.albums.length >= 5 && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('albums')}
                    className={styles.viewAllBtn}
                  >
                    View all albums &rarr;
                  </button>
                )}
              </div>
              <AlbumGrid columns={5}>
                {results.albums.map((album) => (
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

          {/* Soundtracks & Film Scores Section */}
          {(activeTab === 'all' || activeTab === 'soundtracks') && results.soundtracks.length > 0 && (
            <section className={styles.resultSection} aria-labelledby="soundtracks-heading">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleRow}>
                  <Clapperboard size={20} aria-hidden="true" />
                  <h2 id="soundtracks-heading" className={styles.sectionTitle}>
                    Soundtracks & Film Scores
                  </h2>
                </div>
                {activeTab === 'all' && results.soundtracks.length >= 5 && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('soundtracks')}
                    className={styles.viewAllBtn}
                  >
                    View all soundtracks &rarr;
                  </button>
                )}
              </div>
              <AlbumGrid columns={5}>
                {results.soundtracks.map((album) => (
                  <AlbumCard
                    key={album.id}
                    slug={album.slug}
                    title={album.title}
                    artistName={album.artistName || 'Soundtrack'}
                    coverUrl={album.coverUrl}
                    releaseDate={album.releaseDate}
                    albumType="soundtrack"
                  />
                ))}
              </AlbumGrid>
            </section>
          )}

          {/* EPs & Singles Section */}
          {(activeTab === 'all' || activeTab === 'eps') && results.eps.length > 0 && (
            <section className={styles.resultSection} aria-labelledby="eps-heading">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleRow}>
                  <Disc3 size={20} aria-hidden="true" />
                  <h2 id="eps-heading" className={styles.sectionTitle}>
                    EPs & Singles
                  </h2>
                </div>
                {activeTab === 'all' && results.eps.length >= 5 && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('eps')}
                    className={styles.viewAllBtn}
                  >
                    View all EPs & Singles &rarr;
                  </button>
                )}
              </div>
              <AlbumGrid columns={5}>
                {results.eps.map((album) => (
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

          {/* Tracks Section */}
          {(activeTab === 'all' || activeTab === 'tracks') && results.tracks.length > 0 && (
            <section className={styles.resultSection} aria-labelledby="tracks-heading">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleRow}>
                  <Music size={20} aria-hidden="true" />
                  <h2 id="tracks-heading" className={styles.sectionTitle}>
                    Tracks
                  </h2>
                </div>
                {activeTab === 'all' && results.tracks.length >= 5 && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('tracks')}
                    className={styles.viewAllBtn}
                  >
                    View all tracks &rarr;
                  </button>
                )}
              </div>
              <div className={styles.trackList}>
                {results.tracks.map((track) => (
                  <div key={track.id} className={styles.trackItem}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1, minWidth: 0 }}>
                      {track.coverUrl && (
                        <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0, background: 'var(--color-bg-recessed)' }}>
                          <SafeImage src={track.coverUrl} alt={track.title} fallback={<Music size={18} style={{ opacity: 0.3 }} />} />
                        </div>
                      )}
                      <div className={styles.trackInfo}>
                        <span className={styles.trackTitle}>{track.title}</span>
                        <div className={styles.trackSub}>
                          <span className={styles.trackArtist}>{track.artistName}</span>
                          {track.albumTitle && (
                            <>
                              <span className={styles.dot}>•</span>
                              {track.albumSlug ? (
                                <Link
                                  href={`/music/${track.albumSlug}`}
                                  className={styles.trackAlbumLink}
                                >
                                  {track.albumTitle}
                                </Link>
                              ) : (
                                <span>{track.albumTitle}</span>
                              )}
                            </>
                          )}
                          {track.durationSeconds ? (
                            <>
                              <span className={styles.dot}>•</span>
                              <span>{Math.floor(track.durationSeconds / 60)}:{String(track.durationSeconds % 60).padStart(2, '0')}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    {track.albumSlug && (
                      <Link
                        href={`/music/${track.albumSlug}`}
                        className={styles.viewAlbumBtn}
                      >
                        View Album
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Members / Users Section */}
          {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
            <section className={styles.resultSection} aria-labelledby="users-heading">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleRow}>
                  <UserIcon size={20} aria-hidden="true" />
                  <h2 id="users-heading" className={styles.sectionTitle}>
                    Members
                  </h2>
                </div>
                {activeTab === 'all' && results.users.length >= 5 && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('users')}
                    className={styles.viewAllBtn}
                  >
                    View all members &rarr;
                  </button>
                )}
              </div>
              <div className={styles.userGrid}>
                {results.users.map((user) => (
                  <Link
                    key={user.id}
                    href={`/user/${user.username}`}
                    className={styles.userCard}
                  >
                    <div className={styles.userAvatarWrapper}>
                      <SafeImage
                        src={user.avatarUrl}
                        alt=""
                        className={styles.userAvatar}
                        fallback={
                          <div className={styles.userAvatarFallback}>
                            {user.displayName
                              ? user.displayName.slice(0, 1).toUpperCase()
                              : user.username.slice(0, 1).toUpperCase()}
                          </div>
                        }
                      />
                    </div>
                    <div className={styles.userInfo}>
                      <span className={styles.userName}>
                        {user.displayName || user.username}
                      </span>
                      <span className={styles.userHandle}>@{user.username}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.searchPage}>
          <div className="container" style={{ padding: 'var(--space-12) var(--space-6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Loader2 className={styles.loaderIcon} size={24} />
              <span>Loading search...</span>
            </div>
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
