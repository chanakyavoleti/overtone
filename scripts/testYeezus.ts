import { fetchITunesDiscography } from '../src/lib/metadata/providers/itunes';
import { normalizeAlbumTitle } from '../src/lib/metadata/normalization';

async function testYeezus() {
  const kanyeAlbums = await fetchITunesDiscography('Kanye West');
  const yeezusItem = kanyeAlbums.find(a => a.title.toLowerCase().includes('yeezus'));
  console.log('Yeezus raw iTunes item:', yeezusItem);
  if (yeezusItem) {
    console.log('Normalized title:', normalizeAlbumTitle(yeezusItem.title));
  }

  const tameAlbums = await fetchITunesDiscography('Tame Impala');
  const deadbeatItem = tameAlbums.find(a => a.title.toLowerCase().includes('deadbeat'));
  console.log('Deadbeat raw iTunes item:', deadbeatItem);
  if (deadbeatItem) {
    console.log('Normalized title:', normalizeAlbumTitle(deadbeatItem.title));
  }
}

testYeezus().catch(console.error);
