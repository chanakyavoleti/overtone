'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Globe, Lock, Trash2, ExternalLink, ListMusic, Music } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import styles from './page.module.css';

export interface UserListSummary {
  id: number;
  title: string;
  description: string | null;
  isPublic: number;
  coverUrl: string | null;
  createdAt: number | null;
  updatedAt: number | null;
  itemCount: number;
}

export default function ListsClient({ initialLists }: { initialLists: UserListSummary[] }) {
  const [lists, setLists] = useState<UserListSummary[]>(initialLists);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async (id: number, title: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(id);
    setError(null);

    try {
      const res = await fetch(`/api/lists/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete list');
      }

      setLists((prev) => prev.filter((l) => l.id !== id));
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      {error && (
        <div
          role="alert"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            marginBottom: 'var(--space-6)',
            background: 'var(--color-error-bg)',
            color: 'var(--color-error)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-error)',
            fontSize: 'var(--text-sm)',
          }}
        >
          {error}
        </div>
      )}

      {lists.length === 0 ? (
        <div className={styles.emptyState}>
          <ListMusic className={styles.emptyIcon} size={48} aria-hidden="true" />
          <h2 className={styles.emptyTitle}>No lists created yet</h2>
          <p className={styles.emptyText}>
            Create your first custom music list — rank your favorite albums, make a genre guide, or assemble a listening queue.
          </p>
          <Link href="/lists/new" className="btn btn-primary">
            <Plus size={16} /> Create New List
          </Link>
        </div>
      ) : (
        <ul className={styles.listsGrid} role="list" aria-label="Your custom lists">
          {lists.map((list) => (
            <li key={list.id} className={styles.listCard}>
              <div className={styles.cardHeader}>
                <Link href={`/lists/${list.id}`} className={styles.listTitle}>
                  {list.title}
                </Link>
                <span
                  className={`${styles.visibilityBadge} ${
                    list.isPublic ? styles.badgePublic : styles.badgePrivate
                  }`}
                  title={list.isPublic ? 'Public list' : 'Private list'}
                >
                  {list.isPublic ? (
                    <>
                      <Globe size={12} aria-hidden="true" /> Public
                    </>
                  ) : (
                    <>
                      <Lock size={12} aria-hidden="true" /> Private
                    </>
                  )}
                </span>
              </div>

              {list.description ? (
                <p className={styles.description}>{list.description}</p>
              ) : (
                <p className={styles.description} style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                  No description provided.
                </p>
              )}

              <div className={styles.cardMeta}>
                <span>
                  <Music size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                  {list.itemCount} {list.itemCount === 1 ? 'album' : 'albums'}
                </span>
                <span>Updated {formatDate(list.updatedAt)}</span>
              </div>

              <div className={styles.cardActions}>
                <Link href={`/lists/${list.id}`} className={styles.actionLink}>
                  <ExternalLink size={14} /> View
                </Link>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(list.id, list.title)}
                  disabled={deletingId === list.id}
                  aria-label={`Delete list ${list.title}`}
                >
                  <Trash2 size={14} />
                  {deletingId === list.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
