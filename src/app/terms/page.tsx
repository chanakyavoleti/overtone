import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '@/app/(static)/layout.module.css';

export const metadata: Metadata = {
  title: 'Terms of Service | Overtone',
  description: 'Terms and conditions governing your use of the Overtone music platform.',
};

export default function TermsPage() {
  return (
    <article className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.subtitle}>
          The rules and agreements for participating in the Overtone community.
        </p>
        <div className={styles.meta}>Last Updated: October 2026</div>
      </header>

      <div className={styles.prose}>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By creating an account or accessing Overtone (&ldquo;the platform&rdquo;), you agree to be bound by these Terms of Service and our <Link href="/guidelines">Community Guidelines</Link>. If you do not agree, you must discontinue using the platform.
        </p>

        <h2>2. User Accounts</h2>
        <p>
          You must provide accurate, current registration information. You are responsible for safeguarding your login credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use.
        </p>

        <h2>3. User-Generated Content</h2>
        <p>
          You retain copyright and ownership of the original text, reviews, and lists you post. However, by submitting content, you grant Overtone a worldwide, non-exclusive, royalty-free license to display, index, format, and distribute your contributions in connection with platform operation.
        </p>
        <p>
          You represent that your reviews and comments do not infringe upon any third-party intellectual property or violate any applicable laws.
        </p>

        <h2>4. Prohibited Conduct</h2>
        <p>While using Overtone, you agree not to:</p>
        <ul>
          <li>Harass, threaten, or abuse other members, artists, or moderators.</li>
          <li>Post spam, promotional advertisements, affiliate links, or automated submissions.</li>
          <li>Scrape data aggressively or disrupt service availability through Denial of Service attacks.</li>
          <li>Impersonate any person, entity, or administrator.</li>
          <li>Manipulate ratings or review scores artificially through sockpuppet accounts.</li>
        </ul>

        <h2>5. Content Moderation & Termination</h2>
        <p>
          We reserve the right to remove any content or suspend accounts that violate our guidelines, at our discretion. If your account is suspended or terminated, you may request clarification by contacting moderation support.
        </p>

        <h2>6. Disclaimer of Warranties</h2>
        <p>
          Overtone is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind. We do not guarantee uninterrupted availability, error-free operation, or that community reviews reflect objective truth.
        </p>

        <h2>7. Changes to Terms</h2>
        <p>
          We may revise these Terms occasionally. Substantial modifications will be highlighted on the platform. Continued use of Overtone constitutes acceptance of any revised terms.
        </p>
      </div>
    </article>
  );
}
