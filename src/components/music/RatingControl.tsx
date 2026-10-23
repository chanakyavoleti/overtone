'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Star, X, Loader2 } from 'lucide-react';
import styles from './RatingControl.module.css';

interface RatingControlProps {
  targetType: 'album' | 'track' | 'artist';
  targetId: number;
  initialRating?: number | null; // 0-100 scale
  targetName?: string;
}

export default function RatingControl({
  targetType,
  targetId,
  initialRating = null,
  targetName,
}: RatingControlProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentScore, setCurrentScore] = useState<number | null>(initialRating);
  const [hoverScore, setHoverScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Score display helper (0-100 -> 0.0-10.0)
  const displayScore = (score: number) => (score / 10).toFixed(1);

  // Rate action
  const handleRate = async (score: number) => {
    setError(null);
    const previousScore = currentScore;
    setCurrentScore(score);

    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId,
          score,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit rating');
      }

      setIsOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: unknown) {
      setCurrentScore(previousScore);
      setError(err instanceof Error ? err.message : 'Failed to rate');
    }
  };

  // Remove rating
  const handleRemove = async () => {
    setError(null);
    const previousScore = currentScore;
    setCurrentScore(null);

    try {
      const res = await fetch('/api/ratings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete rating');
      }

      setIsOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: unknown) {
      setCurrentScore(previousScore);
      setError(err instanceof Error ? err.message : 'Failed to remove rating');
    }
  };

  const activeDisplay = hoverScore !== null ? hoverScore : currentScore;

  return (
    <div className={styles.container}>
      <div className={styles.triggerRow}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`${styles.ratingButton} ${currentScore !== null ? styles.hasRating : ''}`}
          aria-expanded={isOpen}
          aria-label={
            currentScore !== null
              ? `Your rating for ${targetName || targetType} is ${displayScore(currentScore)} out of 10. Click to change.`
              : `Rate ${targetName || targetType}`
          }
        >
          <Star
            size={18}
            className={`${styles.starIcon} ${currentScore !== null ? styles.starFilled : ''}`}
            aria-hidden="true"
          />
          <span className={styles.ratingText}>
            {currentScore !== null ? (
              <>
                <span className={styles.ratingPrefix}>Your Rating:</span>{' '}
                <strong className={styles.ratingValue}>{displayScore(currentScore)}</strong>
                <span className={styles.ratingMax}>/10</span>
              </>
            ) : (
              <span>Rate this {targetType}</span>
            )}
          </span>
          {isPending && <Loader2 size={14} className={styles.spinner} aria-label="Saving rating" />}
        </button>

        {currentScore !== null && (
          <button
            type="button"
            onClick={handleRemove}
            className={styles.clearBtn}
            title="Remove your rating"
            aria-label="Remove your rating"
            disabled={isPending}
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className={styles.popover} role="dialog" aria-label={`Rate ${targetName || targetType}`}>
          <div className={styles.popoverHeader}>
            <span className={styles.popoverTitle}>
              {activeDisplay !== null ? (
                <>
                  Score: <strong>{displayScore(activeDisplay)}</strong> / 10
                </>
              ) : (
                'Select your score (1.0 – 10.0)'
              )}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={styles.closePopoverBtn}
              aria-label="Close rating panel"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>

          {/* 10 Star icons with 0.5 step hover */}
          <div
            className={styles.starRow}
            onMouseLeave={() => setHoverScore(null)}
            role="radiogroup"
            aria-label="Rating scale from 1 to 10"
          >
            {Array.from({ length: 10 }, (_, i) => {
              const fullStarScore = (i + 1) * 10;
              const halfStarScore = (i + 1) * 10 - 5;
              const isFilled = activeDisplay !== null && activeDisplay >= fullStarScore;
              const isHalf = activeDisplay !== null && activeDisplay >= halfStarScore && activeDisplay < fullStarScore;

              return (
                <div key={i} className={styles.starWrapper}>
                  {/* Left half button for half star */}
                  <button
                    type="button"
                    className={styles.halfStarBtnLeft}
                    onMouseEnter={() => setHoverScore(halfStarScore)}
                    onClick={() => handleRate(halfStarScore)}
                    aria-label={`Rate ${displayScore(halfStarScore)}`}
                    disabled={isPending}
                  />
                  {/* Right half button for full star */}
                  <button
                    type="button"
                    className={styles.halfStarBtnRight}
                    onMouseEnter={() => setHoverScore(fullStarScore)}
                    onClick={() => handleRate(fullStarScore)}
                    aria-label={`Rate ${displayScore(fullStarScore)}`}
                    disabled={isPending}
                  />

                  <Star
                    size={22}
                    className={`${styles.rateStar} ${
                      isFilled ? styles.rateStarFilled : isHalf ? styles.rateStarHalf : styles.rateStarEmpty
                    }`}
                    aria-hidden="true"
                  />
                </div>
              );
            })}
          </div>

          {/* Quick preset buttons for convenience */}
          <div className={styles.presets}>
            {[20, 40, 60, 70, 80, 90, 100].map((presetScore) => (
              <button
                key={presetScore}
                type="button"
                onClick={() => handleRate(presetScore)}
                className={`${styles.presetBtn} ${currentScore === presetScore ? styles.presetActive : ''}`}
                disabled={isPending}
              >
                {displayScore(presetScore)}
              </button>
            ))}
          </div>

          {error && (
            <p className={styles.errorText} role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
