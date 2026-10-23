import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth/actions';
import { db } from '@/lib/db';
import { collections, albums, artists } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import AlbumGrid, { AlbumGridItem } from '@/components/AlbumGrid';
import styles from './page.module.css';
import { connection } from 'next/server';

export const metadata: Metadata = {
  title: 'My Collection | Overtone',
  description: 'Manage your saved music albums: listened, wishlist, and owned.',
};

interface MyCollectionPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function MyCollectionPage({ searchParams }: MyCollectionPageProps) {
  await connection();
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const { tab = 'all' } = await searchParams;

  // Query user's collection synchronously with better-sqlite3
  const allItems = db
    .select({
      id: collections.id,
      status: collections.status,
      createdAt: collections.createdAt,
      albumId: albums.id,
      title: albums.title,
      slug: albums.slug,
      coverUrl: albums.coverUrl,
      releaseDate: albums.releaseDate,
      albumType: albums.albumType,
      artistName: artists.name,
      artistSlug: artists.slug,
    })
    .from(collections)
    .innerJoin(albums, eq(collections.albumId, albums.id))
    .leftJoin(artists, eq(albums.artistId, artists.id))
    .where(eq(collections.userId, user.id))
    .orderBy(desc(collections.createdAt))
    .all();

  // Counts per tab
  const allCount = allItems.length;
  const listenedCount = allItems.filter((i) => i.status === 'listened').length;
  const wishlistCount = allItems.filter((i) => i.status === 'wishlist').length;
  const ownedCount = allItems.filter((i) => i.status === 'owned').length;

  // Filter items
  const filteredItems =
    tab === 'listened'
      ? allItems.filter((i) => i.status === 'listened')
      : tab === 'wishlist'
      ? allItems.filter((i) => i.status === 'wishlist')
      : tab === 'owned'
      ? allItems.filter((i) => i.status === 'owned')
      : allItems;

  const gridAlbums: AlbumGridItem[] = filteredItems.map((item) => ({
    id: item.albumId,
    title: item.title,
    slug: item.slug,
    coverUrl: item.coverUrl,
    artistName: item.artistName,
    artistSlug: item.artistSlug,
    releaseDate: item.releaseDate,
    albumType: item.albumType,
    status: item.status,
  }));

  const getEmptyMessage = () => {
    switch (tab) {
      case 'listened':
        return 'You have not marked any albums as listened yet.';
      case 'wishlist':
        return 'Your wishlist is empty. Save albums here that you plan to listen to.';
      case 'owned':
        return 'No owned physical or digital copies recorded in your collection.';
      default:
        return 'Your collection is empty. Discover albums and add them to your listened, wishlist, or owned library.';
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>My Collection</h1>
        <p className={styles.subtitle}>
          Track the music you own, have listened to, or want to explore next
        </p>
      </header>

      {/* Filter Tabs */}
      <nav className={styles.tabsNav} aria-label="Collection categories">
        <Link
          href="/my/collection?tab=all"
          className={`${styles.tabLink} ${tab === 'all' ? styles.tabActive : ''}`}
          aria-current={tab === 'all' ? 'page' : undefined}
        >
          All <span className={styles.tabBadge}>{allCount}</span>
        </Link>
        <Link
          href="/my/collection?tab=listened"
          className={`${styles.tabLink} ${tab === 'listened' ? styles.tabActive : ''}`}
          aria-current={tab === 'listened' ? 'page' : undefined}
        >
          Listened <span className={styles.tabBadge}>{listenedCount}</span>
        </Link>
        <Link
          href="/my/collection?tab=wishlist"
          className={`${styles.tabLink} ${tab === 'wishlist' ? styles.tabActive : ''}`}
          aria-current={tab === 'wishlist' ? 'page' : undefined}
        >
          Wishlist <span className={styles.tabBadge}>{wishlistCount}</span>
        </Link>
        <Link
          href="/my/collection?tab=owned"
          className={`${styles.tabLink} ${tab === 'owned' ? styles.tabActive : ''}`}
          aria-current={tab === 'owned' ? 'page' : undefined}
        >
          Owned <span className={styles.tabBadge}>{ownedCount}</span>
        </Link>
      </nav>

      {/* Album Grid */}
      <AlbumGrid
        albums={gridAlbums}
        showStatus={tab === 'all'}
        emptyMessage={getEmptyMessage()}
      />
    </div>
  );
}
