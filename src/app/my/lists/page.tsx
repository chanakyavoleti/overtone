import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth/actions';
import { db } from '@/lib/db';
import { lists, listItems } from '@/lib/db/schema';
import { eq, desc, count } from 'drizzle-orm';
import { Plus } from 'lucide-react';
import ListsClient, { UserListSummary } from './ListsClient';
import styles from './page.module.css';
import { connection } from 'next/server';

export const metadata: Metadata = {
  title: 'My Lists | Overtone',
  description: 'Create, curate, and organize your music lists on Overtone.',
};

export default async function MyListsPage() {
  await connection();
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  // Fetch lists synchronously with better-sqlite3
  const rawLists = db
    .select({
      id: lists.id,
      title: lists.title,
      description: lists.description,
      isPublic: lists.isPublic,
      coverUrl: lists.coverUrl,
      createdAt: lists.createdAt,
      updatedAt: lists.updatedAt,
      itemCount: count(listItems.id),
    })
    .from(lists)
    .leftJoin(listItems, eq(lists.id, listItems.listId))
    .where(eq(lists.userId, user.id))
    .groupBy(lists.id)
    .orderBy(desc(lists.updatedAt))
    .all();

  const userLists: UserListSummary[] = rawLists.map((l) => ({
    ...l,
    itemCount: Number(l.itemCount),
  }));

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>My Lists</h1>
          <p className={styles.subtitle}>
            Organize, rank, and share custom album collections
          </p>
        </div>

        <Link href="/lists/new" className={`btn btn-primary ${styles.createBtn}`}>
          <Plus size={16} /> New List
        </Link>
      </header>

      <ListsClient initialLists={userLists} />
    </div>
  );
}
