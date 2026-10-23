import { fetchITunesDiscography } from '../src/lib/metadata/providers/itunes';
import { fetchDeezerDiscography } from '../src/lib/metadata/providers/deezer';

async function inspectDiscographies() {
  console.log('--- FETCHING KANYE WEST DISCOGRAPHY ---');
  // iTunes search for Kanye West artist ID
  const itunesKanyeSearch = await fetch('https://itunes.apple.com/search?term=Kanye+West&entity=musicArtist&limit=3');
  const itunesKanyeArtist = await itunesKanyeSearch.json();
  const kanyeItunesId = itunesKanyeArtist.results?.[0]?.artistId;
  console.log('Kanye iTunes Artist ID:', kanyeItunesId, itunesKanyeArtist.results?.[0]?.artistName);

  if (kanyeItunesId) {
    const kanyeReleases = await fetchITunesDiscography('Kanye West', kanyeItunesId);
    console.log(`iTunes Kanye Releases: ${kanyeReleases.length}`);
    const titles = kanyeReleases.map(r => `[${r.albumType}] ${r.title} (${r.releaseDate})`);
    console.log('Sample Kanye releases:', titles.slice(0, 20));
    console.log('Contains Life of Pablo?', kanyeReleases.some(r => r.title.toLowerCase().includes('pablo')));
    console.log('Contains Vultures?', kanyeReleases.some(r => r.title.toLowerCase().includes('vultures')));
    console.log('Contains Bully?', kanyeReleases.some(r => r.title.toLowerCase().includes('bully')));
    console.log('Contains Yeezus?', kanyeReleases.some(r => r.title.toLowerCase().includes('yeezus')));
    console.log('Contains Late Registration?', kanyeReleases.some(r => r.title.toLowerCase().includes('late registration')));
  }

  console.log('\n--- FETCHING TAME IMPALA DISCOGRAPHY ---');
  const itunesTameSearch = await fetch('https://itunes.apple.com/search?term=Tame+Impala&entity=musicArtist&limit=3');
  const itunesTameArtist = await itunesTameSearch.json();
  const tameItunesId = itunesTameArtist.results?.[0]?.artistId;
  console.log('Tame Impala iTunes Artist ID:', tameItunesId, itunesTameArtist.results?.[0]?.artistName);

  if (tameItunesId) {
    const tameReleases = await fetchITunesDiscography('Tame Impala', tameItunesId);
    console.log(`iTunes Tame Impala Releases: ${tameReleases.length}`);
    const titles = tameReleases.map(r => `[${r.albumType}] ${r.title} (${r.releaseDate})`);
    console.log('Sample Tame releases:', titles.slice(0, 25));
    console.log('Contains Deadbeat?', tameReleases.some(r => r.title.toLowerCase().includes('deadbeat')));
    console.log('Contains Currents?', tameReleases.some(r => r.title.toLowerCase().includes('currents')));
    const currents = tameReleases.find(r => r.title.toLowerCase().includes('currents'));
    console.log('iTunes Currents cover URL:', currents?.coverUrl);
  }
}

inspectDiscographies().catch(console.error);
