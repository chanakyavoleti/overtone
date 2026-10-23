import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '@/app/(static)/layout.module.css';

export const metadata: Metadata = {
  title: 'Privacy Policy | Overtone',
  description: 'Understand how Overtone collects, uses, and safeguards your personal information.',
};

export default function PrivacyPage() {
  return (
    <article className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.subtitle}>
          How we handle, safeguard, and respect your personal data on Overtone.
        </p>
        <div className={styles.meta}>Effective Date: October 2026</div>
      </header>

      <div className={styles.prose}>
        <h2>1. Information We Collect</h2>
        <p>
          We only collect information necessary to deliver and improve your experience on Overtone:
        </p>
        <ul>
          <li><strong>Account Data:</strong> When registering, we collect your chosen username, email address, and a securely hashed password. You may optionally provide a display name and bio.</li>
          <li><strong>User-Generated Content:</strong> Ratings, reviews, collection statuses (listened, wishlist, owned), and custom lists you publish.</li>
          <li><strong>Session Cookies:</strong> We use strictly necessary, encrypted HTTP-only session cookies to manage user logins and maintain authentication states.</li>
        </ul>

        <h2>2. How We Use Information</h2>
        <p>We use your information strictly to:</p>
        <ul>
          <li>Provide core services: display your ratings, reviews, lists, and collections.</li>
          <li>Authenticate your account securely and prevent unauthorized access.</li>
          <li>Calculate aggregate statistics (e.g. average album scores and community trends).</li>
          <li>Communicate essential account updates or respond to support requests.</li>
        </ul>

        <h2>3. Information Sharing and Disclosure</h2>
        <p>
          We never sell, rent, or trade your personal data to third-party advertisers or data brokers.
        </p>
        <p>
          Your public profile, written reviews, ratings, and public lists are visible to other users of the platform by design. Your email address and encrypted password hash are strictly private and never exposed.
        </p>

        <h2>4. Data Retention and Account Deletion</h2>
        <p>
          You retain complete ownership over your data. You may edit your profile information at any time in your <Link href="/settings">Account Settings</Link>.
        </p>
        <p>
          If you choose to delete your account, you can do so immediately from your settings page. Deleting your account permanently erases your personal profile, ratings, written reviews, and custom lists from our active databases.
        </p>

        <h2>5. Security Measures</h2>
        <p>
          Passwords are protected using industry-standard bcrypt hashing with 12 salt rounds. All sessions are encrypted with secure cookies. We apply strict security headers and defenses against CSRF, XSS, and SQL injection.
        </p>

        <h2>6. Contact Us</h2>
        <p>
          If you have questions or concerns regarding this privacy policy or your rights, please reach out to us at privacy@overtone.local.
        </p>
      </div>
    </article>
  );
}
