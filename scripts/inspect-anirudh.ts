import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

const anirudh1 = db.all(sql`SELECT id, name, slug FROM artists WHERE slug = 'anirudh'`)[0];
const anirudh2 = db.all(sql`SELECT id, name, slug FROM artists WHERE slug = 'anirudh-ravichander'`)[0];

console.log('anirudh:', anirudh1);
console.log('anirudh-ravichander:', anirudh2);

const alb1 = db.all(sql`SELECT count(*) as c FROM albums WHERE artistId = ${(anirudh1 as any).id}`);
const alb2 = db.all(sql`SELECT count(*) as c FROM albums WHERE artistId = ${(anirudh2 as any).id}`);
console.log('albums for anirudh (35):', alb1);
console.log('albums for anirudh-ravichander (66):', alb2);
