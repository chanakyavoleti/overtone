import { sqliteTable, text, integer, primaryKey, uniqueIndex, check } from 'drizzle-orm/sqlite-core';
import { sql, relations } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// 1. Users Table
// ---------------------------------------------------------------------------
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('passwordHash').notNull(),
  displayName: text('displayName'),
  bio: text('bio'),
  avatarUrl: text('avatarUrl'),
  role: text('role', { enum: ['user', 'moderator', 'admin'] }).default('user').notNull(),
  createdAt: integer('createdAt'),
  updatedAt: integer('updatedAt'),
});

// ---------------------------------------------------------------------------
// 2. Artists Table
// ---------------------------------------------------------------------------
export const artists = sqliteTable('artists', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  bio: text('bio'),
  imageUrl: text('imageUrl'),
  country: text('country'),
  formedYear: integer('formedYear'),
  disbandedYear: integer('disbandedYear'),
  aliases: text('aliases'),
  enrichmentStatus: text('enrichmentStatus').default('pending'),
  lastEnrichedAt: integer('lastEnrichedAt'),
  providerIds: text('providerIds'),
  createdAt: integer('createdAt'),
});

// ---------------------------------------------------------------------------
// 3. Albums Table
// ---------------------------------------------------------------------------
export const albums = sqliteTable('albums', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  artistId: integer('artistId').references(() => artists.id),
  releaseDate: text('releaseDate'),
  albumType: text('albumType', { enum: ['album', 'ep', 'single', 'compilation', 'soundtrack'] }).default('album').notNull(),
  coverUrl: text('coverUrl'),
  label: text('label'),
  runtimeSeconds: integer('runtimeSeconds'),
  trackCount: integer('trackCount').default(0).notNull(),
  providerId: text('providerId'),
  createdAt: integer('createdAt'),
});

// ---------------------------------------------------------------------------
// 4. Tracks Table
// ---------------------------------------------------------------------------
export const tracks = sqliteTable('tracks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  albumId: integer('albumId').references(() => albums.id),
  artistId: integer('artistId').references(() => artists.id),
  trackNumber: integer('trackNumber'),
  discNumber: integer('discNumber').default(1).notNull(),
  durationSeconds: integer('durationSeconds'),
  explicit: integer('explicit').default(0).notNull(),
  createdAt: integer('createdAt'),
});

// ---------------------------------------------------------------------------
// 5. Genres Table
// ---------------------------------------------------------------------------
export const genres = sqliteTable('genres', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
});

// ---------------------------------------------------------------------------
// 6. Album Genres Junction Table
// ---------------------------------------------------------------------------
export const albumGenres = sqliteTable('album_genres', {
  albumId: integer('albumId').notNull().references(() => albums.id),
  genreId: integer('genreId').notNull().references(() => genres.id),
}, (t) => [
  primaryKey({ columns: [t.albumId, t.genreId] }),
]);

// ---------------------------------------------------------------------------
// 7. Artist Genres Junction Table
// ---------------------------------------------------------------------------
export const artistGenres = sqliteTable('artist_genres', {
  artistId: integer('artistId').notNull().references(() => artists.id),
  genreId: integer('genreId').notNull().references(() => genres.id),
}, (t) => [
  primaryKey({ columns: [t.artistId, t.genreId] }),
]);

// ---------------------------------------------------------------------------
// 8. Track Genres Junction Table
// ---------------------------------------------------------------------------
export const trackGenres = sqliteTable('track_genres', {
  trackId: integer('trackId').notNull().references(() => tracks.id),
  genreId: integer('genreId').notNull().references(() => genres.id),
}, (t) => [
  primaryKey({ columns: [t.trackId, t.genreId] }),
]);

