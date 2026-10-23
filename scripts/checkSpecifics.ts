import { db, sql } from '../src/lib/db';
import { albums } from '../src/lib/db/schema';
import { like } from 'drizzle-orm';

async function checkSpecifics() {
  const yeezus = db.select().from(albums).where(like(albums.title, '%Yeezus%')).all();
  console.log('Yeezus in DB:', yeezus);

  const deadbeat = db.select().from(albums).where(like(albums.title, '%Deadbeat%')).all();
  console.log('Deadbeat in DB:', deadbeat);
}
checkSpecifics().catch(console.error);
