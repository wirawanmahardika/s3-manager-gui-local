import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/src';
import { bookmarksTable } from '@/src/db/schema';
import { getSession } from '@/app/lib/session';
import { getActiveConnectionId } from '@/app/lib/s3';

const createBookmarkSchema = z.object({
    bucketName: z.string().min(1),
    prefix: z.string().default(''),
    label: z.string().trim().min(1).max(120),
});

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activeId = await getActiveConnectionId();
    const bookmarks = activeId
        ? await db
              .select()
              .from(bookmarksTable)
              .where(eq(bookmarksTable.connectionId, activeId))
              .orderBy(desc(bookmarksTable.createdAt))
        : [];

    return NextResponse.json({ bookmarks });
}

export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activeId = await getActiveConnectionId();
    if (!activeId) {
        return NextResponse.json({ error: 'Belum ada koneksi S3 yang aktif' }, { status: 400 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = createBookmarkSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Data bookmark tidak valid' }, { status: 400 });
    }

    const [created] = await db
        .insert(bookmarksTable)
        .values({
            connectionId: activeId,
            bucketName: parsed.data.bucketName,
            prefix: parsed.data.prefix,
            label: parsed.data.label,
            createdAt: new Date(),
        })
        .returning();

    return NextResponse.json({ bookmark: created }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
        return NextResponse.json({ error: 'Parameter id wajib diisi' }, { status: 400 });
    }

    await db.delete(bookmarksTable).where(eq(bookmarksTable.id, id));
    return NextResponse.json({ deletedId: id });
}
