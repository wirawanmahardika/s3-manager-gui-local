import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/src';
import { connectionsTable } from '@/src/db/schema';
import { getSession } from '@/app/lib/session';
import { setActiveConnectionId } from '@/app/lib/s3';

const setActiveSchema = z.object({
    connectionId: z.string().min(1),
});

export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = setActiveSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'connectionId wajib diisi' }, { status: 400 });
    }

    const [exists] = await db
        .select({ id: connectionsTable.id })
        .from(connectionsTable)
        .where(eq(connectionsTable.id, parsed.data.connectionId))
        .limit(1);

    if (!exists) {
        return NextResponse.json({ error: 'Koneksi tidak ditemukan' }, { status: 404 });
    }

    await setActiveConnectionId(exists.id);
    return NextResponse.json({ activeConnectionId: exists.id });
}
