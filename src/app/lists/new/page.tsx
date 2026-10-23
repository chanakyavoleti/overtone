'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Globe, Lock, Loader2 } from 'lucide-react';
import styles from './page.module.css';

export default function NewListPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth check on mount
  useEffect(() => {
    async function verifyAuth() {
      try {
        const res = await fetch('/api/users/me');
        if (!res.ok) {
          router.replace('/login');
          return;
        }
      } catch {
        router.replace('/login');
        return;
      } finally {
        setCheckingAuth(false);
      }
    }
    verifyAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('List title is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          isPublic,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create list');
      }

      // Redirect to the newly created list page
      if (data.listId) {
        router.push(`/lists/${data.listId}`);
      } else {
        router.push('/my/lists');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className={styles.container} style={{ textAlign: 'center', padding: 'var(--space-16) 0' }}>
        <Loader2 size={32} className="spin" style={{ color: 'var(--color-accent)', margin: '0 auto' }} />
        <p style={{ marginTop: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>
          Verifying session...
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Link href="/my/lists" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden="true" /> Back to My Lists
      </Link>

      <div className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>Create New List</h1>
          <p className={styles.subtitle}>
            Organize albums into custom rankings, themes, or recommendations
          </p>
        </header>

        {error && (
          <div role="alert" className={styles.errorBanner}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.field}>
            <div className={styles.fieldHeader}>
              <label htmlFor="list-title" className={styles.label}>
                Title <span aria-hidden="true" style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <span className={styles.charCount}>{title.length}/200</span>
            </div>
            <input
              id="list-title"
              type="text"
              className={styles.input}
              placeholder="e.g. Favorite Art Rock of the 90s, Essential Ambient Works..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              aria-required="true"
              disabled={loading}
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <div className={styles.fieldHeader}>
              <label htmlFor="list-description" className={styles.label}>
                Description
              </label>
              <span className={styles.charCount}>{description.length}/2000</span>
            </div>
            <textarea
              id="list-description"
              className={styles.textarea}
              placeholder="Add context, guidelines, or criteria for this list..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              disabled={loading}
              rows={4}
            />
          </div>

          {/* Privacy Switch */}
          <div
            className={styles.toggleCard}
            onClick={() => !loading && setIsPublic(!isPublic)}
            role="switch"
            aria-checked={isPublic}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setIsPublic(!isPublic);
              }
            }}
          >
            <div className={styles.toggleInfo}>
              <span className={styles.toggleTitle}>
                {isPublic ? (
                  <>
                    <Globe size={16} style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                    Public List
                  </>
                ) : (
                  <>
                    <Lock size={16} style={{ color: 'var(--color-text-secondary)' }} aria-hidden="true" />
                    Private List
                  </>
                )}
              </span>
              <span className={styles.toggleDescription}>
                {isPublic
                  ? 'Visible on your profile and accessible to the Overtone community'
                  : 'Only visible to you when logged in'}
              </span>
            </div>

            <div
              className={`${styles.toggleSwitch} ${
                isPublic ? styles.toggleSwitchActive : ''
              }`}
              aria-hidden="true"
            >
              <div className={styles.toggleKnob} />
            </div>
          </div>

          <div className={styles.actions}>
            <Link href="/my/lists" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !title.trim()}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" /> Creating...
                </>
              ) : (
                'Create List'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
