import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

const res = db.all(sql`
  SELECT 
    a.id, 
    a.name, 
    a.slug, 
    a.imageUrl, 
    COUNT(al.id) as albumCount 
  FROM artists a 
  LEFT JOIN albums al ON al.artistId = a.id 
  WHERE a.slug LIKE '%rahman%' 
     OR a.slug LIKE '%prasad%' 
     OR a.slug LIKE '%balasubrahmanyam%' 
     OR a.slug LIKE '%keeravani%' 
     OR a.slug LIKE '%keeravaani%'
     OR a.slug LIKE '%anirudh%' 
     OR a.slug LIKE '%ilaiyaraaja%' 
     OR a.slug LIKE '%thaman%' 
     OR a.slug LIKE '%arijit%' 
     OR a.slug LIKE '%chithra%' 
     OR a.slug LIKE '%chitra%'
     OR a.slug LIKE '%ghoshal%'
     OR a.slug LIKE '%yesudas%'
  GROUP BY a.id
`);

console.log(JSON.stringify(res, null, 2));