// ---------------------------------------------------------------------------
// 9. Album Artists Junction Table
// ---------------------------------------------------------------------------
export const albumArtists = sqliteTable('album_artists', {
  albumId: integer('albumId').notNull().references(() => albums.id),
  artistId: integer('artistId').notNull().references(() => artists.id),
  role: text('role', { enum: ['primary', 'featured', 'producer'] }).default('primary').notNull(),
}, (t) => [
  primaryKey({ columns: [t.albumId, t.artistId] }),
]);

// ---------------------------------------------------------------------------
// 10. Track Artists Junction Table
// ---------------------------------------------------------------------------
export const trackArtists = sqliteTable('track_artists', {
  trackId: integer('trackId').notNull().references(() => tracks.id),
  artistId: integer('artistId').notNull().references(() => artists.id),
  role: text('role').default('primary').notNull(),
}, (t) => [
  primaryKey({ columns: [t.trackId, t.artistId] }),
]);

// ---------------------------------------------------------------------------
// 11. Ratings Table
// ---------------------------------------------------------------------------
export const ratings = sqliteTable('ratings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('userId').notNull().references(() => users.id),
  targetType: text('targetType', { enum: ['album', 'track', 'artist'] }).notNull(),
  targetId: integer('targetId').notNull(),
  score: integer('score').notNull(),
  createdAt: integer('createdAt'),
  updatedAt: integer('updatedAt'),
}, (t) => [
  uniqueIndex('ratings_userId_targetType_targetId_idx').on(t.userId, t.targetType, t.targetId),
  check('ratings_score_check', sql`${t.score} >= 0 AND ${t.score} <= 100`),
]);

// ---------------------------------------------------------------------------
// 12. Reviews Table
// ---------------------------------------------------------------------------
export const reviews = sqliteTable('reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('userId').notNull().references(() => users.id),
  targetType: text('targetType').notNull(),
  targetId: integer('targetId').notNull(),
  title: text('title'),
  body: text('body').notNull(),
  ratingId: integer('ratingId').references(() => ratings.id),
  createdAt: integer('createdAt'),
  updatedAt: integer('updatedAt'),
});

// ---------------------------------------------------------------------------
// 13. Review Votes Table
// ---------------------------------------------------------------------------
export const reviewVotes = sqliteTable('review_votes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('userId').notNull().references(() => users.id),
  reviewId: integer('reviewId').notNull().references(() => reviews.id),
  createdAt: integer('createdAt'),
}, (t) => [
  uniqueIndex('review_votes_userId_reviewId_idx').on(t.userId, t.reviewId),
]);

// ---------------------------------------------------------------------------
// 14. Review Reports Table
// ---------------------------------------------------------------------------
export const reviewReports = sqliteTable('review_reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('userId').notNull().references(() => users.id),
  reviewId: integer('reviewId').notNull().references(() => reviews.id),
  reason: text('reason').notNull(),
  status: text('status').default('pending').notNull(),
  createdAt: integer('createdAt'),
});

// ---------------------------------------------------------------------------
// 15. Lists Table
// ---------------------------------------------------------------------------
export const lists = sqliteTable('lists', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('userId').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  isPublic: integer('isPublic').default(1).notNull(),
  coverUrl: text('coverUrl'),
  createdAt: integer('createdAt'),
  updatedAt: integer('updatedAt'),
});

// ---------------------------------------------------------------------------
// 16. List Items Table
// ---------------------------------------------------------------------------
export const listItems = sqliteTable('list_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  listId: integer('listId').notNull().references(() => lists.id, { onDelete: 'cascade' }),
  albumId: integer('albumId').references(() => albums.id),
  position: integer('position').notNull(),
  annotation: text('annotation'),
});

// ---------------------------------------------------------------------------
// 17. Collections Table
// ---------------------------------------------------------------------------
export const collections = sqliteTable('collections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('userId').notNull().references(() => users.id),
  albumId: integer('albumId').notNull().references(() => albums.id),
  status: text('status', { enum: ['owned', 'wishlist', 'listened'] }).default('listened').notNull(),
  createdAt: integer('createdAt'),
}, (t) => [
  uniqueIndex('collections_userId_albumId_idx').on(t.userId, t.albumId),
]);

