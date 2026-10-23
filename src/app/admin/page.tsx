import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth/actions';
import { db } from '@/lib/db';
import { users, albums, artists, tracks, ratings, reviews } from '@/lib/db/schema';
import { count } from 'drizzle-orm';
import {
  Users,
  Disc3,
  Mic2,
  Music,
  Star,
  BookOpen,
  PlusCircle,
  Shield,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import styles from './page.module.css';
import { connection } from 'next/server';

export const metadata: Metadata = {
  title: 'Admin Dashboard | Overtone',
  description: 'Overtone administration panel: platform statistics, catalog control, and management.',
};

export default async function AdminPage() {
  await connection();
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    redirect('/');
  }

  // Fetch all counts synchronously with better-sqlite3
  const totalUsers = db.select({ count: count() }).from(users).get()?.count ?? 0;
  const totalAlbums = db.select({ count: count() }).from(albums).get()?.count ?? 0;
  const totalArtists = db.select({ count: count() }).from(artists).get()?.count ?? 0;
  const totalTracks = db.select({ count: count() }).from(tracks).get()?.count ?? 0;
  const totalRatings = db.select({ count: count() }).from(ratings).get()?.count ?? 0;
  const totalReviews = db.select({ count: count() }).from(reviews).get()?.count ?? 0;

  const statItems = [
    { label: 'Registered Users', value: totalUsers, icon: Users },
    { label: 'Total Artists', value: totalArtists, icon: Mic2 },
    { label: 'Total Albums', value: totalAlbums, icon: Disc3 },
    { label: 'Total Tracks', value: totalTracks, icon: Music },
    { label: 'Total Ratings', value: totalRatings, icon: Star },
    { label: 'Total Reviews', value: totalReviews, icon: BookOpen },
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <Shield size={24} style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
            <span className={styles.badge}>Platform Administration</span>
          </div>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <p className={styles.subtitle}>
            Overview of Overtone music catalog, community engagement, and moderation tools
          </p>
        </div>

        <Link href="/admin/catalog" className="btn btn-primary">
          <PlusCircle size={16} /> Add to Catalog
        </Link>
      </header>

      {/* Platform Statistics */}
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          Platform Statistics
        </h2>
        <ul className={styles.statsGrid} role="list">
          {statItems.map((stat) => {
            const Icon = stat.icon;
            return (
              <li key={stat.label} className={styles.statCard}>
                <div className={styles.statIcon} aria-hidden="true">
                  <Icon size={22} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statValue}>{stat.value.toLocaleString()}</span>
                  <span className={styles.statLabel}>{stat.label}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Admin Sub-pages & Tools */}
      <section className={styles.section} aria-labelledby="tools-heading">
        <h2 id="tools-heading" className={styles.sectionTitle}>
          Administrative Tools
        </h2>
        <div className={styles.toolsGrid}>
          <Link href="/admin/catalog" className={styles.toolCard}>
            <div className={styles.toolHeader}>
              <div className={styles.toolIcon}>
                <Disc3 size={20} />
              </div>
              <ArrowRight size={16} style={{ color: 'var(--color-text-tertiary)' }} />
            </div>
            <h3 className={styles.toolTitle}>Catalog Management</h3>
            <p className={styles.toolDescription}>
              Add new artists, release albums, or add discography tracks. Automatically creates URL slugs and relational links.
            </p>
            <span className={styles.toolAction}>
              Open Catalog Form <ArrowRight size={14} />
            </span>
          </Link>

          <Link href="/discover" className={styles.toolCard}>
            <div className={styles.toolHeader}>
              <div className={styles.toolIcon}>
                <ExternalLink size={20} />
              </div>
              <ArrowRight size={16} style={{ color: 'var(--color-text-tertiary)' }} />
            </div>
            <h3 className={styles.toolTitle}>Public Catalog View</h3>
            <p className={styles.toolDescription}>
              Browse through published music and albums as members of the community experience them.
            </p>
            <span className={styles.toolAction}>
              Browse Music <ArrowRight size={14} />
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
