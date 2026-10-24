'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from './page.module.css';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  // Validate token on initial mount
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setError('Missing password reset token. Please request a new reset link.');
      setIsValidating(false);
      return;
    }

    async function checkToken() {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok || !data.valid) {
          setTokenValid(false);
          setError(data.error || 'This password reset link is invalid or has expired.');
        } else {
          setTokenValid(true);
        }
      } catch (err) {
        console.error('Token validation error:', err);
        setTokenValid(false);
        setError('Could not verify reset link. Please try again.');
      } finally {
        setIsValidating(false);
      }
    }

    checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('Please enter a new password');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to reset password. Please try again.');
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Reset submit error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className={styles.card}>
        <h1 className={styles.title}>Reset Password</h1>
        <p className={styles.subtitle}>Verifying your reset link...</p>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className={styles.card}>
        <h1 className={styles.title}>Invalid Link</h1>
        <div className={styles.error} role="alert" aria-live="polite">
          {error}
        </div>
        <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
          <Link href="/forgot-password" className={`${styles.submitBtn} btn btn-primary`}>
            Request a new link
          </Link>
        </div>
        <p className={styles.footer}>
          <Link href="/login" className={styles.footerLink}>
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.card}>
        <h1 className={styles.title}>Password Reset</h1>
        <div className={styles.successBox} role="status" aria-live="polite">
          Your password has been reset successfully. You can now sign in with your new credentials.
        </div>
        <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
          <Link href="/login" className={`${styles.submitBtn} btn btn-primary`}>
            Sign in to Overtone
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Reset Password</h1>
      <p className={styles.subtitle}>Enter and confirm your new password below.</p>

      {error && (
        <div className={styles.error} role="alert" aria-live="polite">
          {error}
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="password">New Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            aria-required="true"
            aria-invalid={!!error}
            disabled={isLoading}
            placeholder="At least 8 characters"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="confirmPassword">Confirm New Password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            aria-required="true"
            aria-invalid={!!error}
            disabled={isLoading}
            placeholder="Re-enter password"
          />
        </div>

        <button
          type="submit"
          className={`${styles.submitBtn} btn btn-primary`}
          disabled={isLoading}
        >
          {isLoading ? 'Resetting password...' : 'Update password'}
        </button>
      </form>

      <p className={styles.footer}>
        <Link href="/login" className={styles.footerLink}>
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className={styles.page}>
      <Suspense fallback={<div className={styles.card}><p className={styles.subtitle}>Loading...</p></div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
