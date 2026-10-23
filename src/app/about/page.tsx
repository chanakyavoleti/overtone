import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '@/app/(static)/layout.module.css';

export const metadata: Metadata = {
  title: 'About Overtone | Overtone',
  description: 'Learn about Overtone, our mission, values, and vision for community-driven music discovery.',
};

export default function AboutPage() {
  return (
    <article className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>About Overtone</h1>
        <p className={styles.subtitle}>
          A home for listeners, critics, and music obsessives who believe great albums deserve deep attention.
        </p>
      </header>

      <div className={styles.prose}>
        <h2>Our Mission</h2>
        <p>
          Overtone was born from a simple belief: algorithmic playlists and ephemeral feeds have made music more accessible than ever, but they have diluted the shared culture of focused album listening.
        </p>
        <p>
          We are building a thoughtful, ad-free haven where listeners can catalog their journey, review works in depth, debate nuance with fellow enthusiasts, and uncover masterpieces across decades and genres.
        </p>

        <blockquote>
          &ldquo;Music is the silence between the notes, and the conversations we share when the record stops spinning.&rdquo;
        </blockquote>

        <h2>The 0–100 Rating Philosophy</h2>
        <p>
          Instead of five stars or binary thumbs, Overtone uses a calibrated 100-point scale. A nuanced scale gives room for genuine critical distinction:
        </p>
        <ul>
          <li><strong>90–100:</strong> Masterpiece — Defining achievements with timeless resonance.</li>
          <li><strong>80–89:</strong> Excellent — Exceptional songwriting, sonic craft, or conceptual cohesion.</li>
          <li><strong>70–79:</strong> Good — Enjoyable, compelling, with clear strengths despite minor lulls.</li>
          <li><strong>50–69:</strong> Average / Mixed — Interesting ideas that may fall short in execution.</li>
          <li><strong>Under 50:</strong> Flawed or Disappointing — Misses the mark significantly.</li>
        </ul>

        <h2>Community First</h2>
        <p>
          Overtone is shaped by its community. We prioritize constructive reviews, curated custom lists, and respectful discussions. Whether you are chronicling 1970s spiritual jazz, 1990s shoegaze, or contemporary avant-pop, your voice has a home here.
        </p>
        <p>
          Ready to join? Explore our <Link href="/discover">music catalog</Link>, read our <Link href="/guidelines">Community Guidelines</Link>, or start building your personal record collection today.
        </p>
      </div>
    </article>
  );
}
