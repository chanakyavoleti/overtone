import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

const t = db.all(sql`SELECT count(*) as c FROM tracks WHERE artistId = 203`)[0];
const ta = db.all(sql`SELECT count(*) as c FROM track_artists WHERE artistId = 203`)[0];
const aa = db.all(sql`SELECT count(*) as c FROM album_artists WHERE artistId = 203`)[0];
const r = db.all(sql`SELECT count(*) as c FROM ratings WHERE targetType = 'artist' AND targetId = 203`)[0];
const rev = db.all(sql`SELECT count(*) as c FROM reviews WHERE targetType = 'artist' AND targetId = 203`)[0];

console.log({ tracks: t, track_artists: ta, album_artists: aa, ratings: r, reviews: rev });
