import { searchSpotifyArtists } from '../src/lib/metadata/providers/spotify';

async function main() {
  const testArtists = [
    'K. S. Chithra',
    'Sonu Nigam',
    'Sunidhi Chauhan',
    'Pritam',
    'Amit Trivedi',
    'Kishore Kumar',
    'Lata Mangeshkar',
    'Sushin Shyam',
    'Vidyasagar',
    'Gopi Sundar',
    'Hamsalekha',
    'Arjun Janya',
    'Vijay Prakash',
    'Harris Jayaraj',
    'Yuvan Shankar Raja',
    'Santhosh Narayanan',
    'D. Imman',
    'Vijay Antony',
  ];

  for (const name of testArtists) {
    try {
      const res = await searchSpotifyArtists(name, 1);
      if (res.length > 0) {
        console.log(`"${res[0].slug}": "${res[0].imageUrl}", // ${res[0].name}`);
      }
    } catch (err: any) {
      console.error(`Error for ${name}:`, err.message);
    }
  }
}

main();
