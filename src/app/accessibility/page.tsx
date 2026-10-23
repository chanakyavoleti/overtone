import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '@/app/(static)/layout.module.css';

export const metadata: Metadata = {
  title: 'Accessibility Statement | Overtone',
  description: 'Overtone’s commitment to digital accessibility in accordance with WCAG 2.2 Level AA.',
};

export default function AccessibilityPage() {
  return (
    <article className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Accessibility Statement</h1>
        <p className={styles.subtitle}>
          Our commitment to ensuring that Overtone is usable and inclusive for every music lover.
        </p>
      </header>

      <div className={styles.prose}>
        <h2>Our Commitment</h2>
        <p>
          Overtone is dedicated to providing an accessible, inclusive digital platform that conforms to the <strong>Web Content Accessibility Guidelines (WCAG) 2.2 Level AA</strong> standards. We believe that discovering and sharing music should be seamless for everyone, including individuals with visual, auditory, motor, or cognitive disabilities.
        </p>

        <h2>Accessibility Features Built Into Overtone</h2>
        <p>We continuously implement and test features to support full digital accessibility:</p>
        <ul>
          <li><strong>Keyboard Navigation:</strong> All interactive components — including rating inputs, tab bars, dropdown menus, search inputs, and modal dialogs — are fully navigable and operable via standard keyboard controls.</li>
          <li><strong>Visible Focus Indicators:</strong> High-contrast focus rings (`:focus-visible`) clearly indicate keyboard position without obscuring content.</li>
          <li><strong>Semantic HTML & ARIA:</strong> We utilize semantic elements (`&lt;main&gt;`, `&lt;nav&gt;`, `&lt;header&gt;`, `&lt;footer&gt;`, `&lt;article&gt;`) supplemented by appropriate ARIA roles and labels to convey context accurately to assistive technologies.</li>
          <li><strong>Color Contrast:</strong> Both our light and dark design tokens are calibrated to meet or exceed WCAG 2.2 AA minimum contrast ratios (4.5:1 for normal text and 3:1 for large text and UI components).</li>
          <li><strong>Skip Navigation:</strong> A direct skip link is located at the very top of each page to allow keyboard users to bypass navigation and jump straight to main content.</li>
          <li><strong>Reduced Motion Support:</strong> We respect the `prefers-reduced-motion` media query, automatically disabling smooth scrolling, transitions, and animations for users who have requested it.</li>
          <li><strong>Text Resizing & Responsive Scaling:</strong> Content scales fluidly up to 200% zoom without loss of function or horizontal scrolling constraints.</li>
        </ul>

        <h2>Ongoing Audits & Continuous Improvement</h2>
        <p>
          Accessibility is not a one-time checklist. Our team integrates automated linting, keyboard-only manual reviews, and screen reader testing with NVDA, VoiceOver, and Orca into our engineering workflow.
        </p>

        <h2>Feedback & Assistance</h2>
        <p>
          If you encounter any accessibility barrier or have suggestions for how we can improve usability on Overtone, please let us know. We welcome your feedback and treat all reports with high priority:
        </p>
        <ul>
          <li><strong>Email:</strong> accessibility@overtone.local</li>
          <li><strong>Support Form:</strong> Reach out via our <Link href="/about">About & Contact page</Link></li>
        </ul>
        <p>
          We aim to respond to all accessibility feedback within 2 business days.
        </p>
      </div>
    </article>
  );
}
