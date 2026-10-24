import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

const resTA = db.all(sql`
  SELECT COUNT(*) as count FROM track_artists 
  WHERE artistId IN (
    SELECT a.id FROM artists a 
    LEFT JOIN albums al ON al.artistId = a.id 
    GROUP BY a.id 
    HAVING COUNT(al.id) = 0
  )
`);
console.log('track_artists references:', resTA);

const resAA = db.all(sql`
  SELECT COUNT(*) as count FROM album_artists 
  WHERE artistId IN (
    SELECT a.id FROM artists a 
    LEFT JOIN albums al ON al.artistId = a.id 
    GROUP BY a.id 
    HAVING COUNT(al.id) = 0
  )
`);
console.log('album_artists references:', resAA);
