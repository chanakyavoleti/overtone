'use client';

import { useState, useCallback, useRef } from 'react';
import styles from './RatingControl.module.css';

interface RatingControlProps {
  targetType: 'album' | 'track' | 'artist';
  targetId: number;
  currentRating?: number | null; // 0-100
  onRatingSaved?: (score: number) => void;
  onRatingCleared?: () => void;
  isAuthenticated: boolean;
  label?: string;
}

function scoreToDisplay(score: number): string {
  return (score / 10).toFixed(1);
}

export default function RatingControl({
  targetType,
  targetId,
  currentRating,
  onRatingSaved,
  onRatingCleared,
  isAuthenticated,
  label = 'Your rating',
}: RatingControlProps) {
  const [score, setScore] = useState<number | null>(currentRating ?? null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const messageTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    if (messageTimeout.current) clearTimeout(messageTimeout.current);
    messageTimeout.current = setTimeout(() => setMessage(null), 3000);
  }, []);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setScore(val);
    setMessage(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (score === null || !isAuthenticated) return;

    setSaving(true);
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, score }),
      });

      if (res.ok) {
        showMessage('success', 'Rating saved');
        onRatingSaved?.(score);
      } else {
        const data = await res.json();
        showMessage('error', data.error || 'Failed to save');
      }
    } catch {
      showMessage('error', 'Network error');
    } finally {
      setSaving(false);
    }
  }, [score, targetType, targetId, isAuthenticated, onRatingSaved, showMessage]);

  const handleClear = useCallback(async () => {
    if (!isAuthenticated) return;

    setSaving(true);
    try {
      const res = await fetch('/api/ratings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId }),
      });

      if (res.ok) {
        setScore(null);
        showMessage('success', 'Rating removed');
        onRatingCleared?.();
      } else {
        showMessage('error', 'Failed to remove');
      }
    } catch {
      showMessage('error', 'Network error');
    } finally {
      setSaving(false);
    }
  }, [targetType, targetId, isAuthenticated, onRatingCleared, showMessage]);

  if (!isAuthenticated) {
    return null;
  }

  const fillPercent = score !== null ? score : 0;

  return (
    <div className={styles.ratingControl}>
      <span className={styles.ratingLabel} id={`rating-label-${targetType}-${targetId}`}>
        {label}
      </span>

      <div className={styles.ratingSlider}>
        <div className={styles.sliderTrack}>
          <div className={styles.sliderFill} style={{ width: `${fillPercent}%` }} />
          <input
            type="range"
            className={styles.sliderInput}
            min={0}
            max={100}
            step={5}
            value={score ?? 0}
            onChange={handleSliderChange}
            aria-labelledby={`rating-label-${targetType}-${targetId}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={score ?? 0}
            aria-valuetext={score !== null ? `${scoreToDisplay(score)} out of 10` : 'No rating'}
          />
          {score !== null && (
            <div className={styles.sliderThumb} style={{ left: `${fillPercent}%` }} />
          )}
        </div>

        <span className={styles.scoreDisplay}>
          {score !== null ? scoreToDisplay(score) : <span className={styles.scoreEmpty}>—</span>}
        </span>
      </div>

      <div className={styles.ratingActions}>
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving || score === null}
          type="button"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>

        {score !== null && currentRating !== undefined && currentRating !== null && (
          <button
            className={styles.clearBtn}
            onClick={handleClear}
            disabled={saving}
            type="button"
          >
            Remove
          </button>
        )}

        {message && (
          <span
            className={message.type === 'success' ? styles.savedMessage : styles.errorMessage}
            role="status"
            aria-live="polite"
          >
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}

/* Static rating display badge */
export function RatingBadge({
  score,
  count,
}: {
  score: number | null;
  count: number;
}) {
  if (score === null || count === 0) {
    return (
      <div className={styles.ratingBadge}>
        <span className={styles.ratingBadgeScore} style={{ color: 'var(--color-text-tertiary)' }}>
          —
        </span>
        <span className={styles.ratingBadgeCount}>No ratings yet</span>
      </div>
    );
  }

  return (
    <div className={styles.ratingBadge}>
      <span className={styles.ratingBadgeScore}>{scoreToDisplay(score)}</span>
      <span className={styles.ratingBadgeMax}>/ 10</span>
      <span className={styles.ratingBadgeCount}>
        {count.toLocaleString()} {count === 1 ? 'rating' : 'ratings'}
      </span>
    </div>
  );
}
