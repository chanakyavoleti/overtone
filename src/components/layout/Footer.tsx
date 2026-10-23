import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerGrid}>
          <div>
            <div className={styles.footerBrand}>
              Over<span className={styles.footerBrandAccent}>tone</span>
            </div>
            <p className={styles.footerTagline}>
              A community for music enthusiasts. Rate, review, and discover music that matters.
            </p>
          </div>

          <div>
            <h3 className={styles.footerHeading}>Explore</h3>
            <div className={styles.footerLinks}>
              <Link href="/discover" className={styles.footerLink}>Discover</Link>
              <Link href="/charts" className={styles.footerLink}>Charts</Link>
              <Link href="/genres" className={styles.footerLink}>Genres</Link>
              <Link href="/lists" className={styles.footerLink}>Lists</Link>
              <Link href="/community" className={styles.footerLink}>Community</Link>
            </div>
          </div>

          <div>
            <h3 className={styles.footerHeading}>Platform</h3>
            <div className={styles.footerLinks}>
              <Link href="/about" className={styles.footerLink}>About</Link>
              <Link href="/guidelines" className={styles.footerLink}>Guidelines</Link>
              <Link href="/accessibility" className={styles.footerLink}>Accessibility</Link>
            </div>
          </div>

          <div>
            <h3 className={styles.footerHeading}>Legal</h3>
            <div className={styles.footerLinks}>
              <Link href="/privacy" className={styles.footerLink}>Privacy Policy</Link>
              <Link href="/terms" className={styles.footerLink}>Terms of Service</Link>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p className={styles.footerCopy}>
            &copy; {year} Overtone. Built with care for music lovers.
          </p>
        </div>
      </div>
    </footer>
  );
}
