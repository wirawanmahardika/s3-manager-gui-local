import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '@/src';
import { sessionsTable } from '@/src/db/schema';
import { getSession } from '@/app/lib/session';

export async function POST() {
    const session = await getSession();
    if (session?.id) {
        await db.delete(sessionsTable).where(eq(sessionsTable.id, session.id));
    }

    const cookieStore = await cookies();
    cookieStore.delete('s3manager_session');

    return NextResponse.json({ ok: true });
}
