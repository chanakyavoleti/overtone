import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { ratings } from '@/lib/db/schema';
import { eq, and, sql, avg, count } from 'drizzle-orm';

// POST /api/ratings — create or update a rating
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { targetType, targetId, score } = body;

    // Validate targetType
    if (!['album', 'track', 'artist'].includes(targetType)) {
      return NextResponse.json({ error: 'Invalid target type' }, { status: 400 });
    }

    // Validate targetId
    if (!targetId || typeof targetId !== 'number' || targetId < 1) {
      return NextResponse.json({ error: 'Invalid target ID' }, { status: 400 });
    }

    // Validate score: 0-100 in steps of 5
    if (typeof score !== 'number' || score < 0 || score > 100 || score % 5 !== 0) {
      return NextResponse.json(
        { error: 'Score must be 0-100 in increments of 5' },
        { status: 400 }
      );
    }

    const now = Math.floor(Date.now() / 1000);

    // Check if rating already exists
    const existing = db
      .select()
      .from(ratings)
      .where(
        and(
          eq(ratings.userId, session.userId),
          eq(ratings.targetType, targetType),
          eq(ratings.targetId, targetId)
        )
      )
      .get();

    if (existing) {
      // Update existing rating
      db.update(ratings)
        .set({ score, updatedAt: now })
        .where(eq(ratings.id, existing.id))
        .run();
    } else {
      // Insert new rating
      db.insert(ratings)
        .values({
          userId: session.userId,
          targetType,
          targetId,
          score,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }

    // Calculate new aggregate
    const agg = db
      .select({
        avgScore: avg(ratings.score),
        totalCount: count(),
      })
      .from(ratings)
      .where(
        and(eq(ratings.targetType, targetType), eq(ratings.targetId, targetId))
      )
      .get();

    return NextResponse.json({
      success: true,
      aggregate: {
        avgScore: agg?.avgScore ? Math.round(Number(agg.avgScore)) : null,
        count: agg?.totalCount ?? 0,
      },
    });
  } catch (error) {
    console.error('Rating error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/ratings — remove a rating
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { targetType, targetId } = body;

    if (!['album', 'track', 'artist'].includes(targetType)) {
      return NextResponse.json({ error: 'Invalid target type' }, { status: 400 });
    }

    db.delete(ratings)
      .where(
        and(
          eq(ratings.userId, session.userId),
          eq(ratings.targetType, targetType),
          eq(ratings.targetId, targetId)
        )
      )
      .run();

    // Calculate new aggregate
    const agg = db
      .select({
        avgScore: avg(ratings.score),
        totalCount: count(),
      })
      .from(ratings)
      .where(
        and(eq(ratings.targetType, targetType), eq(ratings.targetId, targetId))
      )
      .get();

    return NextResponse.json({
      success: true,
      aggregate: {
        avgScore: agg?.avgScore ? Math.round(Number(agg.avgScore)) : null,
        count: agg?.totalCount ?? 0,
      },
    });
  } catch (error) {
    console.error('Rating delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/ratings?targetType=album&targetId=1 — get aggregate + user rating
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetType = searchParams.get('targetType');
    const targetId = searchParams.get('targetId');

    if (!targetType || !targetId || !['album', 'track', 'artist'].includes(targetType)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const tid = parseInt(targetId, 10);
    if (isNaN(tid)) {
      return NextResponse.json({ error: 'Invalid target ID' }, { status: 400 });
    }

    // Aggregate
    const agg = db
      .select({
        avgScore: avg(ratings.score),
        totalCount: count(),
      })
      .from(ratings)
      .where(
        and(eq(ratings.targetType, targetType as 'album' | 'track' | 'artist'), eq(ratings.targetId, tid))
      )
      .get();

    // User rating if logged in
    let userRating = null;
    try {
      const session = await getSession();
      if (session.isLoggedIn && session.userId) {
        const ur = db
          .select()
          .from(ratings)
          .where(
            and(
              eq(ratings.userId, session.userId),
              eq(ratings.targetType, targetType as 'album' | 'track' | 'artist'),
              eq(ratings.targetId, tid)
            )
          )
          .get();
        if (ur) {
          userRating = ur.score;
        }
      }
    } catch {
      // Not logged in
    }

    return NextResponse.json({
      aggregate: {
        avgScore: agg?.avgScore ? Math.round(Number(agg.avgScore)) : null,
        count: agg?.totalCount ?? 0,
      },
      userRating,
    });
  } catch (error) {
    console.error('Rating fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
