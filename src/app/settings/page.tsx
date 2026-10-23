'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  X,
} from 'lucide-react';
import styles from './page.module.css';

interface UserData {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
  bio: string | null;
  role: string;
  createdAt: number | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form fields
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');

  // Alerts
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserData() {
      try {
        const res = await fetch('/api/users/me');
        if (!res.ok) {
          router.replace('/login');
          return;
        }
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          setDisplayName(data.user.displayName || '');
          setBio(data.user.bio || '');
        } else {
          router.replace('/login');
        }
      } catch {
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          bio: bio.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update settings');
      }

      setUser(data.user);
      setSuccessMsg('Profile settings saved successfully.');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('An unexpected error occurred');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm account deletion.');
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch('/api/users/me', {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete account');
      }

      // Successful deletion — redirect to home page
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setDeleteError(err.message);
      } else {
        setDeleteError('An unexpected error occurred during account deletion');
      }
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container} style={{ textAlign: 'center', padding: 'var(--space-16) 0' }}>
        <Loader2 size={36} className="spin" style={{ color: 'var(--color-accent)', margin: '0 auto' }} />
        <p style={{ marginTop: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>
          Loading account settings...
        </p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Account Settings</h1>
        <p className={styles.subtitle}>
          Manage your public profile information and account preferences
        </p>
      </header>

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

      {/* Section 1: Public Profile */}
      <section className={styles.card} aria-labelledby="profile-heading">
        <div className={styles.cardHeader}>
          <h2 id="profile-heading" className={styles.cardTitle}>
            Public Profile
          </h2>
          <p className={styles.cardSubtitle}>
            This information is shown to other music lovers across Overtone
          </p>
        </div>

        <form onSubmit={handleSaveProfile} className={styles.form}>
          <div className={styles.field}>
            <div className={styles.fieldHeader}>
              <label htmlFor="displayName" className={styles.label}>
                Display Name
              </label>
              <span className={styles.charCount}>{displayName.length}/50</span>
            </div>
            <input
              id="displayName"
              type="text"
              className={styles.input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              placeholder="e.g. Thom Yorke"
              disabled={saving}
            />
          </div>

          <div className={styles.field}>
            <div className={styles.fieldHeader}>
              <label htmlFor="bio" className={styles.label}>
                Bio
              </label>
              <span className={styles.charCount}>{bio.length}/1000</span>
            </div>
            <textarea
              id="bio"
              className={styles.textarea}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={1000}
              placeholder="Tell other music enthusiasts about your favorite genres, eras, or listening habits..."
              disabled={saving}
              rows={4}
            />
          </div>

          <div className={styles.cardActions}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={16} className="spin" /> Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Section 2: Account Details (Read-only) */}
      <section className={styles.card} aria-labelledby="account-heading">
        <div className={styles.cardHeader}>
          <h2 id="account-heading" className={styles.cardTitle}>
            Account Information
          </h2>
          <p className={styles.cardSubtitle}>
            Your core authentication details and membership credentials
          </p>
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Username</span>
            <span className={styles.infoValue}>@{user.username}</span>
          </div>

          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Email Address</span>
            <span className={styles.infoValue}>{user.email}</span>
          </div>

          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Account Role</span>
            <span className={styles.infoValue} style={{ textTransform: 'capitalize' }}>
              {user.role}
            </span>
          </div>

          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Member Since</span>
            <span className={styles.infoValue}>{formatDate(user.createdAt)}</span>
          </div>
        </div>
      </section>

      {/* Section 3: Danger Zone */}
      <section
        className={`${styles.card} ${styles.dangerCard}`}
        aria-labelledby="danger-heading"
      >
        <div className={`${styles.cardHeader} ${styles.dangerHeader}`}>
          <h2 id="danger-heading" className={`${styles.cardTitle} ${styles.dangerTitle}`}>
            Danger Zone
          </h2>
          <p className={styles.cardSubtitle}>
            Irreversible actions that permanently delete your data
          </p>
        </div>

        <div className={styles.dangerContent}>
          <p className={styles.dangerText}>
            Deleting your account will permanently remove your profile, ratings, written reviews,
            and custom lists. This action is irreversible.
          </p>
          <button
            type="button"
            className={styles.dangerBtn}
            onClick={() => {
              setDeleteConfirmationText('');
              setDeleteError(null);
              setShowDeleteModal(true);
            }}
          >
            <Trash2 size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            Delete Account
          </button>
        </div>
      </section>

      {/* Confirmation Dialog Modal */}
      {showDeleteModal && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) {
              setShowDeleteModal(false);
            }
          }}
        >
          <div className={styles.modal}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 id="delete-dialog-title" className={styles.modalTitle}>
                Confirm Account Deletion
              </h3>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                aria-label="Close dialog"
                style={{ padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <p className={styles.modalText}>
              Are you sure you want to permanently delete your account (<strong>@{user.username}</strong>)?
              All of your music ratings, reviews, collections, and created lists will be deleted forever.
            </p>

            <div className={styles.confirmInputWrapper}>
              <label htmlFor="confirm-delete-input" className={styles.label}>
                To confirm, type <strong>DELETE</strong> below:
              </label>
              <input
                id="confirm-delete-input"
                type="text"
                className={styles.input}
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE"
                autoFocus
                disabled={deleting}
              />
            </div>

            {deleteError && (
              <div role="alert" className={styles.alertError} style={{ margin: 0 }}>
                <AlertCircle size={16} />
                <span>{deleteError}</span>
              </div>
            )}

            <div className={styles.modalActions}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.dangerBtn}
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmationText !== 'DELETE'}
              >
                {deleting ? (
                  <>
                    <Loader2 size={16} className="spin" /> Deleting...
                  </>
                ) : (
                  'Permanently Delete Account'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
