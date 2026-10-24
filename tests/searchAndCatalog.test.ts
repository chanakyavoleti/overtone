import { describe, it, expect } from 'vitest';
import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';
import { albums, artists } from '../src/lib/db/schema';
import { resolveCanonicalSlug } from '../src/lib/metadata/normalization';
import { sendPasswordResetEmail, getBaseUrl } from '../src/lib/email/emailService';

describe('Catalog Integrity & Multi-entity Search Verification', () => {
  it('correctly maps canonical aliases for regional and western artists', () => {
    expect(resolveCanonicalSlug('dsp')).toBe('devi-sri-prasad');
    expect(resolveCanonicalSlug('devisri-prasad')).toBe('devi-sri-prasad');
    expect(resolveCanonicalSlug('spb')).toBe('s-p-balasubrahmanyam');
    expect(resolveCanonicalSlug('ar-rahman')).toBe('a-r-rahman');
    expect(resolveCanonicalSlug('anirudh')).toBe('anirudh-ravichander');
    expect(resolveCanonicalSlug('mm-keeravaani')).toBe('mm-keeravani');
    expect(resolveCanonicalSlug('ks-chitra')).toBe('ks-chithra');
    expect(resolveCanonicalSlug('thaman-s')).toBe('thaman');
    expect(resolveCanonicalSlug('kj-yesudas')).toBe('k-j-yesudas');
  });

  it('verifies that misplaced soundtracks are correctly attributed to music directors', () => {
    const dsp = db.all(sql`SELECT id FROM artists WHERE slug = 'devi-sri-prasad'`)[0] as any;
    expect(dsp).toBeDefined();

    // Verify DSP soundtracks
    const dspAlbums = db.all(sql`
      SELECT title, albumType FROM albums 
      WHERE artistId = ${dsp.id} AND (
        title LIKE '%Sarileru Neekevvaru%' OR 
        title LIKE '%Nenokkadine%' OR 
        title LIKE '%Maharshi%'
      )
    `) as any[];
    expect(dspAlbums.length).toBeGreaterThanOrEqual(2);
    expect(dspAlbums.every(a => a.albumType === 'soundtrack')).toBe(true);

    // Verify Thaman soundtracks
    const thaman = db.all(sql`SELECT id FROM artists WHERE slug = 'thaman'`)[0] as any;
    expect(thaman).toBeDefined();
    const thamanAlbums = db.all(sql`
      SELECT title, albumType FROM albums 
      WHERE artistId = ${thaman.id} AND (
        title LIKE '%Aagadu%' OR 
        title LIKE '%Guntur Kaaram%'
      )
    `) as any[];
    expect(thamanAlbums.length).toBeGreaterThanOrEqual(1);

    // Verify actor "Mahesh Babu" and foreign Latin entity "Jailer" are not catalog artists
    const mb = db.all(sql`SELECT id FROM artists WHERE slug = 'mahesh-babu'`)[0];
    const jailer = db.all(sql`SELECT id FROM artists WHERE slug = 'jailer'`)[0];
    expect(mb).toBeUndefined();
    expect(jailer).toBeUndefined();
  });

  it('email service tracks request IDs and generates un-hardcoded base URLs', async () => {
    const base = getBaseUrl();
    expect(base).toBeDefined();
    expect(typeof base).toBe('string');

    // Test sendPasswordResetEmail diagnostic execution
    const testEmail = 'diagnostic_test@example.com';
    const testToken = 'abc123testtoken456def789';
    const result = await sendPasswordResetEmail({
      toEmail: testEmail,
      resetToken: testToken,
      username: 'Test User',
    });

    expect(result.requestId).toBeDefined();
    expect(result.resetUrl).toContain(encodeURIComponent(testToken));
    expect(result.resetUrl).toContain(base);
    expect(['resend', 'smtp', 'unconfigured']).toContain(result.provider);
  });
});
