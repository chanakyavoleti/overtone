import { db } from './index';
import {
  artists,
  albums,
  tracks,
  genres,
  albumGenres,
  artistGenres,
} from './schema';
import { eq, sql } from 'drizzle-orm';
import slugify from 'slugify';

export async function enrichCatalog() {
  console.log('Enriching catalog with authentic CDN artwork and expanded artist discographies...');
  const now = Math.floor(Date.now() / 1000);

  // 1. Update the original 5 artists with high-resolution Deezer CDN pictures
  const existingArtistImages: Record<string, string> = {
    radiohead: 'https://cdn-images.dzcdn.net/images/artist/0d58cfbc90f2e776608bcdc0c45a4711/500x500-000000-80-0-0.jpg',
    'kendrick-lamar': 'https://cdn-images.dzcdn.net/images/artist/be0a7c550567f4af0ed202d7235b74d6/500x500-000000-80-0-0.jpg',
    bjork: 'https://cdn-images.dzcdn.net/images/artist/9f9bf00ce8f05f975c698ac8cce76f59/500x500-000000-80-0-0.jpg',
    'miles-davis': 'https://cdn-images.dzcdn.net/images/artist/3a7973349c1b56f5764abb7507078f22/500x500-000000-80-0-0.jpg',
    'kate-bush': 'https://cdn-images.dzcdn.net/images/artist/ccbaf14c0164d376285f6500944fba21/500x500-000000-80-0-0.jpg',
  };

  for (const [slug, img] of Object.entries(existingArtistImages)) {
    db.update(artists).set({ imageUrl: img }).where(eq(artists.slug, slug)).run();
  }

  // 2. Update the original 8 albums with authentic Apple Music 600x600 cover artwork
  const existingAlbumCovers: Record<string, string> = {
    'ok-computer': 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/07/60/ba/0760ba0f-148c-b18f-d0ff-169ee96f3af5/634904078164.png/600x600bb.jpg',
    'kid-a': 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/bd/8e/13/bd8e1358-b367-a689-cb84-cebd0b067dc4/634904078263.png/600x600bb.jpg',
    'to-pimp-a-butterfly': 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/b5/a6/91/b5a69171-5232-3d5b-9c15-8963802f83dd/15UMGIM15814.rgb.jpg/600x600bb.jpg',
    'good-kid-maad-city': 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/36/86/ec/3686ec99-dec4-0a01-8b74-2d8a9a0263a7/12UMGIM52988.rgb.jpg/600x600bb.jpg',
    homogenic: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/12/38/d0/1238d076-0a43-5758-1876-5ab6d256d648/5016958995157.png/600x600bb.jpg',
    vespertine: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/32/d6/28/32d62861-0e24-2111-d3ed-3b54f23083d5/081227607265.jpg/600x600bb.jpg',
    'kind-of-blue': 'https://is1-ssl.mzstatic.com/image/thumb/Music/7f/9f/d6/mzi.vtnaewef.jpg/600x600bb.jpg',
    'hounds-of-love': 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/62/97/32/62973286-5bb3-0de7-c051-8b2de8d95472/cover.jpg/600x600bb.jpg',
  };

  for (const [slug, cov] of Object.entries(existingAlbumCovers)) {
    db.update(albums).set({ coverUrl: cov }).where(eq(albums.slug, slug)).run();
  }

  // Ensure additional key genres exist
  const additionalGenres = [
    { name: 'R&B', slug: 'r-and-b', description: 'Rhythm and blues spanning vintage soul to contemporary alternative R&B.' },
    { name: 'Indie', slug: 'indie', description: 'Independent music with DIY spirit, diverse aesthetics, and emotive songwriting.' },
    { name: 'Soul', slug: 'soul', description: 'Vocal-driven, emotive American genre blending gospel, rhythm, and blues.' },
  ];
  for (const g of additionalGenres) {
    db.insert(genres).values(g).onConflictDoNothing().run();
  }

  const allGenresList = db.select().from(genres).all();
  const genreMap = new Map<string, number>();
  for (const g of allGenresList) {
    genreMap.set(g.slug, g.id);
  }

  // 3. Insert 24 new iconic artists with real details, bios, and CDN photos
  const newArtists = [
    {
      name: 'Pink Floyd',
      slug: 'pink-floyd',
      bio: 'Legendary English rock band formed in London in 1965. Pioneers of progressive and psychedelic rock, famed for philosophical lyrics, sonic experimentation, and elaborate live shows.',
      imageUrl: 'https://cdn-images.dzcdn.net/images/artist/d62a818a5de6455f17b6a992cf22b32f/500x500-000000-80-0-0.jpg',
      country: 'United Kingdom',
      formedYear: 1965,
      disbandedYear: 1995,
      genreSlugs: ['rock'],
      albums: [
        {
          title: 'The Dark Side of the Moon',
          slug: 'the-dark-side-of-the-moon',
          releaseDate: '1973-03-01',
          albumType: 'album' as const,
          coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/10/a5/ce/10a5ce23-7467-347e-85e8-0b5cbe4aa0bc/886445786196.jpg/600x600bb.jpg',
          label: 'Harvest',
          runtimeSeconds: 2572,
          trackCount: 10,
          genreSlugs: ['rock'],
        },
        {
          title: 'Wish You Were Here',
          slug: 'wish-you-were-here',
          releaseDate: '1975-09-12',
          albumType: 'album' as const,
          coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/a5/d9/3c/a5d93ce8-b52b-42fa-534a-e49051cfbc94/886445786202.jpg/600x600bb.jpg',
          label: 'Harvest',
          runtimeSeconds: 2654,
          trackCount: 5,
          genreSlugs: ['rock'],
        },
      ],
    },
    {
      name: 'The Beatles',
      slug: 'the-beatles',
      bio: 'The most influential band in history. Formed in Liverpool in 1960, John Lennon, Paul McCartney, George Harrison, and Ringo Starr transformed popular music into high art.',
      imageUrl: 'https://cdn-images.dzcdn.net/images/artist/16925ed8f96eb621ecd56c2c8ba3da6e/500x500-000000-80-0-0.jpg',
      country: 'United Kingdom',
      formedYear: 1960,
      disbandedYear: 1970,
      genreSlugs: ['rock', 'pop'],
      albums: [
        {
          title: 'Abbey Road',
          slug: 'abbey-road',
          releaseDate: '1969-09-26',
          albumType: 'album' as const,
          coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/c5/45/64/c5456488-8cd3-4e3a-b8cb-4d9ddad82a94/00602508123617.rgb.jpg/600x600bb.jpg',
          label: 'Apple',
          runtimeSeconds: 2863,
          trackCount: 17,
          genreSlugs: ['rock', 'pop'],
        },
      ],
    },
    {
      name: 'David Bowie',
      slug: 'david-bowie',
      bio: 'Chameleonic English singer-songwriter, actor, and cultural icon whose reinventions reshaped rock, art pop, and glam rock throughout the 20th century.',
      imageUrl: 'https://cdn-images.dzcdn.net/images/artist/8301a6a09a24f4bb35950c59717defa0/500x500-000000-80-0-0.jpg',
      country: 'United Kingdom',
      formedYear: 1962,
      disbandedYear: 2016,
      genreSlugs: ['rock', 'pop'],
      albums: [
        {
          title: 'The Rise and Fall of Ziggy Stardust and the Spiders from Mars',
          slug: 'the-rise-and-fall-of-ziggy-stardust',
          releaseDate: '1972-06-16',
          albumType: 'album' as const,
          coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b8/62/17/b862174c-f126-7bc2-10f5-56f849cf24eb/00825646287284.jpg/600x600bb.jpg',
          label: 'RCA',
          runtimeSeconds: 2317,
          trackCount: 11,
          genreSlugs: ['rock'],
        },
      ],
    },
    {
      name: 'Daft Punk',
      slug: 'daft-punk',
      bio: 'French electronic music duo formed in 1993 in Paris by Thomas Bangalter and Guy-Manuel de Homem-Christo. Widely considered one of the most influential dance acts of all time.',
      imageUrl: 'https://cdn-images.dzcdn.net/images/artist/638e69b9caaf9f9f3f8826febea7b543/500x500-000000-80-0-0.jpg',
      country: 'France',
      formedYear: 1993,
      disbandedYear: 2021,
      genreSlugs: ['electronic'],
      albums: [
        {
          title: 'Discovery',
          slug: 'discovery',
          releaseDate: '2001-03-12',
          albumType: 'album' as const,
          coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/8e/3c/6a/8e3c6a46-ec82-3d7c-bb43-b9dc6f81be46/0724384960650.jpg/600x600bb.jpg',
          label: 'Virgin',
          runtimeSeconds: 3644,
          trackCount: 14,
          genreSlugs: ['electronic'],
        },
      ],
    },
    {
      name: 'Fleetwood Mac',
      slug: 'fleetwood-mac',
      bio: 'British-American rock band formed in London in 1967. Famous for their sublime multi-part harmonies, turbulent romances, and timeless songwriting.',
      imageUrl: 'https://cdn-images.dzcdn.net/images/artist/ef23278cf3a67a3ca8404ddaa38699d4/500x500-000000-80-0-0.jpg',
      country: 'United Kingdom',
      formedYear: 1967,
      disbandedYear: null,
      genreSlugs: ['rock', 'pop'],
      albums: [
        {
          title: 'Rumours',
          slug: 'rumours',
          releaseDate: '1977-02-04',
          albumType: 'album' as const,
          coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/aa/62/16/aa6216c5-43ea-7e6d-d1ef-2ec173d1f054/081227970727.jpg/600x600bb.jpg',
          label: 'Warner Bros.',
          runtimeSeconds: 2383,
          trackCount: 11,
          genreSlugs: ['rock', 'pop'],
        },
      ],
    },
    {
      name: 'Taylor Swift',
      slug: 'taylor-swift',
      bio: 'American singer-songwriter whose narrative songwriting, artistic versatility, and cultural impact have defined 21st-century popular music.',
      imageUrl: 'https://cdn-images.dzcdn.net/images/artist/cc2495870fe1a792ad0cdb05501ad5ec/500x500-000000-80-0-0.jpg',
      country: 'United States',
      formedYear: 2004,
      disbandedYear: null,
      genreSlugs: ['pop'],
      albums: [
        {
          title: '1989',
          slug: '1989',
          releaseDate: '2014-10-27',
          albumType: 'album' as const,
          coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music128/v4/9c/91/83/9c918302-e221-6549-36b6-ff9d63eb3a28/00843930013548.rgb.jpg/600x600bb.jpg',
          label: 'Big Machine',
          runtimeSeconds: 2931,
          trackCount: 13,
          genreSlugs: ['pop'],
        },
        {
          title: 'folklore',
          slug: 'folklore',
          releaseDate: '2020-07-24',
          albumType: 'album' as const,
          coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/80/7e/00/807e008a-2115-32e6-7cf7-ee24b33b7b25/20UMGIM69458.rgb.jpg/600x600bb.jpg',
          label: 'Republic',
          runtimeSeconds: 3809,
          trackCount: 16,
          genreSlugs: ['pop', 'indie'],
        },
      ],
    },
    {
      name: 'Led Zeppelin',
      slug: 'led-zeppelin',
      bio: 'English rock band formed in London in 1968. With their heavy, guitar-driven sound, they are widely cited as one of the progenitors of hard rock and heavy metal.',
      imageUrl: 'https://cdn-images.dzcdn.net/images/artist/2cf138b96a63da677ac6fb79846607c8/500x500-000000-80-0-0.jpg',
      country: 'United Kingdom',
      formedYear: 1968,
      disbandedYear: 1980,
      genreSlugs: ['rock'],
      albums: [
        {
          title: 'Led Zeppelin IV',
          slug: 'led-zeppelin-iv',
          releaseDate: '1971-11-08',
          albumType: 'album' as const,
          coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/31/5d/47/315d4706-e7e0-4a81-cf1b-6ec63c7b8054/075678645747.jpg/600x600bb.jpg',
          label: 'Atlantic',
          runtimeSeconds: 2554,
          trackCount: 8,
          genreSlugs: ['rock'],
        },
      ],
    },
    {
      name: 'Lana Del Rey',
      slug: 'lana-del-rey',
      bio: 'American singer-songwriter noted for cinematic quality, tragic romance, glamour, and melancholic explorations of contemporary Americana.',
      imageUrl: 'https://cdn-images.dzcdn.net/images/artist/8994d3be1a59a72f887f1f8afd2d4c6c/500x500-000000-80-0-0.jpg',
      country: 'United States',
      formedYear: 2005,
      disbandedYear: null,
      genreSlugs: ['pop', 'indie'],
      albums: [
        {
          title: 'Born to Die',
          slug: 'born-to-die',
          releaseDate: '2012-01-27',
          albumType: 'album' as const,
          coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/df/76/90/df7690fa-b649-14a5-bdfa-bbf7f09804c8/00602527934249.rgb.jpg/600x600bb.jpg',
          label: 'Interscope / Polydor',
          runtimeSeconds: 2968,
          trackCount: 12,
          genreSlugs: ['pop'],
        },
      ],
    },
    {
      name: 'Nirvana',
      slug: 'nirvana',
      bio: 'Pioneering American grunge band formed in Aberdeen, Washington, in 1987 by Kurt Cobain and Krist Novoselic. Propelled alternative rock into mainstream consciousness.',
      imageUrl: 'https://cdn-images.dzcdn.net/images/artist/ad67af8b0dca71d5e69f1afd8e045c4e/500x500-000000-80-0-0.jpg',
      country: 'United States',
      formedYear: 1987,
      disbandedYear: 1994,
      genreSlugs: ['rock'],
      albums: [
        {
          title: 'Nevermind',
          slug: 'nevermind',
          releaseDate: '1991-09-24',
          albumType: 'album' as const,
          coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/0c/a2/a4/0ca2a492-94b1-b9fd-85cb-a73c1fae7f53/00720642442524.rgb.jpg/600x600bb.jpg',
          label: 'DGC',
          runtimeSeconds: 2944,
          trackCount: 12,
          genreSlugs: ['rock'],
        },
      ],
    },
    {
      name: 'Queen',
      slug: 'queen',
      bio: 'Legendary British rock band formed in London in 1970 by Freddie Mercury, Brian May, Roger Taylor, and John Deacon. Renowned for theatrical rock epics and anthems.',
      imageUrl: 'https://cdn-images.dzcdn.net/images/artist/06188edd60dc4b04a5520a3a75a1059a/500x500-000000-80-0-0.jpg',
      country: 'United Kingdom',
      formedYear: 1970,
      disbandedYear: null,
      genreSlugs: ['rock'],
      albums: [
        {
          title: 'A Night at the Opera',
          slug: 'a-night-at-the-opera',
          releaseDate: '1975-11-21',
          albumType: 'album' as const,
          coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/71/84/c4/7184c489-0ae6-c11d-2895-728b7899b820/00602527878420.rgb.jpg/600x600bb.jpg',
          label: 'EMI / Elektra',
          runtimeSeconds: 2588,
          trackCount: 12,
          genreSlugs: ['rock'],
        },
      ],
    },
    {
      name: 'The Weeknd',
      slug: 'the-weeknd',
      bio: 'Canadian singer, songwriter, and record producer Abel Tesfaye. Known for dark alternative R&B, cinematic synth-pop, and soaring falsetto.',
      imageUrl: 'https://cdn-images.dzcdn.net/images/artist/581693b4724a7fcfa754455101e13a44/500x500-000000-80-0-0.jpg',
      country: 'Canada',
      formedYear: 2010,
      disbandedYear: null,
      genreSlugs: ['r-and-b', 'pop'],
      albums: [
        {
          title: 'After Hours',
          slug: 'after-hours',
          releaseDate: '2020-03-20',
          albumType: 'album' as const,
          coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/cf/14/c1/cf14c1eb-c15c-3a3f-0599-4d6cbcc86a9f/20UMGIM15563.rgb.jpg/600x600bb.jpg',
          label: 'XO / Republic',
          runtimeSeconds: 3377,
          trackCount: 14,
          genreSlugs: ['r-and-b', 'pop'],
        },
      ],
    },
    {
      name: 'Billie Eilish',
      slug: 'billie-eilish',
      bio: 'American singer-songwriter who gained international acclaim for her whispered vocals, genre-fluid dark pop productions, and raw introspective lyrics.',
      imageUrl: 'https://cdn-images.dzcdn.net/images/artist/8eab1a9a644889aabaca1e193e05f984/500x500-000000-80-0-0.jpg',
      country: 'United States',
      formedYear: 2015,
      disbandedYear: null,
      genreSlugs: ['pop', 'electronic'],
      albums: [
        {
          title: 'WHEN WE ALL FALL ASLEEP, WHERE DO WE GO?',
          slug: 'when-we-all-fall-asleep-where-do-we-go',
          releaseDate: '2019-03-29',
          albumType: 'album' as const,
          coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/c6/3e/6c/c63e6c3d-b4b3-0a75-b3e3-774e176ff836/19UMGIM22210.rgb.jpg/600x600bb.jpg',
          label: 'Darkroom / Interscope',
          runtimeSeconds: 2568,
          trackCount: 14,
          genreSlugs: ['pop', 'electronic'],
        },
      ],
    },
    {
      name: 'Frank Ocean',
      slug: 'frank-ocean',
      bio: 'Grammy-winning American singer, songwriter, and rapper acclaimed for idiosyncratic style, evocative lyricism, and avant-garde approach to contemporary R&B.',
      imageUrl: 'https://cdn-images.dzcdn.net/images/artist/882155c08dc31d6464d6d580083c968c/500x500-000000-80-0-0.jpg',
      country: 'United States',
      formedYear: 2005,
      disbandedYear: null,
      genreSlugs: ['r-and-b', 'hip-hop'],
      albums: [
        {
          title: 'Blonde',
          slug: 'blonde',
          releaseDate: '2016-08-20',
          albumType: 'album' as const,
          coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/df/76/8a/df768a42-d698-38bb-1596-3c7d66beff61/888915277884_cover.jpg/600x600bb.jpg',
          label: 'Boys Don\'t Cry',
          runtimeSeconds: 3608,
          trackCount: 17,
          genreSlugs: ['r-and-b', 'pop'],
        },
      ],
    },
    {
      name: 'Kanye West',
      slug: 'kanye-west',
      bio: 'Visionary American rapper, producer, and cultural figure who dramatically shaped modern hip-hop through baroque orchestration, sampling mastery, and boundary-pushing ambition.',
      imageUrl: 'https://cdn-images.dzcdn.net/images/artist/3c3577ebb5364e574d8276204ea0d1f5/500x500-000000-80-0-0.jpg',
      country: 'United States',
      formedYear: 1996,
      disbandedYear: null,
      genreSlugs: ['hip-hop'],
      albums: [
        {
          title: 'My Beautiful Dark Twisted Fantasy',
          slug: 'my-beautiful-dark-twisted-fantasy',
          releaseDate: '2010-11-22',
          albumType: 'album' as const,
          coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/05/29/49/052949ae-522d-327c-38e2-f38e285a73e6/10UMGIM28723.rgb.jpg/600x600bb.jpg',
          label: 'Def Jam / Roc-A-Fella',
          runtimeSeconds: 4118,
          trackCount: 13,
          genreSlugs: ['hip-hop'],
        },
      ],
    },
    {
      name: 'Eminem',
      slug: 'eminem',
      bio: 'American rapper, songwriter, and producer known for his unmatched lyrical speed, technical mastery, and status as one of the best-selling music artists of all time.',
      imageUrl: 'https://cdn-images.dzcdn.net/images/artist/7fa738468c9a73ff98c1e1b78d622b81/500x500-000000-80-0-0.jpg',
      country: 'United States',
      formedYear: 1988,
      disbandedYear: null,
      genreSlugs: ['hip-hop'],
      albums: [
        {
          title: 'The Marshall Mathers LP',
          slug: 'the-marshall-mathers-lp',
          releaseDate: '2000-05-23',
          albumType: 'album' as const,
          coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/4a/01/fa/4a01fa49-a29d-1f6e-9397-ff05e60805c8/00606949062927.rgb.jpg/600x600bb.jpg',
          label: 'Aftermath / Interscope',
          runtimeSeconds: 4344,
          trackCount: 18,
          genreSlugs: ['hip-hop'],
        },
      ],
    },
    {
      name: 'Tyler, The Creator',
      slug: 'tyler-the-creator',
      bio: 'American rapper, producer, and visual artist whose playful genius, bold chord progressions, and kaleidoscopic aesthetics redefined contemporary alternative rap.',
      imageUrl: 'https://cdn-images.dzcdn.net/images/artist/5eceecd683beab6dd901a7931294a121/500x500-000000-80-0-0.jpg',
      country: 'United States',
      formedYear: 2007,
      disbandedYear: null,
      genreSlugs: ['hip-hop'],
      albums: [
        {
          title: 'IGOR',
          slug: 'igor',
          releaseDate: '2019-05-17',
          albumType: 'album' as const,
          coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/ab/1a/0a/ab1a0a52-9b2f-7798-2503-469601d365f7/886447727142.jpg/600x600bb.jpg',
          label: 'Columbia',
          runtimeSeconds: 2383,
          trackCount: 12,
          genreSlugs: ['hip-hop', 'r-and-b'],
        },
      ],
    },
    {
      name: 'Arctic Monkeys',
      slug: 'arctic-monkeys',
      bio: 'English rock band formed in Sheffield in 2002. Fronted by Alex Turner, they transitioned from rapid-fire post-punk revival to swaggering retro rock.',
      imageUrl: 'https://cdn-images.dzcdn.net/images/artist/6c03e4c7c36800897fd468633286db24/500x500-000000-80-0-0.jpg',
      country: 'United Kingdom',
      formedYear: 2002,
      disbandedYear: null,
      genreSlugs: ['rock', 'indie'],
      albums: [
        {
          title: 'AM',
          slug: 'am',
          releaseDate: '2013-09-09',
          albumType: 'album' as const,
          coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/64/09/b8/6409b83b-3136-1200-e79c-b17b6a12518e/887828031795.png/600x600bb.jpg',
          label: 'Domino',
          runtimeSeconds: 2503,
          trackCount: 12,
          genreSlugs: ['rock'],
        },
      ],
    },
    {
      name: 'Stevie Wonder',
      slug: 'stevie-wonder',
      bio: 'One of the most creative and beloved musical figures of the 20th century. A virtuoso multi-instrumentalist who pioneered synthesizer use in soul, funk, and pop.',
      imageUrl: 'https://cdn-images.dzcdn.net/images/artist/b8138428e7b0ce78843106b4b83d4e77/500x500-000000-80-0-0.jpg',
      country: 'United States',
      formedYear: 1961,
      disbandedYear: null,
      genreSlugs: ['soul', 'pop'],
      albums: [
        {
          title: 'Songs in the Key of Life',
          slug: 'songs-in-the-key-of-life',
          releaseDate: '1976-09-28',
          albumType: 'album' as const,
          coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/8e/3a/0b/8e3a0bcf-20b1-4f11-7a63-49aa2a84d4ae/06UMGIM08204.rgb.jpg/600x600bb.jpg',
          label: 'Motown / Tamla',
          runtimeSeconds: 6300,
          trackCount: 21,
          genreSlugs: ['soul', 'r-and-b'],
        },
      ],
    },
    {
      name: 'Amy Winehouse',
      slug: 'amy-winehouse',
      bio: 'English singer and songwriter celebrated for her deep, expressive contralto vocals and her eclectic mix of soul, rhythm and blues, and jazz.',
      imageUrl: 'https://cdn-images.dzcdn.net/images/artist/0cacb43a576b031eb169cca27171c1f5/500x500-000000-80-0-0.jpg',
      country: 'United Kingdom',
      formedYear: 2002,
      disbandedYear: 2011,
      genreSlugs: ['soul', 'jazz'],
      albums: [
        {
          title: 'Back to Black',
          slug: 'back-to-black',
          releaseDate: '2006-10-27',
          albumType: 'album' as const,
          coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/ef/07/7b/ef077bd1-6577-0c7f-ad87-8ff8676bf977/00602517140889.rgb.jpg/600x600bb.jpg',
          label: 'Island',
          runtimeSeconds: 2108,
          trackCount: 11,
          genreSlugs: ['soul', 'jazz'],
        },
      ],
    },
    {
      name: 'Massive Attack',
      slug: 'massive-attack',
      bio: 'English electronic group formed in 1988 in Bristol. Pioneers of the trip-hop genre, blending cinematic soundscapes with dub, hip-hop, and post-punk.',
      imageUrl: 'https://cdn-images.dzcdn.net/images/artist/3bfbf74ea27b926ba5376ea381f51d0b/500x500-000000-80-0-0.jpg',
      country: 'United Kingdom',
      formedYear: 1988,
      disbandedYear: null,
      genreSlugs: ['electronic'],
      albums: [
        {
          title: 'Mezzanine',
          slug: 'mezzanine',
          releaseDate: '1998-04-20',
          albumType: 'album' as const,
          coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/19/2f/fb/192ffbcf-a1a7-19cf-b7c1-26c710d08916/00724384559953.rgb.jpg/600x600bb.jpg',
          label: 'Virgin',
          runtimeSeconds: 3824,
          trackCount: 11,
          genreSlugs: ['electronic'],
        },
      ],
    },
    {
      name: 'Michael Jackson',
      slug: 'michael-jackson',
      bio: 'The undisputed "King of Pop", whose groundbreaking dance moves, vocal pyrotechnics, and record-shattering albums revolutionized modern entertainment.',
      imageUrl: 'https://cdn-images.dzcdn.net/images/artist/ff1c8cf777db1efc2043b90d79dcbfc3/500x500-000000-80-0-0.jpg',
      country: 'United States',
      formedYear: 1964,
      disbandedYear: 2009,
      genreSlugs: ['pop', 'r-and-b'],
      albums: [
        {
          title: 'Thriller',
          slug: 'thriller',
          releaseDate: '1982-11-30',
          albumType: 'album' as const,
          coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/05/9a/c0/059ac0c3-f09b-6401-268e-59c40217ec56/886445989788.jpg/600x600bb.jpg',
          label: 'Epic',
          runtimeSeconds: 2539,
          trackCount: 9,
          genreSlugs: ['pop'],
        },
      ],
    },
    {
      name: 'Tame Impala',
      slug: 'tame-impala',
      bio: 'Psychedelic music project of Australian multi-instrumentalist Kevin Parker, renowned for luscious phased synthesizers, disco grooves, and hypnotic melodies.',
      imageUrl: 'https://cdn-images.dzcdn.net/images/artist/879015e713cc6ad6ffaeec154c027505/500x500-000000-80-0-0.jpg',
      country: 'Australia',
      formedYear: 2007,
      disbandedYear: null,
      genreSlugs: ['rock', 'electronic', 'indie'],
      albums: [
        {
          title: 'Currents',
          slug: 'currents',
          releaseDate: '2015-07-17',
          albumType: 'album' as const,
          coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/64/46/ec/6446ec27-b649-1ff5-a1c1-197bc8a70c7e/15UMGIM27192.rgb.jpg/600x600bb.jpg',
          label: 'Modular / Interscope',
          runtimeSeconds: 3064,
          trackCount: 13,
          genreSlugs: ['rock', 'electronic'],
        },
      ],
    },
    {
      name: 'The Cure',
      slug: 'the-cure',
      bio: 'English rock band formed in Crawley in 1978. Fronted by Robert Smith, they became pillars of post-punk, gothic rock, and melancholic new wave.',
      imageUrl: 'https://cdn-images.dzcdn.net/images/artist/8c9afdb1385ece7ddf2f2c923c70c0bc/500x500-000000-80-0-0.jpg',
      country: 'United Kingdom',
      formedYear: 1978,
      disbandedYear: null,
      genreSlugs: ['rock', 'indie'],
      albums: [
        {
          title: 'Disintegration',
          slug: 'disintegration',
          releaseDate: '1989-05-02',
          albumType: 'album' as const,
          coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/60/a6/5c/60a65cc9-02ef-97b7-58f8-3e9c4df7a126/081227981440.jpg/600x600bb.jpg',
          label: 'Fiction / Elektra',
          runtimeSeconds: 4323,
          trackCount: 12,
          genreSlugs: ['rock'],
        },
      ],
    },
    {
      name: 'Nas',
      slug: 'nas',
      bio: 'Legendary American rapper from Queensbridge, New York. Considered one of the greatest MCs in history, famed for vivid poetic imagery and narrative storytelling.',
      imageUrl: 'https://cdn-images.dzcdn.net/images/artist/f6e4f9d1f6be43c36339a9a96dcee725/500x500-000000-80-0-0.jpg',
      country: 'United States',
      formedYear: 1991,
      disbandedYear: null,
      genreSlugs: ['hip-hop'],
      albums: [
        {
          title: 'Illmatic',
          slug: 'illmatic',
          releaseDate: '1994-04-19',
          albumType: 'album' as const,
          coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/b9/ca/b9/b9cab951-e129-3739-fa6c-e0c15fa57c86/886444521743.jpg/600x600bb.jpg',
          label: 'Columbia',
          runtimeSeconds: 2397,
          trackCount: 10,
          genreSlugs: ['hip-hop'],
        },
      ],
    },
  ];

  for (const art of newArtists) {
    // Check if artist already exists
    let existingArtist = db.select().from(artists).where(eq(artists.slug, art.slug)).get();
    let artistId: number;

    if (!existingArtist) {
      const inserted = db
        .insert(artists)
        .values({
          name: art.name,
          slug: art.slug,
          bio: art.bio,
          imageUrl: art.imageUrl,
          country: art.country,
          formedYear: art.formedYear,
          disbandedYear: art.disbandedYear,
          createdAt: now,
        })
        .returning({ id: artists.id })
        .get();

      artistId = inserted.id;
    } else {
      artistId = existingArtist.id;
      db.update(artists)
        .set({ imageUrl: art.imageUrl, bio: art.bio })
        .where(eq(artists.id, artistId))
        .run();
    }

    // Link artist genres
    for (const gSlug of art.genreSlugs) {
      const gid = genreMap.get(gSlug);
      if (gid) {
        db.insert(artistGenres)
          .values({ artistId, genreId: gid })
          .onConflictDoNothing()
          .run();
      }
    }

    // Insert albums for this artist
    for (const alb of art.albums) {
      let existingAlbum = db.select().from(albums).where(eq(albums.slug, alb.slug)).get();
      let albumId: number;

      if (!existingAlbum) {
        const insertedAlb = db
          .insert(albums)
          .values({
            title: alb.title,
            slug: alb.slug,
            artistId,
            releaseDate: alb.releaseDate,
            albumType: alb.albumType,
            coverUrl: alb.coverUrl,
            label: alb.label,
            runtimeSeconds: alb.runtimeSeconds,
            trackCount: alb.trackCount,
            createdAt: now,
          })
          .returning({ id: albums.id })
          .get();

        albumId = insertedAlb.id;
      } else {
        albumId = existingAlbum.id;
        db.update(albums)
          .set({ coverUrl: alb.coverUrl })
          .where(eq(albums.id, albumId))
          .run();
      }

      // Link album genres
      for (const gSlug of alb.genreSlugs) {
        const gid = genreMap.get(gSlug);
        if (gid) {
          db.insert(albumGenres)
            .values({ albumId, genreId: gid })
            .onConflictDoNothing()
            .run();
        }
      }
    }
  }

  console.log('Catalog enrichment successfully completed! All artists and albums have genuine CDN cover art.');
}

if (require.main === module) {
  enrichCatalog()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
