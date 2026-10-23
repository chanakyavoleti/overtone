import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviewVotes } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { eq, and, count } from 'drizzle-orm';

// POST /api/reviews/[id]/vote — toggle helpful vote
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const reviewId = parseInt(id, 10);
    if (isNaN(reviewId)) {
      return NextResponse.json({ error: 'Invalid review ID' }, { status: 400 });
    }

    // Check if already voted
    const existing = db
      .select()
      .from(reviewVotes)
      .where(
        and(
          eq(reviewVotes.userId, session.userId),
          eq(reviewVotes.reviewId, reviewId)
        )
      )
      .get();

    if (existing) {
      // Remove vote (toggle)
      db.delete(reviewVotes).where(eq(reviewVotes.id, existing.id)).run();
    } else {
      // Add vote
      const now = Math.floor(Date.now() / 1000);
      db.insert(reviewVotes)
        .values({
          userId: session.userId,
          reviewId,
          createdAt: now,
        })
        .run();
    }

    // Get new count
    const result = db
      .select({ total: count() })
      .from(reviewVotes)
      .where(eq(reviewVotes.reviewId, reviewId))
      .get();

    return NextResponse.json({
      success: true,
      helpfulCount: result?.total ?? 0,
      voted: !existing,
    });
  } catch (error) {
    console.error('Vote error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
