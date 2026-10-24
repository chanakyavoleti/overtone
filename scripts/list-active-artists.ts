import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

const res = db.all(sql`
  SELECT 
    ar.id, 
    ar.name, 
    ar.slug,
    ar.imageUrl,
    COUNT(al.id) as albumCount
  FROM artists ar
  LEFT JOIN albums al ON al.artistId = ar.id
  GROUP BY ar.id
  HAVING albumCount > 0
  ORDER BY albumCount DESC
`);

console.log(`Found ${res.length} artists with > 0 albums:`);
res.forEach((r: any) => {
  console.log(`${r.id} | ${r.slug} | ${r.name} | albums: ${r.albumCount} | img: ${r.imageUrl ? 'yes' : 'no'}`);
});
