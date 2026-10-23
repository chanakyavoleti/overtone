'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, Star, User as UserIcon } from 'lucide-react';
import styles from './ReviewSection.module.css';

export interface ReviewItem {
  id: number;
  title: string | null;
  body: string;
  createdAt: number | null;
  userId: number;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  score: number | null;
}

interface ReviewSectionProps {
  albumId: number;
  albumTitle: string;
  initialReviews: ReviewItem[];
  currentUser: {
    id: number;
    username: string;
    displayName?: string | null;
  } | null;
}

function formatDate(timestamp: number | null): string {
  if (!timestamp) return '';
  // Timestamps in SQLite seed/API are either seconds or milliseconds
  const ms = timestamp > 10000000000 ? timestamp : timestamp * 1000;
  return new Date(ms).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function scoreToDisplay(score: number): string {
  return (score / 10).toFixed(1);
}

export default function ReviewSection({
  albumId,
  albumTitle,
  initialReviews,
  currentUser,
}: ReviewSectionProps) {
  const router = useRouter();
  const [reviewsList, setReviewsList] = useState<ReviewItem[]>(initialReviews);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const existingUserReview = currentUser
    ? reviewsList.find((r) => r.userId === currentUser.id)
    : null;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser) return;

      const trimmedBody = body.trim();
      if (!trimmedBody) {
        setError('Review text is required.');
        return;
      }

      setSubmitting(true);
      setError(null);
      setSuccess(null);

      try {
        const res = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetType: 'album',
            targetId: albumId,
            title: title.trim() || undefined,
            body: trimmedBody,
          }),
        });

        const data = await res.json();

        if (res.ok) {
          const newReview: ReviewItem = {
            id: data.reviewId || Date.now(),
            title: title.trim() || null,
            body: trimmedBody,
            createdAt: Math.floor(Date.now() / 1000),
            userId: currentUser.id,
            username: currentUser.username,
            displayName: currentUser.displayName || currentUser.username,
            avatarUrl: null,
            score: null,
          };

          setReviewsList((prev) => [newReview, ...prev]);
          setTitle('');
          setBody('');
          setSuccess('Your review has been published!');
          router.refresh();
        } else {
          setError(data.error || 'Failed to submit review.');
        }
      } catch {
        setError('An unexpected network error occurred.');
      } finally {
        setSubmitting(false);
      }
    },
    [currentUser, albumId, title, body, router]
  );

  return (
    <section className={styles.section} id="reviews" aria-labelledby="reviews-heading">
      <div className={styles.sectionHeader}>
        <div className={styles.titleGroup}>
          <MessageSquare className={styles.sectionIcon} size={22} aria-hidden="true" />
          <h2 id="reviews-heading" className={styles.sectionTitle}>
            Reviews
          </h2>
          <span className={styles.reviewCount}>({reviewsList.length})</span>
        </div>
      </div>

      {/* Write review card */}
      <div className={styles.formContainer}>
        {currentUser ? (
          existingUserReview ? (
            <div className={styles.alreadyReviewed}>
              <p>You have already submitted a review for this album.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.reviewForm}>
              <h3 className={styles.formTitle}>Write a Review</h3>
              {error && (
                <div className={styles.alertError} role="alert">
                  {error}
                </div>
              )}
              {success && (
                <div className={styles.alertSuccess} role="status">
                  {success}
                </div>
              )}

              <div className={styles.field}>
                <label htmlFor="review-title" className={styles.label}>
                  Headline <span className={styles.optional}>(optional)</span>
                </label>
                <input
                  id="review-title"
                  type="text"
                  className={styles.input}
                  placeholder="Sum up your thoughts in one line..."
                  maxLength={200}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="review-body" className={styles.label}>
                  Review <span className={styles.required}>*</span>
                </label>
                <textarea
                  id="review-body"
                  className={styles.textarea}
                  placeholder={`What did you think of ${albumTitle}? Discuss favorite tracks, lyrics, production...`}
                  rows={4}
                  maxLength={10000}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                />
                <span className={styles.charCount}>{body.length} / 10,000</span>
              </div>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={submitting || !body.trim()}
              >
                {submitting ? 'Publishing…' : 'Publish Review'}
              </button>
            </form>
          )
        ) : (
          <div className={styles.loginPrompt}>
            <p className={styles.loginPromptText}>
              Share your thoughts and join the conversation.
            </p>
            <Link href={`/login?redirect=/music`} className={styles.loginBtn}>
              Sign in to write a review
            </Link>
          </div>
        )}
      </div>

      {/* Reviews list */}
      <div className={styles.reviewList}>
        {reviewsList.length > 0 ? (
          reviewsList.map((review) => (
            <article key={review.id} className={styles.reviewCard}>
              <div className={styles.reviewMeta}>
                <div className={styles.authorGroup}>
                  <div className={styles.avatar}>
                    {review.avatarUrl ? (
                      <img
                        src={review.avatarUrl}
                        alt=""
                        className={styles.avatarImg}
                      />
                    ) : (
                      <div className={styles.avatarFallback} aria-hidden="true">
                        <UserIcon size={16} />
                      </div>
                    )}
                  </div>
                  <div>
                    <span className={styles.authorName}>
                      {review.displayName || review.username || 'Anonymous'}
                    </span>
                    <span className={styles.reviewDate}>
                      {formatDate(review.createdAt)}
                    </span>
                  </div>
                </div>

                {review.score !== null && review.score !== undefined && (
                  <div className={styles.ratingBadge} title={`Rated ${scoreToDisplay(review.score)} / 10`}>
                    <Star size={14} className={styles.starIcon} aria-hidden="true" />
                    <span>{scoreToDisplay(review.score)}</span>
                  </div>
                )}
              </div>

              {review.title && <h3 className={styles.reviewTitle}>{review.title}</h3>}
              <p className={styles.reviewText}>{review.body}</p>
            </article>
          ))
        ) : (
          <div className={styles.emptyReviews}>
            <p>No reviews yet for this album. Be the first to share your opinion!</p>
          </div>
        )}
      </div>
    </section>
  );
}
