import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '@/app/(static)/layout.module.css';

export const metadata: Metadata = {
  title: 'Community Guidelines | Overtone',
  description: 'Our expectations for thoughtful, constructive, and respectful musical discourse.',
};

export default function GuidelinesPage() {
  return (
    <article className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Community Guidelines</h1>
        <p className={styles.subtitle}>
          How we foster an open, insightful, and vibrant music community.
        </p>
      </header>

      <div className={styles.prose}>
        <h2>Our Core Principle</h2>
        <p>
          Overtone exists to celebrate music in all its variety. Disagreement and passionate debate are essential parts of art appreciation, but respect for fellow human beings is non-negotiable.
        </p>

        <h2>Writing Good Reviews</h2>
        <p>
          Great music reviews go beyond mere praise or dismissal. We encourage reviewers to:
        </p>
        <ul>
          <li><strong>Provide context:</strong> Mention what makes an album interesting — instrumentation, production, lyrical themes, or emotional resonance.</li>
          <li><strong>Explain your reasoning:</strong> If you gave an album 25 or 95, tell readers why. Point to specific tracks, transitions, or conceptual decisions.</li>
          <li><strong>Embrace subjective honesty:</strong> You don&apos;t have to conform to mainstream consensus. Nuanced, dissenting opinions are deeply valued when thoughtfully argued.</li>
          <li><strong>Avoid low-effort spam:</strong> One-word reviews (&ldquo;trash&rdquo;, &ldquo;goat&rdquo;, &ldquo;mid&rdquo;) without commentary detract from the community experience.</li>
        </ul>

        <h2>Respectful Discourse</h2>
        <p>
          When interacting with other members&apos; lists, reviews, or scores:
        </p>
        <ul>
          <li><strong>Critique the music, not the listener:</strong> It is fine to strongly critique an album or artist. It is never acceptable to attack a member for loving or disliking it.</li>
          <li><strong>Zero tolerance for hate speech:</strong> Racism, sexism, homophobia, transphobia, xenophobia, or harassment of any kind will result in immediate suspension.</li>
          <li><strong>No trolling or bad-faith rating:</strong> Deliberately spamming 0s or 100s across an artist&apos;s discography to manipulate charts hurts the platform for everyone.</li>
        </ul>

        <h2>Reporting Violations</h2>
        <p>
          If you encounter abusive comments, harassment, or spam, use the report button on the offending review or contact our moderation team directly. Our staff reviews reports promptly and impartially.
        </p>

        <p>
          Thank you for making Overtone an inspiring place to discover sound. Check out our <Link href="/about">About page</Link> or return to the <Link href="/discover">music catalog</Link>.
        </p>
      </div>
    </article>
  );
}
