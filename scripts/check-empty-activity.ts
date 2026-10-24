import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

const res = db.all(sql`
  SELECT 
    ar.id, 
    ar.name, 
    ar.slug,
    COUNT(DISTINCT r.id) as ratingCount,
    COUNT(DISTINCT rev.id) as reviewCount,
    COUNT(DISTINCT al.id) as albumCount
  FROM artists ar
  LEFT JOIN ratings r ON r.targetType = 'artist' AND r.targetId = ar.id
  LEFT JOIN reviews rev ON rev.targetType = 'artist' AND rev.targetId = ar.id
  LEFT JOIN albums al ON al.artistId = ar.id
  GROUP BY ar.id
  HAVING albumCount = 0
`);

console.log(`Found ${res.length} artists with 0 albums.`);
const withActivity = res.filter((r: any) => r.ratingCount > 0 || r.reviewCount > 0);
console.log(`Artists with 0 albums but with user rating/reviews: ${withActivity.length}`);
if (withActivity.length > 0) {
  console.log(JSON.stringify(withActivity, null, 2));
}
