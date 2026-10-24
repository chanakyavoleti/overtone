import { getOrImportArtistBySlug } from '../src/lib/metadata/metadataManager';

async function test() {
  const tests = ['ar-rahman', 'dsp', 'spb', 'anirudh', 'mm-keeravaani', 'ks-chitra', 'kj-yesudas'];

  for (const t of tests) {
    const art = await getOrImportArtistBySlug(t);
    console.log(`Slug "${t}" -> Name: "${art?.name}", Canonical Slug: "${art?.slug}", Image: ${art?.imageUrl ? 'Verified' : 'None'}`);
  }
}

test();
