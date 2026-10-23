import { searchArtistsUnified } from '../src/lib/metadata/metadataManager';

async function testSearch() {
  const queries = [
    'SPB',
    'DSP',
    'AR Rahman',
    'MM Keeravani',
    'Ilayaraja',
    'Thaman',
    'SaNa',
    'Yesudas',
    'Chithra',
    'Arijit',
    'Sushin Shyam',
    'Hamsalekha',
    'ఎస్. పి. బాలసుబ్రహ్మణ్యం',
    'இளையராஜா'
  ];

  console.log('--- SEARCH RETRIEVAL VERIFICATION ---');
  for (const q of queries) {
    const res = await searchArtistsUnified(q);
    const top = res.artists[0];
    if (top) {
      console.log(`Query: "${q}" => Top Match: "${top.name}" (score: ${top.matchScore}, slug: ${top.slug}, hasImage: ${!!top.imageUrl}, totalResults: ${res.total})`);
    } else {
      console.log(`Query: "${q}" => NO RESULTS`);
    }
  }
}

testSearch().catch(console.error);