// ---------------------------------------------------------------------------
// 18. Follows Table
// ---------------------------------------------------------------------------
export const follows = sqliteTable('follows', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  followerId: integer('followerId').notNull().references(() => users.id),
  followingId: integer('followingId').notNull().references(() => users.id),
  createdAt: integer('createdAt'),
}, (t) => [
  uniqueIndex('follows_followerId_followingId_idx').on(t.followerId, t.followingId),
]);

// ---------------------------------------------------------------------------
// 19. Editorial Features Table
// ---------------------------------------------------------------------------
export const editorialFeatures = sqliteTable('editorial_features', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  body: text('body'),
  targetType: text('targetType'),
  targetId: integer('targetId'),
  imageUrl: text('imageUrl'),
  isActive: integer('isActive').default(1).notNull(),
  position: integer('position').default(0).notNull(),
  createdAt: integer('createdAt'),
});

// ===========================================================================
// Relational Definitions
// ===========================================================================

export const usersRelations = relations(users, ({ many }) => ({
  ratings: many(ratings),
  reviews: many(reviews),
  reviewVotes: many(reviewVotes),
  reviewReports: many(reviewReports),
  lists: many(lists),
  collections: many(collections),
  following: many(follows, { relationName: 'userFollowing' }),
  followers: many(follows, { relationName: 'userFollowers' }),
}));

export const artistsRelations = relations(artists, ({ many }) => ({
  albums: many(albums),
  tracks: many(tracks),
  artistGenres: many(artistGenres),
  albumArtists: many(albumArtists),
  trackArtists: many(trackArtists),
}));

export const albumsRelations = relations(albums, ({ one, many }) => ({
  artist: one(artists, {
    fields: [albums.artistId],
    references: [artists.id],
  }),
  tracks: many(tracks),
  albumGenres: many(albumGenres),
  albumArtists: many(albumArtists),
  listItems: many(listItems),
  collections: many(collections),
}));

export const tracksRelations = relations(tracks, ({ one, many }) => ({
  album: one(albums, {
    fields: [tracks.albumId],
    references: [albums.id],
  }),
  artist: one(artists, {
    fields: [tracks.artistId],
    references: [artists.id],
  }),
  trackGenres: many(trackGenres),
  trackArtists: many(trackArtists),
}));

export const genresRelations = relations(genres, ({ many }) => ({
  albumGenres: many(albumGenres),
  artistGenres: many(artistGenres),
  trackGenres: many(trackGenres),
}));

export const albumGenresRelations = relations(albumGenres, ({ one }) => ({
  album: one(albums, {
    fields: [albumGenres.albumId],
    references: [albums.id],
  }),
  genre: one(genres, {
    fields: [albumGenres.genreId],
    references: [genres.id],
  }),
}));

export const artistGenresRelations = relations(artistGenres, ({ one }) => ({
  artist: one(artists, {
    fields: [artistGenres.artistId],
    references: [artists.id],
  }),
  genre: one(genres, {
    fields: [artistGenres.genreId],
    references: [genres.id],
  }),
}));

export const trackGenresRelations = relations(trackGenres, ({ one }) => ({
  track: one(tracks, {
    fields: [trackGenres.trackId],
    references: [tracks.id],
  }),
  genre: one(genres, {
    fields: [trackGenres.genreId],
    references: [genres.id],
  }),
}));

export const albumArtistsRelations = relations(albumArtists, ({ one }) => ({
  album: one(albums, {
    fields: [albumArtists.albumId],
    references: [albums.id],
  }),
  artist: one(artists, {
    fields: [albumArtists.artistId],
    references: [artists.id],
  }),
}));

