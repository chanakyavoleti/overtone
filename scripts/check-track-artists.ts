import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

const res = db.all(sql`
  SELECT 
    ar.id, 
    ar.name, 
    ar.slug,
    COUNT(t.id) as trackCount
  FROM artists ar
  INNER JOIN tracks t ON t.artistId = ar.id
  WHERE ar.id IN (
    SELECT a.id FROM artists a 
    LEFT JOIN albums al ON al.artistId = a.id 
    GROUP BY a.id 
    HAVING COUNT(al.id) = 0
  )
  GROUP BY ar.id
`);

console.log(`Found ${res.length} empty-album artists that are referenced by tracks.`);
console.log(JSON.stringify(res.slice(0, 20), null, 2));
