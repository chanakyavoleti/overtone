import { isSpotifyConfigured, searchSpotifyArtists } from '../src/lib/metadata/providers/spotify';

async function main() {
  console.log('Is Spotify Configured:', isSpotifyConfigured());
  const testArtists = [
    'A. R. Rahman',
    'Devi Sri Prasad',
    'S. P. Balasubrahmanyam',
    'Anirudh Ravichander',
    'Ilaiyaraaja',
    'M. M. Keeravani',
    'Arijit Singh',
    'Shreya Ghoshal',
    'K. J. Yesudas',
    'Thaman S',
    'Sid Sriram',
  ];

  for (const name of testArtists) {
    try {
      const res = await searchSpotifyArtists(name, 1);
      if (res.length > 0) {
        console.log(`"${res[0].slug}": "${res[0].imageUrl}", // ${res[0].name}`);
      } else {
        console.log(`Not found for: ${name}`);
      }
    } catch (err: any) {
      console.error(`Error for ${name}:`, err.message);
    }
  }
}

main();