export const trackArtistsRelations = relations(trackArtists, ({ one }) => ({
  track: one(tracks, {
    fields: [trackArtists.trackId],
    references: [tracks.id],
  }),
  artist: one(artists, {
    fields: [trackArtists.artistId],
    references: [artists.id],
  }),
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
  user: one(users, {
    fields: [ratings.userId],
    references: [users.id],
  }),
  review: one(reviews),
}));

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  rating: one(ratings, {
    fields: [reviews.ratingId],
    references: [ratings.id],
  }),
  votes: many(reviewVotes),
  reports: many(reviewReports),
}));

export const reviewVotesRelations = relations(reviewVotes, ({ one }) => ({
  user: one(users, {
    fields: [reviewVotes.userId],
    references: [users.id],
  }),
  review: one(reviews, {
    fields: [reviewVotes.reviewId],
    references: [reviews.id],
  }),
}));

export const reviewReportsRelations = relations(reviewReports, ({ one }) => ({
  user: one(users, {
    fields: [reviewReports.userId],
    references: [users.id],
  }),
  review: one(reviews, {
    fields: [reviewReports.reviewId],
    references: [reviews.id],
  }),
}));

export const listsRelations = relations(lists, ({ one, many }) => ({
  user: one(users, {
    fields: [lists.userId],
    references: [users.id],
  }),
  items: many(listItems),
}));

export const listItemsRelations = relations(listItems, ({ one }) => ({
  list: one(lists, {
    fields: [listItems.listId],
    references: [lists.id],
  }),
  album: one(albums, {
    fields: [listItems.albumId],
    references: [albums.id],
  }),
}));

export const collectionsRelations = relations(collections, ({ one }) => ({
  user: one(users, {
    fields: [collections.userId],
    references: [users.id],
  }),
  album: one(albums, {
    fields: [collections.albumId],
    references: [albums.id],
  }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: 'userFollowing',
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: 'userFollowers',
  }),
}));

// ===========================================================================
// Inferred TypeScript Types
// ===========================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Artist = typeof artists.$inferSelect;
export type NewArtist = typeof artists.$inferInsert;

export type Album = typeof albums.$inferSelect;
export type NewAlbum = typeof albums.$inferInsert;

export type Track = typeof tracks.$inferSelect;
export type NewTrack = typeof tracks.$inferInsert;

export type Genre = typeof genres.$inferSelect;
export type NewGenre = typeof genres.$inferInsert;

export type AlbumGenre = typeof albumGenres.$inferSelect;
export type NewAlbumGenre = typeof albumGenres.$inferInsert;

export type ArtistGenre = typeof artistGenres.$inferSelect;
export type NewArtistGenre = typeof artistGenres.$inferInsert;

export type TrackGenre = typeof trackGenres.$inferSelect;
export type NewTrackGenre = typeof trackGenres.$inferInsert;

export type AlbumArtist = typeof albumArtists.$inferSelect;
export type NewAlbumArtist = typeof albumArtists.$inferInsert;

export type TrackArtist = typeof trackArtists.$inferSelect;
export type NewTrackArtist = typeof trackArtists.$inferInsert;

export type Rating = typeof ratings.$inferSelect;
export type NewRating = typeof ratings.$inferInsert;

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;

export type ReviewVote = typeof reviewVotes.$inferSelect;
export type NewReviewVote = typeof reviewVotes.$inferInsert;

export type ReviewReport = typeof reviewReports.$inferSelect;
export type NewReviewReport = typeof reviewReports.$inferInsert;

export type List = typeof lists.$inferSelect;
export type NewList = typeof lists.$inferInsert;

export type ListItem = typeof listItems.$inferSelect;
export type NewListItem = typeof listItems.$inferInsert;

export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;

export type Follow = typeof follows.$inferSelect;
export type NewFollow = typeof follows.$inferInsert;

export type EditorialFeature = typeof editorialFeatures.$inferSelect;
export type NewEditorialFeature = typeof editorialFeatures.$inferInsert;
