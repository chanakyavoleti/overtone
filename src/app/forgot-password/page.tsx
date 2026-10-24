'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send password reset email. Please try again.');
        setIsLoading(false);
        return;
      }

      setSuccessMessage(
        data.message || 'If an account exists with this email, you will receive password reset instructions.'
      );
      setEmail('');
      setIsLoading(false);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Forgot Password</h1>
        <p className={styles.subtitle}>
          Enter your account email address and we will send you instructions to reset your password.
        </p>

        {error && (
          <div className={styles.error} role="alert" aria-live="polite">
            {error}
          </div>
        )}

        {successMessage && (
          <div className={styles.successBox} role="status" aria-live="polite">
            {successMessage}
          </div>
        )}

        {!successMessage ? (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                aria-required="true"
                aria-invalid={!!error}
                disabled={isLoading}
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              className={`${styles.submitBtn} btn btn-primary`}
              disabled={isLoading}
            >
              {isLoading ? 'Sending instructions...' : 'Send reset instructions'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
            <button
              type="button"
              className={`${styles.submitBtn} btn btn-primary`}
              onClick={() => setSuccessMessage(null)}
            >
              Send another link
            </button>
          </div>
        )}

        <p className={styles.footer}>
          Remember your password?{' '}
          <Link href="/login" className={styles.footerLink}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
