import { getSpotifyAccessToken } from '../src/lib/metadata/providers/spotify';

async function testLimits() {
  const token = await getSpotifyAccessToken();
  console.log('Token acquired:', Boolean(token));

  // Test with A.R. Rahman's Spotify ID (2F3Kt0BD6561R0gqBvK29i or from search)
  const searchRes = await fetch('https://api.spotify.com/v1/search?q=A.R.+Rahman&type=artist&limit=1', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const searchData = await searchRes.json();
  const arId = searchData.artists.items[0].id;
  console.log('A.R. Rahman Spotify ID:', arId);

  // Test limit=50 with include_groups=album,single,appears_on,compilation
  const testUrl = `https://api.spotify.com/v1/artists/${arId}/albums?include_groups=album,single,appears_on,compilation&limit=50`;
  const albRes = await fetch(testUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Status with limit=50 and appears_on:', albRes.status);
  if (albRes.ok) {
    const albData = await albRes.json();
    console.log('Total items returned in page 1:', albData.items.length);
    console.log('Total available albums reported by Spotify:', albData.total);
    console.log('Next page URL:', albData.next);
    console.log('Sample release titles:', albData.items.slice(0, 5).map((i: any) => `${i.name} (${i.album_type})`));
  } else {
    console.log('Error text:', await albRes.text());
  }
}

testLimits();
