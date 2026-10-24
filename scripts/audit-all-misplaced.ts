import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

async function auditAll() {
  const allAlbums = db.all(sql`
    SELECT 
      al.id, 
      al.title, 
      al.slug, 
      al.albumType,
      al.artistId,
      ar.name as artistName,
      ar.slug as artistSlug
    FROM albums al
    INNER JOIN artists ar ON ar.id = al.artistId
  `) as any[];

  console.log(`Auditing ${allAlbums.length} total albums in database...`);

  // Target composers in DB:
  const composers = db.all(sql`
    SELECT id, name, slug FROM artists 
    WHERE slug IN (
      'devi-sri-prasad', 'thaman', 'a-r-rahman', 'anirudh-ravichander', 
      'ilaiyaraaja', 'mm-keeravani', 'harris-jayaraj', 'yuvan-shankar-raja',
      'santhosh-narayanan', 'vijay-antony', 'pritam', 'amit-trivedi'
    )
  `) as any[];

  console.log('Known composer artists:', composers.map(c => `${c.id}: ${c.name} (${c.slug})`));

  // Find soundtracks / albums that should belong to composers
  const misplaced: Array<{
    albumId: number;
    title: string;
    currentArtist: string;
    targetComposer: string;
    targetId: number;
    reason: string;
  }> = [];

  for (const alb of allAlbums) {
    const t = alb.title.toLowerCase();

    // 1. Mahesh Babu albums to DSP or Thaman
    if (alb.artistSlug === 'mahesh-babu') {
      if (t.includes('nenokkadine') || t.includes('sarileru') || t.includes('maharshi') || t.includes('he’s soo cute') || t.includes("he's soo cute")) {
        const dsp = composers.find(c => c.slug === 'devi-sri-prasad');
        misplaced.push({
          albumId: alb.id,
          title: alb.title,
          currentArtist: 'Mahesh Babu',
          targetComposer: dsp.name,
          targetId: dsp.id,
          reason: 'Soundtrack composed by Devi Sri Prasad',
        });
      } else if (t.includes('aagadu') || t.includes('guntur kaaram') || t.includes('kurchi') || t.includes('ramana aei')) {
        const thaman = composers.find(c => c.slug === 'thaman');
        misplaced.push({
          albumId: alb.id,
          title: alb.title,
          currentArtist: 'Mahesh Babu',
          targetComposer: thaman.name,
          targetId: thaman.id,
          reason: 'Soundtrack composed by S. Thaman',
        });
      }
    }

    // 2. A.R. Rahman Essentials under Vijay Antony
    if (alb.artistSlug === 'vijay-antony' && t.includes('a.r. rahman')) {
      const rahman = composers.find(c => c.slug === 'a-r-rahman');
      misplaced.push({
        albumId: alb.id,
        title: alb.title,
        currentArtist: alb.artistName,
        targetComposer: rahman.name,
        targetId: rahman.id,
        reason: 'A.R. Rahman compilation misassigned to Vijay Antony',
      });
    }

    // 3. Check for other albums mentioning composer names
    if (alb.artistSlug !== 'a-r-rahman' && (t.startsWith('a.r. rahman') || t.startsWith('ar rahman') || t.includes('best of a.r. rahman'))) {
      const rahman = composers.find(c => c.slug === 'a-r-rahman');
      if (rahman && alb.artistId !== rahman.id) {
        misplaced.push({
          albumId: alb.id,
          title: alb.title,
          currentArtist: alb.artistName,
          targetComposer: rahman.name,
          targetId: rahman.id,
          reason: 'A.R. Rahman title',
        });
      }
    }

    if (alb.artistSlug !== 'devi-sri-prasad' && (t.startsWith('devi sri prasad') || t.includes('best of devi sri prasad'))) {
      const dsp = composers.find(c => c.slug === 'devi-sri-prasad');
      if (dsp && alb.artistId !== dsp.id) {
        misplaced.push({
          albumId: alb.id,
          title: alb.title,
          currentArtist: alb.artistName,
          targetComposer: dsp.name,
          targetId: dsp.id,
          reason: 'Devi Sri Prasad title',
        });
      }
    }
  }

  console.log(`\nFound ${misplaced.length} definitely misplaced albums:`);
  console.log(JSON.stringify(misplaced, null, 2));
}

auditAll();
