import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from './index';
import { runMigrations } from './migrate';
import {
  users,
  artists,
  albums,
  tracks,
  genres,
  albumGenres,
  artistGenres,
  trackGenres,
  albumArtists,
  trackArtists,
  editorialFeatures,
} from './schema';

export function seed(targetDb = db): void {
  // Ensure tables and indexes are created first
  runMigrations(targetDb);

  const now = Math.floor(Date.now() / 1000);

  // -------------------------------------------------------------------------
  // 1. Admin User
  // -------------------------------------------------------------------------
  const adminPasswordHash = bcrypt.hashSync('admin123', 10);
  targetDb.insert(users).values({
    username: 'admin',
    email: 'admin@overtone.local',
    passwordHash: adminPasswordHash,
    displayName: 'Overtone Admin',
    bio: 'Platform administrator and music curator.',
    role: 'admin',
    createdAt: now,
    updatedAt: now,
  }).onConflictDoNothing().run();

  // -------------------------------------------------------------------------
  // 2. Genres (5 genres: Rock, Electronic, Hip-Hop, Jazz, Pop)
  // -------------------------------------------------------------------------
  const genresData = [
    {
      name: 'Rock',
      slug: 'rock',
      description: 'Guitar-driven rock and alternative music, spanning classic riffs to experimental art rock.',
    },
    {
      name: 'Electronic',
      slug: 'electronic',
      description: 'Synthesized and computer-based music exploring innovative rhythms, textures, and sound design.',
    },
    {
      name: 'Hip-Hop',
      slug: 'hip-hop',
      description: 'Hip-hop and rap music characterized by rhythmic beat-making, sampling, and poetic lyricism.',
    },
    {
      name: 'Jazz',
      slug: 'jazz',
      description: 'Improvisational American art form spanning swing, bebop, modal jazz, and fusion.',
    },
    {
      name: 'Pop',
      slug: 'pop',
      description: 'Melodic, hook-forward songwriting and contemporary production appealing to broad audiences.',
    },
  ];

  for (const g of genresData) {
    targetDb.insert(genres).values(g).onConflictDoNothing().run();
  }

  // Retrieve genres map
  const existingGenres = targetDb.select().from(genres).all();
  const genreMap = new Map<string, number>();
  for (const g of existingGenres) {
    genreMap.set(g.slug, g.id);
  }

  const rockId = genreMap.get('rock')!;
  const electronicId = genreMap.get('electronic')!;
  const hipHopId = genreMap.get('hip-hop')!;
  const jazzId = genreMap.get('jazz')!;
  const popId = genreMap.get('pop')!;

  // -------------------------------------------------------------------------
  // 3. Artists (5 artists with real names)
  // -------------------------------------------------------------------------
  const artistsData = [
    {
      name: 'Radiohead',
      slug: 'radiohead',
      bio: 'English rock band formed in Abingdon, Oxfordshire, in 1985. Acclaimed for pushing the boundaries of rock, electronic music, and avant-garde composition.',
      imageUrl: '/images/artists/radiohead.jpg',
      country: 'United Kingdom',
      formedYear: 1985,
      disbandedYear: null,
      createdAt: now,
    },
    {
      name: 'Kendrick Lamar',
      slug: 'kendrick-lamar',
      bio: 'American rapper, songwriter, and producer from Compton, California. Celebrated for conceptual storytelling, complex lyricism, and cultural impact.',
      imageUrl: '/images/artists/kendrick-lamar.jpg',
      country: 'United States',
      formedYear: 2003,
      disbandedYear: null,
      createdAt: now,
    },
    {
      name: 'Björk',
      slug: 'bjork',
      bio: 'Icelandic singer, songwriter, composer, and producer. Famous for her idiosyncratic vocal style and eclectic integration of electronic beats, strings, and experimental pop.',
      imageUrl: '/images/artists/bjork.jpg',
      country: 'Iceland',
      formedYear: 1977,
      disbandedYear: null,
      createdAt: now,
    },
    {
      name: 'Miles Davis',
      slug: 'miles-davis',
      bio: 'Legendary American jazz trumpeter, bandleader, and composer who spearheaded modal jazz, hard bop, cool jazz, and jazz-rock fusion across five influential decades.',
      imageUrl: '/images/artists/miles-davis.jpg',
      country: 'United States',
      formedYear: 1944,
      disbandedYear: 1991,
      createdAt: now,
    },
    {
      name: 'Kate Bush',
      slug: 'kate-bush',
      bio: 'Visionary English singer-songwriter, pianist, and producer known for theatrical vocals, literary subject matter, and ground-breaking art pop production.',
      imageUrl: '/images/artists/kate-bush.jpg',
      country: 'United Kingdom',
      formedYear: 1975,
      disbandedYear: null,
      createdAt: now,
    },
  ];

  for (const a of artistsData) {
    targetDb.insert(artists).values(a).onConflictDoNothing().run();
  }

  // Retrieve artists map
  const existingArtists = targetDb.select().from(artists).all();
  const artistMap = new Map<string, number>();
  for (const a of existingArtists) {
    artistMap.set(a.slug, a.id);
  }

  const radioheadId = artistMap.get('radiohead')!;
  const kendrickId = artistMap.get('kendrick-lamar')!;
  const bjorkId = artistMap.get('bjork')!;
  const milesId = artistMap.get('miles-davis')!;
  const kateBushId = artistMap.get('kate-bush')!;

  // -------------------------------------------------------------------------
  // 4. Artist Genres Junction
  // -------------------------------------------------------------------------
  const artistGenrePairs = [
    { artistId: radioheadId, genreId: rockId },
    { artistId: radioheadId, genreId: electronicId },
    { artistId: kendrickId, genreId: hipHopId },
    { artistId: kendrickId, genreId: jazzId },
    { artistId: bjorkId, genreId: electronicId },
    { artistId: bjorkId, genreId: popId },
    { artistId: milesId, genreId: jazzId },
    { artistId: kateBushId, genreId: popId },
    { artistId: kateBushId, genreId: rockId },
  ];

  for (const ag of artistGenrePairs) {
    targetDb.insert(artistGenres).values(ag).onConflictDoNothing().run();
  }

  // -------------------------------------------------------------------------
  // 5. Albums (8 albums with real titles and release dates)
  // -------------------------------------------------------------------------
  const albumsData = [
    {
      title: 'OK Computer',
      slug: 'ok-computer',
      artistId: radioheadId,
      releaseDate: '1997-05-21',
      albumType: 'album' as const,
      coverUrl: '/images/albums/ok-computer.jpg',
      label: 'Parlophone',
      runtimeSeconds: 3192,
      trackCount: 12,
      createdAt: now,
    },
    {
      title: 'Kid A',
      slug: 'kid-a',
      artistId: radioheadId,
      releaseDate: '2000-10-02',
      albumType: 'album' as const,
      coverUrl: '/images/albums/kid-a.jpg',
      label: 'Parlophone',
      runtimeSeconds: 2996,
      trackCount: 10,
      createdAt: now,
    },
    {
      title: 'To Pimp a Butterfly',
      slug: 'to-pimp-a-butterfly',
      artistId: kendrickId,
      releaseDate: '2015-03-15',
      albumType: 'album' as const,
      coverUrl: '/images/albums/to-pimp-a-butterfly.jpg',
      label: 'Top Dawg / Aftermath / Interscope',
      runtimeSeconds: 4731,
      trackCount: 16,
      createdAt: now,
    },
    {
      title: 'good kid, m.A.A.d city',
      slug: 'good-kid-maad-city',
      artistId: kendrickId,
      releaseDate: '2012-10-22',
      albumType: 'album' as const,
      coverUrl: '/images/albums/good-kid-maad-city.jpg',
      label: 'Top Dawg / Aftermath / Interscope',
      runtimeSeconds: 4099,
      trackCount: 12,
      createdAt: now,
    },
    {
      title: 'Homogenic',
      slug: 'homogenic',
      artistId: bjorkId,
      releaseDate: '1997-09-22',
      albumType: 'album' as const,
      coverUrl: '/images/albums/homogenic.jpg',
      label: 'One Little Indian',
      runtimeSeconds: 2616,
      trackCount: 10,
      createdAt: now,
    },
    {
      title: 'Vespertine',
      slug: 'vespertine',
      artistId: bjorkId,
      releaseDate: '2001-08-27',
      albumType: 'album' as const,
      coverUrl: '/images/albums/vespertine.jpg',
      label: 'One Little Indian',
      runtimeSeconds: 3317,
      trackCount: 12,
      createdAt: now,
    },
    {
      title: 'Kind of Blue',
      slug: 'kind-of-blue',
      artistId: milesId,
      releaseDate: '1959-08-17',
      albumType: 'album' as const,
      coverUrl: '/images/albums/kind-of-blue.jpg',
      label: 'Columbia',
      runtimeSeconds: 2726,
      trackCount: 5,
      createdAt: now,
    },
    {
      title: 'Hounds of Love',
      slug: 'hounds-of-love',
      artistId: kateBushId,
      releaseDate: '1985-09-16',
      albumType: 'album' as const,
      coverUrl: '/images/albums/hounds-of-love.jpg',
      label: 'EMI',
      runtimeSeconds: 2843,
      trackCount: 12,
      createdAt: now,
    },
  ];

  for (const alb of albumsData) {
    targetDb.insert(albums).values(alb).onConflictDoNothing().run();
  }

  // Retrieve albums map
  const existingAlbums = targetDb.select().from(albums).all();
  const albumMap = new Map<string, number>();
  for (const alb of existingAlbums) {
    albumMap.set(alb.slug, alb.id);
  }

  const okComputerId = albumMap.get('ok-computer')!;
  const kidAId = albumMap.get('kid-a')!;
  const tpabId = albumMap.get('to-pimp-a-butterfly')!;
  const gkmcId = albumMap.get('good-kid-maad-city')!;
  const homogenicId = albumMap.get('homogenic')!;
  const vespertineId = albumMap.get('vespertine')!;
  const kindOfBlueId = albumMap.get('kind-of-blue')!;
  const houndsOfLoveId = albumMap.get('hounds-of-love')!;

  // -------------------------------------------------------------------------
  // 6. Album Genres Junction & Album Artists Junction
  // -------------------------------------------------------------------------
  const albumGenrePairs = [
    { albumId: okComputerId, genreId: rockId },
    { albumId: okComputerId, genreId: electronicId },
    { albumId: kidAId, genreId: electronicId },
    { albumId: kidAId, genreId: rockId },
    { albumId: tpabId, genreId: hipHopId },
    { albumId: tpabId, genreId: jazzId },
    { albumId: gkmcId, genreId: hipHopId },
    { albumId: homogenicId, genreId: electronicId },
    { albumId: homogenicId, genreId: popId },
    { albumId: vespertineId, genreId: electronicId },
    { albumId: vespertineId, genreId: popId },
    { albumId: kindOfBlueId, genreId: jazzId },
    { albumId: houndsOfLoveId, genreId: popId },
    { albumId: houndsOfLoveId, genreId: rockId },
  ];

  for (const ag of albumGenrePairs) {
    targetDb.insert(albumGenres).values(ag).onConflictDoNothing().run();
  }

  const albumArtistPairs = [
    { albumId: okComputerId, artistId: radioheadId, role: 'primary' as const },
    { albumId: kidAId, artistId: radioheadId, role: 'primary' as const },
    { albumId: tpabId, artistId: kendrickId, role: 'primary' as const },
    { albumId: gkmcId, artistId: kendrickId, role: 'primary' as const },
    { albumId: homogenicId, artistId: bjorkId, role: 'primary' as const },
    { albumId: vespertineId, artistId: bjorkId, role: 'primary' as const },
    { albumId: kindOfBlueId, artistId: milesId, role: 'primary' as const },
    { albumId: houndsOfLoveId, artistId: kateBushId, role: 'primary' as const },
  ];

  for (const aa of albumArtistPairs) {
    targetDb.insert(albumArtists).values(aa).onConflictDoNothing().run();
  }

  // -------------------------------------------------------------------------
  // 7. Tracks for Albums (OK Computer, TPAB, Kind of Blue, Hounds of Love)
  // -------------------------------------------------------------------------
  const okComputerTracks = [
    { title: 'Airbag', slug: 'airbag', trackNumber: 1, durationSeconds: 284 },
    { title: 'Paranoid Android', slug: 'paranoid-android', trackNumber: 2, durationSeconds: 383 },
    { title: 'Subterranean Homesick Alien', slug: 'subterranean-homesick-alien', trackNumber: 3, durationSeconds: 267 },
    { title: 'Exit Music (For a Film)', slug: 'exit-music-for-a-film', trackNumber: 4, durationSeconds: 264 },
    { title: 'Let Down', slug: 'let-down', trackNumber: 5, durationSeconds: 299 },
    { title: 'Karma Police', slug: 'karma-police', trackNumber: 6, durationSeconds: 261 },
    { title: 'Fitter Happier', slug: 'fitter-happier', trackNumber: 7, durationSeconds: 117 },
    { title: 'Electioneering', slug: 'electioneering', trackNumber: 8, durationSeconds: 230 },
    { title: 'Climbing Up the Walls', slug: 'climbing-up-the-walls', trackNumber: 9, durationSeconds: 285 },
    { title: 'No Surprises', slug: 'no-surprises', trackNumber: 10, durationSeconds: 228 },
    { title: 'Lucky', slug: 'lucky', trackNumber: 11, durationSeconds: 259 },
    { title: 'The Tourist', slug: 'the-tourist', trackNumber: 12, durationSeconds: 324 },
  ];

  for (const t of okComputerTracks) {
    const existing = targetDb.select().from(tracks).where(
      sql`${tracks.albumId} = ${okComputerId} AND ${tracks.slug} = ${t.slug}`
    ).get();

    let trackId: number;
    if (!existing) {
      const inserted = targetDb.insert(tracks).values({
        title: t.title,
        slug: t.slug,
        albumId: okComputerId,
        artistId: radioheadId,
        trackNumber: t.trackNumber,
        discNumber: 1,
        durationSeconds: t.durationSeconds,
        explicit: 0,
        createdAt: now,
      }).returning({ id: tracks.id }).get();
      trackId = inserted.id;
    } else {
      trackId = existing.id;
    }

    targetDb.insert(trackArtists).values({ trackId, artistId: radioheadId, role: 'primary' }).onConflictDoNothing().run();
    targetDb.insert(trackGenres).values({ trackId, genreId: rockId }).onConflictDoNothing().run();
  }

  const tpabTracks = [
    { title: "Wesley's Theory", slug: 'wesleys-theory', trackNumber: 1, durationSeconds: 287, explicit: 1 },
    { title: 'For Free? (Interlude)', slug: 'for-free-interlude', trackNumber: 2, durationSeconds: 131, explicit: 1 },
    { title: 'King Kunta', slug: 'king-kunta', trackNumber: 3, durationSeconds: 234, explicit: 1 },
    { title: 'Institutionalized', slug: 'institutionalized', trackNumber: 4, durationSeconds: 271, explicit: 1 },
    { title: 'These Walls', slug: 'these-walls', trackNumber: 5, durationSeconds: 300, explicit: 1 },
    { title: 'u', slug: 'u', trackNumber: 6, durationSeconds: 268, explicit: 1 },
    { title: 'Alright', slug: 'alright', trackNumber: 7, durationSeconds: 219, explicit: 1 },
    { title: 'For Sale? (Interlude)', slug: 'for-sale-interlude', trackNumber: 8, durationSeconds: 291, explicit: 0 },
    { title: 'Momma', slug: 'momma', trackNumber: 9, durationSeconds: 283, explicit: 1 },
    { title: 'Hood Politics', slug: 'hood-politics', trackNumber: 10, durationSeconds: 283, explicit: 1 },
    { title: 'How Much a Dollar Cost', slug: 'how-much-a-dollar-cost', trackNumber: 11, durationSeconds: 261, explicit: 1 },
    { title: 'Complexion (A Zulu Love)', slug: 'complexion-a-zulu-love', trackNumber: 12, durationSeconds: 263, explicit: 0 },
    { title: 'The Blacker the Berry', slug: 'the-blacker-the-berry', trackNumber: 13, durationSeconds: 328, explicit: 1 },
    { title: "You Ain't Gotta Lie (Momma Said)", slug: 'you-aint-gotta-lie', trackNumber: 14, durationSeconds: 241, explicit: 0 },
    { title: 'i', slug: 'i', trackNumber: 15, durationSeconds: 336, explicit: 1 },
    { title: 'Mortal Man', slug: 'mortal-man', trackNumber: 16, durationSeconds: 727, explicit: 1 },
  ];

  for (const t of tpabTracks) {
    const existing = targetDb.select().from(tracks).where(
      sql`${tracks.albumId} = ${tpabId} AND ${tracks.slug} = ${t.slug}`
    ).get();

    let trackId: number;
    if (!existing) {
      const inserted = targetDb.insert(tracks).values({
        title: t.title,
        slug: t.slug,
        albumId: tpabId,
        artistId: kendrickId,
        trackNumber: t.trackNumber,
        discNumber: 1,
        durationSeconds: t.durationSeconds,
        explicit: t.explicit,
        createdAt: now,
      }).returning({ id: tracks.id }).get();
      trackId = inserted.id;
    } else {
      trackId = existing.id;
    }

    targetDb.insert(trackArtists).values({ trackId, artistId: kendrickId, role: 'primary' }).onConflictDoNothing().run();
    targetDb.insert(trackGenres).values({ trackId, genreId: hipHopId }).onConflictDoNothing().run();
  }

  const kindOfBlueTracks = [
    { title: 'So What', slug: 'so-what', trackNumber: 1, durationSeconds: 562 },
    { title: 'Freddie Freeloader', slug: 'freddie-freeloader', trackNumber: 2, durationSeconds: 586 },
    { title: 'Blue in Green', slug: 'blue-in-green', trackNumber: 3, durationSeconds: 337 },
    { title: 'All Blues', slug: 'all-blues', trackNumber: 4, durationSeconds: 693 },
    { title: 'Flamenco Sketches', slug: 'flamenco-sketches', trackNumber: 5, durationSeconds: 566 },
  ];

  for (const t of kindOfBlueTracks) {
    const existing = targetDb.select().from(tracks).where(
      sql`${tracks.albumId} = ${kindOfBlueId} AND ${tracks.slug} = ${t.slug}`
    ).get();

    let trackId: number;
    if (!existing) {
      const inserted = targetDb.insert(tracks).values({
        title: t.title,
        slug: t.slug,
        albumId: kindOfBlueId,
        artistId: milesId,
        trackNumber: t.trackNumber,
        discNumber: 1,
        durationSeconds: t.durationSeconds,
        explicit: 0,
        createdAt: now,
      }).returning({ id: tracks.id }).get();
      trackId = inserted.id;
    } else {
      trackId = existing.id;
    }

    targetDb.insert(trackArtists).values({ trackId, artistId: milesId, role: 'primary' }).onConflictDoNothing().run();
    targetDb.insert(trackGenres).values({ trackId, genreId: jazzId }).onConflictDoNothing().run();
  }

  const houndsOfLoveTracks = [
    { title: 'Running Up That Hill (A Deal with God)', slug: 'running-up-that-hill', trackNumber: 1, durationSeconds: 301 },
    { title: 'Hounds of Love', slug: 'hounds-of-love', trackNumber: 2, durationSeconds: 182 },
    { title: 'The Big Sky', slug: 'the-big-sky', trackNumber: 3, durationSeconds: 281 },
    { title: 'Mother Stands for Comfort', slug: 'mother-stands-for-comfort', trackNumber: 4, durationSeconds: 187 },
    { title: 'Cloudbusting', slug: 'cloudbusting', trackNumber: 5, durationSeconds: 310 },
    { title: 'And Dream of Sheep', slug: 'and-dream-of-sheep', trackNumber: 6, durationSeconds: 165 },
    { title: 'Under Ice', slug: 'under-ice', trackNumber: 7, durationSeconds: 141 },
    { title: 'Waking the Witch', slug: 'waking-the-witch', trackNumber: 8, durationSeconds: 258 },
    { title: 'Watching You Without Me', slug: 'watching-you-without-me', trackNumber: 9, durationSeconds: 246 },
    { title: 'Jig of Life', slug: 'jig-of-life', trackNumber: 10, durationSeconds: 244 },
    { title: 'Hello Earth', slug: 'hello-earth', trackNumber: 11, durationSeconds: 374 },
    { title: 'The Morning Fog', slug: 'the-morning-fog', trackNumber: 12, durationSeconds: 154 },
  ];

  for (const t of houndsOfLoveTracks) {
    const existing = targetDb.select().from(tracks).where(
      sql`${tracks.albumId} = ${houndsOfLoveId} AND ${tracks.slug} = ${t.slug}`
    ).get();

    let trackId: number;
    if (!existing) {
      const inserted = targetDb.insert(tracks).values({
        title: t.title,
        slug: t.slug,
        albumId: houndsOfLoveId,
        artistId: kateBushId,
        trackNumber: t.trackNumber,
        discNumber: 1,
        durationSeconds: t.durationSeconds,
        explicit: 0,
        createdAt: now,
      }).returning({ id: tracks.id }).get();
      trackId = inserted.id;
    } else {
      trackId = existing.id;
    }

    targetDb.insert(trackArtists).values({ trackId, artistId: kateBushId, role: 'primary' }).onConflictDoNothing().run();
    targetDb.insert(trackGenres).values({ trackId, genreId: popId }).onConflictDoNothing().run();
  }

  // -------------------------------------------------------------------------
  // 8. 1 Editorial Feature
  // -------------------------------------------------------------------------
  targetDb.insert(editorialFeatures).values({
    title: 'Masterpiece Retrospective: OK Computer at 30',
    subtitle: 'How Radiohead predicted digital isolation and defined modern art rock.',
    body: 'When Radiohead retreated to St Catherine Court in Bath to record their third album, they set aside Britpop conventions to craft an enduring study of technological anxiety, consumerism, and human connection. Decades later, OK Computer remains a towering milestone in contemporary music history.',
    targetType: 'album',
    targetId: okComputerId,
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/07/60/ba/0760ba0f-148c-b18f-d0ff-169ee96f3af5/634904078164.png/600x600bb.jpg',
    isActive: 1,
    position: 1,
    createdAt: now,
  }).onConflictDoNothing().run();

  // Run catalog enrichment to populate high-res artwork and complete 29+ artist discography
  try {
    const { enrichCatalog } = require('./enrichCatalog');
    enrichCatalog();
  } catch (err) {
    console.error('Failed to run enrichCatalog:', err);
  }
}

// Auto-run if executed directly as entry script
if (typeof require !== 'undefined' && require.main === module) {
  seed();
  console.log('Database seeded successfully.');
}
