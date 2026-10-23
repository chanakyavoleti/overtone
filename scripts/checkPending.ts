import { db, sql } from '../src/lib/db';

async function checkPending() {
  const pending = db.all(sql`SELECT id, name, slug, enrichmentStatus FROM artists WHERE enrichmentStatus != 'complete' OR enrichmentStatus IS NULL`) as any[];
  console.log('Artists needing enrichment:', pending.length);
  console.log('Sample:', pending.slice(0, 30).map(p => `${p.name} (${p.slug}) [${p.enrichmentStatus}]`));
}

checkPending().catch(console.error);
