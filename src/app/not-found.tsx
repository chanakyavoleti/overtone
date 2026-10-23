import Link from 'next/link';
import { Disc3, Compass, Home } from 'lucide-react';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.iconWrapper} aria-hidden="true">
        <Disc3 size={44} />
      </div>

      <span className={styles.code}>404</span>
      <h1 className={styles.title}>Track Not Found</h1>
      <p className={styles.description}>
        The page, album, or profile you&apos;re looking for has either been moved, deleted, or never existed in our groove.
      </p>

      <div className={styles.actions}>
        <Link href="/" className="btn btn-primary">
          <Home size={16} /> Return Home
        </Link>
        <Link href="/discover" className="btn btn-secondary">
          <Compass size={16} /> Explore Music
        </Link>
      </div>
    </div>
  );
}
