/**
 * Utility functions for Overtone platform
 */

/**
 * Format timestamp (seconds or milliseconds) to readable date
 */
export function formatDate(timestamp: number | null | undefined): string {
  if (!timestamp) return 'Unknown';
  // Handle both Unix timestamp in seconds and milliseconds
  const ms = timestamp < 1e11 ? timestamp * 1000 : timestamp;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(ms));
}

/**
 * Get initials from a display name or username
 */
export function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Get color/style token for a rating score (0 - 100)
 */
export function getScoreColor(score: number): { text: string; bg: string; border: string } {
  if (score >= 80) {
    return {
      text: 'var(--color-rating)',
      bg: 'var(--color-rating-bg)',
      border: 'var(--color-rating)',
    };
  }
  if (score >= 60) {
    return {
      text: 'var(--color-accent)',
      bg: 'var(--color-accent-subtle)',
      border: 'var(--color-accent)',
    };
  }
  if (score >= 40) {
    return {
      text: 'var(--color-text-secondary)',
      bg: 'var(--color-bg-hover)',
      border: 'var(--color-border)',
    };
  }
  return {
    text: 'var(--color-error)',
    bg: 'var(--color-error-bg)',
    border: 'var(--color-error)',
  };
}
