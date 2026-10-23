'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, AlertCircle, Loader2, Plus, Disc3, Mic2, Music } from 'lucide-react';
import styles from './page.module.css';

interface SimpleArtist {
  id: number;
  name: string;
  slug: string;
}

interface SimpleAlbum {
  id: number;
  title: string;
  slug: string;
  artistId: number | null;
}

type TabType = 'artist' | 'album' | 'track';

export default function AdminCatalogPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('artist');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dropdown options
  const [artistsList, setArtistsList] = useState<SimpleArtist[]>([]);
  const [albumsList, setAlbumsList] = useState<SimpleAlbum[]>([]);

  // 1. Artist Form State
  const [artistForm, setArtistForm] = useState({
    name: '',
    country: '',
    formedYear: '',
    disbandedYear: '',
    imageUrl: '',
    bio: '',
  });

  // 2. Album Form State
  const [albumForm, setAlbumForm] = useState({
    title: '',
    artistId: '',
    releaseDate: '',
    albumType: 'album',
    coverUrl: '',
    label: '',
    runtimeSeconds: '',
    trackCount: '',
  });

  // 3. Track Form State
  const [trackForm, setTrackForm] = useState({
    title: '',
    albumId: '',
    artistId: '',
    trackNumber: '1',
    discNumber: '1',
    durationSeconds: '',
    explicit: false,
  });

  // Check auth & fetch options
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/admin/catalog');
        if (res.status === 403 || res.status === 401) {
          router.replace('/');
          return;
        }
        if (!res.ok) {
          throw new Error('Failed to load catalog');
        }
        const data = await res.json();
        setArtistsList(data.artists || []);
        setAlbumsList(data.albums || []);
      } catch {
        router.replace('/');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  const handleArtistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artistForm.name.trim()) {
      setErrorMsg('Artist name is required.');
      return;
    }

    setSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/admin/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'artist',
          data: artistForm,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add artist');

      setSuccessMsg(`Artist "${artistForm.name}" created successfully (Slug: ${data.slug}).`);
      setArtistsList((prev) => [...prev, { id: data.id, name: artistForm.name, slug: data.slug }]);
      setArtistForm({
        name: '',
        country: '',
        formedYear: '',
        disbandedYear: '',
        imageUrl: '',
        bio: '',
      });
    } catch (err: unknown) {
      if (err instanceof Error) setErrorMsg(err.message);
      else setErrorMsg('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAlbumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumForm.title.trim()) {
      setErrorMsg('Album title is required.');
      return;
    }

    setSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/admin/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'album',
          data: albumForm,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add album');

      setSuccessMsg(`Album "${albumForm.title}" created successfully (Slug: ${data.slug}).`);
      setAlbumsList((prev) => [
        ...prev,
        {
          id: data.id,
          title: albumForm.title,
          slug: data.slug,
          artistId: albumForm.artistId ? parseInt(albumForm.artistId, 10) : null,
        },
      ]);
      setAlbumForm({
        title: '',
        artistId: '',
        releaseDate: '',
        albumType: 'album',
        coverUrl: '',
        label: '',
        runtimeSeconds: '',
        trackCount: '',
      });
    } catch (err: unknown) {
      if (err instanceof Error) setErrorMsg(err.message);
      else setErrorMsg('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackForm.title.trim()) {
      setErrorMsg('Track title is required.');
      return;
    }

    setSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/admin/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'track',
          data: trackForm,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add track');

      setSuccessMsg(`Track "${trackForm.title}" created successfully.`);
      setTrackForm({
        title: '',
        albumId: trackForm.albumId, // keep active album selected for convenience
        artistId: trackForm.artistId,
        trackNumber: String((parseInt(trackForm.trackNumber, 10) || 1) + 1),
        discNumber: '1',
        durationSeconds: '',
        explicit: false,
      });
    } catch (err: unknown) {
      if (err instanceof Error) setErrorMsg(err.message);
      else setErrorMsg('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Sync track artist when album is selected
  const handleTrackAlbumChange = (albumIdStr: string) => {
    const selectedAlbum = albumsList.find((a) => a.id === parseInt(albumIdStr, 10));
    setTrackForm((prev) => ({
      ...prev,
      albumId: albumIdStr,
      artistId: selectedAlbum?.artistId ? String(selectedAlbum.artistId) : prev.artistId,
    }));
  };

  if (loading) {
    return (
      <div className={styles.container} style={{ textAlign: 'center', padding: 'var(--space-16) 0' }}>
        <Loader2 size={36} className="spin" style={{ color: 'var(--color-accent)', margin: '0 auto' }} />
        <p style={{ marginTop: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>
          Verifying administrative permissions...
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Link href="/admin" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden="true" /> Back to Dashboard
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>Catalog Management</h1>
        <p className={styles.subtitle}>
          Add artists, release albums, and discography tracks to Overtone
        </p>
      </header>

      {/* Tabs */}
      <nav className={styles.tabsNav} aria-label="Catalog entity type selection">
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'artist' ? styles.tabBtnActive : ''}`}
          onClick={() => {
            setActiveTab('artist');
            setSuccessMsg(null);
            setErrorMsg(null);
          }}
          aria-selected={activeTab === 'artist'}
        >
          <Mic2 size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
          Add Artist
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'album' ? styles.tabBtnActive : ''}`}
          onClick={() => {
            setActiveTab('album');
            setSuccessMsg(null);
            setErrorMsg(null);
          }}
          aria-selected={activeTab === 'album'}
        >
          <Disc3 size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
          Add Album
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'track' ? styles.tabBtnActive : ''}`}
          onClick={() => {
            setActiveTab('track');
            setSuccessMsg(null);
            setErrorMsg(null);
          }}
          aria-selected={activeTab === 'track'}
        >
          <Music size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
          Add Track
        </button>
      </nav>

      {successMsg && (
        <div role="status" className={styles.alertSuccess}>
          <CheckCircle size={16} aria-hidden="true" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div role="alert" className={styles.alertError}>
          <AlertCircle size={16} aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. Artist Form */}
      {activeTab === 'artist' && (
        <div className={styles.formCard}>
          <form onSubmit={handleArtistSubmit} className={styles.form}>
            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label htmlFor="artist-name" className={styles.label}>
                  Artist / Band Name <span className={styles.required}>*</span>
                </label>
                <input
                  id="artist-name"
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Radiohead"
                  value={artistForm.name}
                  onChange={(e) => setArtistForm({ ...artistForm, name: e.target.value })}
                  required
                  disabled={submitting}
                  autoFocus
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="artist-country" className={styles.label}>
                  Country / Origin
                </label>
                <input
                  id="artist-country"
                  type="text"
                  className={styles.input}
                  placeholder="e.g. United Kingdom"
                  value={artistForm.country}
                  onChange={(e) => setArtistForm({ ...artistForm, country: e.target.value })}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label htmlFor="artist-formed" className={styles.label}>
                  Formed Year
                </label>
                <input
                  id="artist-formed"
                  type="number"
                  className={styles.input}
                  placeholder="e.g. 1985"
                  value={artistForm.formedYear}
                  onChange={(e) => setArtistForm({ ...artistForm, formedYear: e.target.value })}
                  disabled={submitting}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="artist-disbanded" className={styles.label}>
                  Disbanded Year (if applicable)
                </label>
                <input
                  id="artist-disbanded"
                  type="number"
                  className={styles.input}
                  placeholder="e.g. 2011"
                  value={artistForm.disbandedYear}
                  onChange={(e) => setArtistForm({ ...artistForm, disbandedYear: e.target.value })}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="artist-image" className={styles.label}>
                Artist Image URL
              </label>
              <input
                id="artist-image"
                type="url"
                className={styles.input}
                placeholder="https://... or /images/artists/..."
                value={artistForm.imageUrl}
                onChange={(e) => setArtistForm({ ...artistForm, imageUrl: e.target.value })}
                disabled={submitting}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="artist-bio" className={styles.label}>
                Biography / History
              </label>
              <textarea
                id="artist-bio"
                className={styles.textarea}
                placeholder="Brief summary of the artist's style, notable milestones, and influence..."
                value={artistForm.bio}
                onChange={(e) => setArtistForm({ ...artistForm, bio: e.target.value })}
                disabled={submitting}
                rows={4}
              />
            </div>

            <div className={styles.actions}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 size={16} className="spin" /> Creating Artist...
                  </>
                ) : (
                  <>
                    <Plus size={16} /> Add Artist
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Album Form */}
      {activeTab === 'album' && (
        <div className={styles.formCard}>
          <form onSubmit={handleAlbumSubmit} className={styles.form}>
            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label htmlFor="album-title" className={styles.label}>
                  Album Title <span className={styles.required}>*</span>
                </label>
                <input
                  id="album-title"
                  type="text"
                  className={styles.input}
                  placeholder="e.g. OK Computer"
                  value={albumForm.title}
                  onChange={(e) => setAlbumForm({ ...albumForm, title: e.target.value })}
                  required
                  disabled={submitting}
                  autoFocus
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="album-artist" className={styles.label}>
                  Primary Artist
                </label>
                <select
                  id="album-artist"
                  className={styles.select}
                  value={albumForm.artistId}
                  onChange={(e) => setAlbumForm({ ...albumForm, artistId: e.target.value })}
                  disabled={submitting}
                >
                  <option value="">-- Select an Artist --</option>
                  {artistsList.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label htmlFor="album-date" className={styles.label}>
                  Release Date
                </label>
                <input
                  id="album-date"
                  type="text"
                  className={styles.input}
                  placeholder="YYYY-MM-DD or YYYY"
                  value={albumForm.releaseDate}
                  onChange={(e) => setAlbumForm({ ...albumForm, releaseDate: e.target.value })}
                  disabled={submitting}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="album-type" className={styles.label}>
                  Album Type
                </label>
                <select
                  id="album-type"
                  className={styles.select}
                  value={albumForm.albumType}
                  onChange={(e) => setAlbumForm({ ...albumForm, albumType: e.target.value })}
                  disabled={submitting}
                >
                  <option value="album">Studio Album</option>
                  <option value="ep">EP</option>
                  <option value="single">Single</option>
                  <option value="compilation">Compilation</option>
                </select>
              </div>
            </div>

            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label htmlFor="album-cover" className={styles.label}>
                  Cover Image URL
                </label>
                <input
                  id="album-cover"
                  type="url"
                  className={styles.input}
                  placeholder="https://... or /images/albums/..."
                  value={albumForm.coverUrl}
                  onChange={(e) => setAlbumForm({ ...albumForm, coverUrl: e.target.value })}
                  disabled={submitting}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="album-label" className={styles.label}>
                  Record Label
                </label>
                <input
                  id="album-label"
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Parlophone, XL Recordings"
                  value={albumForm.label}
                  onChange={(e) => setAlbumForm({ ...albumForm, label: e.target.value })}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label htmlFor="album-runtime" className={styles.label}>
                  Runtime (in seconds)
                </label>
                <input
                  id="album-runtime"
                  type="number"
                  className={styles.input}
                  placeholder="e.g. 3192"
                  value={albumForm.runtimeSeconds}
                  onChange={(e) => setAlbumForm({ ...albumForm, runtimeSeconds: e.target.value })}
                  disabled={submitting}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="album-tracks" className={styles.label}>
                  Track Count
                </label>
                <input
                  id="album-tracks"
                  type="number"
                  className={styles.input}
                  placeholder="e.g. 12"
                  value={albumForm.trackCount}
                  onChange={(e) => setAlbumForm({ ...albumForm, trackCount: e.target.value })}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className={styles.actions}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 size={16} className="spin" /> Creating Album...
                  </>
                ) : (
                  <>
                    <Plus size={16} /> Add Album
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Track Form */}
      {activeTab === 'track' && (
        <div className={styles.formCard}>
          <form onSubmit={handleTrackSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="track-title" className={styles.label}>
                Track Title <span className={styles.required}>*</span>
              </label>
              <input
                id="track-title"
                type="text"
                className={styles.input}
                placeholder="e.g. Paranoid Android"
                value={trackForm.title}
                onChange={(e) => setTrackForm({ ...trackForm, title: e.target.value })}
                required
                disabled={submitting}
                autoFocus
              />
            </div>

            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label htmlFor="track-album" className={styles.label}>
                  Album
                </label>
                <select
                  id="track-album"
                  className={styles.select}
                  value={trackForm.albumId}
                  onChange={(e) => handleTrackAlbumChange(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">-- Select Album --</option>
                  {albumsList.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="track-artist" className={styles.label}>
                  Artist
                </label>
                <select
                  id="track-artist"
                  className={styles.select}
                  value={trackForm.artistId}
                  onChange={(e) => setTrackForm({ ...trackForm, artistId: e.target.value })}
                  disabled={submitting}
                >
                  <option value="">-- Select Artist --</option>
                  {artistsList.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label htmlFor="track-number" className={styles.label}>
                  Track Number
                </label>
                <input
                  id="track-number"
                  type="number"
                  className={styles.input}
                  value={trackForm.trackNumber}
                  onChange={(e) => setTrackForm({ ...trackForm, trackNumber: e.target.value })}
                  disabled={submitting}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="track-disc" className={styles.label}>
                  Disc Number
                </label>
                <input
                  id="track-disc"
                  type="number"
                  className={styles.input}
                  value={trackForm.discNumber}
                  onChange={(e) => setTrackForm({ ...trackForm, discNumber: e.target.value })}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label htmlFor="track-duration" className={styles.label}>
                  Duration (in seconds)
                </label>
                <input
                  id="track-duration"
                  type="number"
                  className={styles.input}
                  placeholder="e.g. 383 (for 6:23)"
                  value={trackForm.durationSeconds}
                  onChange={(e) => setTrackForm({ ...trackForm, durationSeconds: e.target.value })}
                  disabled={submitting}
                />
              </div>

              <div className={styles.field} style={{ justifyContent: 'center' }}>
                <label className={styles.checkboxField}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={trackForm.explicit}
                    onChange={(e) => setTrackForm({ ...trackForm, explicit: e.target.checked })}
                    disabled={submitting}
                  />
                  <span className={styles.checkboxLabel}>Explicit Content Advisory</span>
                </label>
              </div>
            </div>

            <div className={styles.actions}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 size={16} className="spin" /> Adding Track...
                  </>
                ) : (
                  <>
                    <Plus size={16} /> Add Track
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
