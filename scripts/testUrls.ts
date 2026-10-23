async function testUrls() {
  const currentsUrl = 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/64/46/ec/6446ec27-b649-1ff5-a1c1-197bc8a70c7e/15UMGIM27192.rgb.jpg/600x600bb.jpg';
  try {
    const res = await fetch(currentsUrl);
    console.log('Currents URL HTTP Status:', res.status, res.headers.get('content-type'));
  } catch (e: any) {
    console.log('Currents URL fetch failed:', e.message);
  }

  // Deezer search for Tame Impala Currents
  try {
    const res = await fetch('https://api.deezer.com/search?q=Tame+Impala+Currents');
    const data = await res.json();
    console.log('Deezer Currents Cover:', data.data?.[0]?.album?.cover_xl);
  } catch (e: any) {
    console.log('Deezer Currents fetch failed:', e.message);
  }

  // Deezer search for Kanye West
  try {
    const res = await fetch('https://api.deezer.com/search/artist?q=Kanye+West');
    const data = await res.json();
    console.log('Deezer Kanye West picture:', data.data?.[0]?.picture_xl, data.data?.[0]?.name, data.data?.[0]?.id);
  } catch (e: any) {
    console.log('Deezer Kanye fetch failed:', e.message);
  }
}
testUrls().catch(console.error);
