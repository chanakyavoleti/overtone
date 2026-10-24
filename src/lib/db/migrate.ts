import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import { db } from './index';

export function runMigrations(targetDb = db): void {
  // Ensure foreign keys and WAL mode are active
  targetDb.run(sql`PRAGMA journal_mode = WAL;`);
  targetDb.run(sql`PRAGMA foreign_keys = ON;`);

  // 1. users
  targetDb.run(sql`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      displayName TEXT,
      bio TEXT,
      avatarUrl TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      createdAt INTEGER,
      updatedAt INTEGER
    );
  `);

  // 2. artists
  targetDb.run(sql`
    CREATE TABLE IF NOT EXISTS artists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      bio TEXT,
      imageUrl TEXT,
      country TEXT,
      formedYear INTEGER,
      disbandedYear INTEGER,
      createdAt INTEGER
    );
  `);

  // 3. albums
  targetDb.run(sql`
    CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      artistId INTEGER REFERENCES artists(id),
      releaseDate TEXT,
      albumType TEXT NOT NULL DEFAULT 'album',
      coverUrl TEXT,
      label TEXT,
      runtimeSeconds INTEGER,
      trackCount INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER
    );
  `);

  // 4. tracks
  targetDb.run(sql`
    CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      albumId INTEGER REFERENCES albums(id),
      artistId INTEGER REFERENCES artists(id),
      trackNumber INTEGER,
      discNumber INTEGER NOT NULL DEFAULT 1,
      durationSeconds INTEGER,
      explicit INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER
    );
  `);

  // 5. genres
  targetDb.run(sql`
    CREATE TABLE IF NOT EXISTS genres (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT
    );
  `);

  // 6. album_genres
  targetDb.run(sql`
    CREATE TABLE IF NOT EXISTS album_genres (
      albumId INTEGER NOT NULL REFERENCES albums(id),
      genreId INTEGER NOT NULL REFERENCES genres(id),
      PRIMARY KEY (albumId, genreId)
    );
  `);

  // 7. artist_genres
  targetDb.run(sql`
    CREATE TABLE IF NOT EXISTS artist_genres (
      artistId INTEGER NOT NULL REFERENCES artists(id),
      genreId INTEGER NOT NULL REFERENCES genres(id),
      PRIMARY KEY (artistId, genreId)
    );
  `);

  // 8. track_genres
  targetDb.run(sql`
    CREATE TABLE IF NOT EXISTS track_genres (
      trackId INTEGER NOT NULL REFERENCES tracks(id),
      genreId INTEGER NOT NULL REFERENCES genres(id),
      PRIMARY KEY (trackId, genreId)
    );
  `);

  // 9. album_artists
  targetDb.run(sql`
    CREATE TABLE IF NOT EXISTS album_artists (
      albumId INTEGER NOT NULL REFERENCES albums(id),
      artistId INTEGER NOT NULL REFERENCES artists(id),
      role TEXT NOT NULL DEFAULT 'primary',
      PRIMARY KEY (albumId, artistId)
    );
  `);

  // 10. track_artists
  targetDb.run(sql`
    CREATE TABLE IF NOT EXISTS track_artists (
      trackId INTEGER NOT NULL REFERENCES tracks(id),
      artistId INTEGER NOT NULL REFERENCES artists(id),
      role TEXT NOT NULL DEFAULT 'primary',
      PRIMARY KEY (trackId, artistId)
    );
  `);

  // 11. ratings
  targetDb.run(sql`
    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL REFERENCES users(id),
      targetType TEXT NOT NULL,
      targetId INTEGER NOT NULL,
      score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
      createdAt INTEGER,
      updatedAt INTEGER
    );
  `);

  // 12. reviews
  targetDb.run(sql`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL REFERENCES users(id),
      targetType TEXT NOT NULL,
      targetId INTEGER NOT NULL,
      title TEXT,
      body TEXT NOT NULL,
      ratingId INTEGER REFERENCES ratings(id),
      createdAt INTEGER,
      updatedAt INTEGER
    );
  `);

  // 13. review_votes
  targetDb.run(sql`
    CREATE TABLE IF NOT EXISTS review_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL REFERENCES users(id),
      reviewId INTEGER NOT NULL REFERENCES reviews(id),
      createdAt INTEGER
    );
  `);

  // 14. review_reports
  targetDb.run(sql`
    CREATE TABLE IF NOT EXISTS review_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL REFERENCES users(id),
      reviewId INTEGER NOT NULL REFERENCES reviews(id),
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt INTEGER
    );
  `);

  // 15. lists
  targetDb.run(sql`
    CREATE TABLE IF NOT EXISTS lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT,
      isPublic INTEGER NOT NULL DEFAULT 1,
      coverUrl TEXT,
      createdAt INTEGER,
      updatedAt INTEGER
    );
  `);

  // 16. list_items
  targetDb.run(sql`
    CREATE TABLE IF NOT EXISTS list_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listId INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
      albumId INTEGER REFERENCES albums(id),
      position INTEGER NOT NULL,
      annotation TEXT
    );
  `);

  // 17. collections
  targetDb.run(sql`
    CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL REFERENCES users(id),
      albumId INTEGER NOT NULL REFERENCES albums(id),
      status TEXT NOT NULL DEFAULT 'listened',
      createdAt INTEGER
    );
  `);

  // 18. follows
  targetDb.run(sql`
    CREATE TABLE IF NOT EXISTS follows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      followerId INTEGER NOT NULL REFERENCES users(id),
      followingId INTEGER NOT NULL REFERENCES users(id),
      createdAt INTEGER
    );
  `);

  // 19. editorial_features
  targetDb.run(sql`
    CREATE TABLE IF NOT EXISTS editorial_features (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subtitle TEXT,
      body TEXT,
      targetType TEXT,
      targetId INTEGER,
      imageUrl TEXT,
      isActive INTEGER NOT NULL DEFAULT 1,
      position INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER
    );
  `);

  // 21. password_reset_tokens
  targetDb.run(sql`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL REFERENCES users(id),
      tokenHash TEXT NOT NULL,
      expiresAt INTEGER NOT NULL,
      usedAt INTEGER,
      createdAt INTEGER
    );
  `);

  // Indexes
  targetDb.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS ratings_userId_targetType_targetId_idx ON ratings (userId, targetType, targetId);`);
  targetDb.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS review_votes_userId_reviewId_idx ON review_votes (userId, reviewId);`);
  targetDb.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS collections_userId_albumId_idx ON collections (userId, albumId);`);
  targetDb.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS follows_followerId_followingId_idx ON follows (followerId, followingId);`);

  // Additional performance indexes on foreign keys
  targetDb.run(sql`CREATE INDEX IF NOT EXISTS idx_albums_artistId ON albums (artistId);`);
  targetDb.run(sql`CREATE INDEX IF NOT EXISTS idx_tracks_albumId ON tracks (albumId);`);
  targetDb.run(sql`CREATE INDEX IF NOT EXISTS idx_tracks_artistId ON tracks (artistId);`);
  targetDb.run(sql`CREATE INDEX IF NOT EXISTS idx_ratings_target ON ratings (targetType, targetId);`);
  targetDb.run(sql`CREATE INDEX IF NOT EXISTS idx_reviews_target ON reviews (targetType, targetId);`);
  targetDb.run(sql`CREATE INDEX IF NOT EXISTS idx_reviews_userId ON reviews (userId);`);
  targetDb.run(sql`CREATE INDEX IF NOT EXISTS idx_lists_userId ON lists (userId);`);
  targetDb.run(sql`CREATE INDEX IF NOT EXISTS idx_list_items_listId ON list_items (listId);`);
  targetDb.run(sql`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_tokenHash ON password_reset_tokens (tokenHash);`);
  targetDb.run(sql`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_userId ON password_reset_tokens (userId);`);

  // Safe non-destructive column additions
  try {
    const artistCols = targetDb.all(sql`PRAGMA table_info(artists);`) as Array<{ name: string }>;
    const artistColNames = new Set(artistCols.map(c => c.name));
    if (!artistColNames.has('aliases')) {
      targetDb.run(sql`ALTER TABLE artists ADD COLUMN aliases TEXT;`);
    }
    if (!artistColNames.has('enrichmentStatus')) {
      targetDb.run(sql`ALTER TABLE artists ADD COLUMN enrichmentStatus TEXT DEFAULT 'pending';`);
    }
    if (!artistColNames.has('lastEnrichedAt')) {
      targetDb.run(sql`ALTER TABLE artists ADD COLUMN lastEnrichedAt INTEGER;`);
    }
    if (!artistColNames.has('providerIds')) {
      targetDb.run(sql`ALTER TABLE artists ADD COLUMN providerIds TEXT;`);
    }

    const albumCols = targetDb.all(sql`PRAGMA table_info(albums);`) as Array<{ name: string }>;
    const albumColNames = new Set(albumCols.map(c => c.name));
    if (!albumColNames.has('providerId')) {
      targetDb.run(sql`ALTER TABLE albums ADD COLUMN providerId TEXT;`);
    }
  } catch (err) {
    console.error('Error applying column additions:', err);
  }
}

// Auto-run if executed directly as entry script
if (typeof require !== 'undefined' && require.main === module) {
  runMigrations();
  console.log('Migrations applied successfully.');
}
