import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/src';
import { connectionsTable } from '@/src/db/schema';
import { getSession } from '@/app/lib/session';
import { encryptSecret } from '@/app/lib/crypto';
import {
    getActiveConnectionId,
    normalizeEndpoint,
    setActiveConnectionId,
} from '@/app/lib/s3';

const updateConnectionSchema = z.object({
    name: z.string().trim().min(1).max(100).optional(),
    endpoint: z.string().trim().min(1).max(300).optional(),
    region: z.string().trim().min(1).max(64).optional(),
    accessKeyId: z.string().trim().min(1).max(200).optional(),
    secretAccessKey: z.string().trim().max(300).optional(),
    forcePathStyle: z.boolean().optional(),
});

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const [existing] = await db
        .select()
        .from(connectionsTable)
        .where(eq(connectionsTable.id, id))
        .limit(1);

    if (!existing) {
        return NextResponse.json({ error: 'Koneksi tidak ditemukan' }, { status: 404 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = updateConnectionSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    const data = parsed.data;
    const updatePayload: Partial<typeof connectionsTable.$inferInsert> = {
        updatedAt: new Date(),
    };

    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.endpoint !== undefined) updatePayload.endpoint = normalizeEndpoint(data.endpoint);
    if (data.region !== undefined) updatePayload.region = data.region;
    if (data.accessKeyId !== undefined) updatePayload.accessKeyId = data.accessKeyId;
    if (data.forcePathStyle !== undefined) updatePayload.forcePathStyle = data.forcePathStyle;
    if (data.secretAccessKey && data.secretAccessKey.length > 0) {
        updatePayload.secretAccessKey = encryptSecret(data.secretAccessKey);
    }

    const [updated] = await db
        .update(connectionsTable)
        .set(updatePayload)
        .where(eq(connectionsTable.id, id))
        .returning({
            id: connectionsTable.id,
            name: connectionsTable.name,
            endpoint: connectionsTable.endpoint,
            region: connectionsTable.region,
            accessKeyId: connectionsTable.accessKeyId,
            forcePathStyle: connectionsTable.forcePathStyle,
            createdAt: connectionsTable.createdAt,
            updatedAt: connectionsTable.updatedAt,
        });

    return NextResponse.json({ connection: updated });
}

export async function DELETE(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const [deleted] = await db
        .delete(connectionsTable)
        .where(eq(connectionsTable.id, id))
        .returning({ id: connectionsTable.id });

    if (!deleted) {
        return NextResponse.json({ error: 'Koneksi tidak ditemukan' }, { status: 404 });
    }

    const activeId = await getActiveConnectionId();
    let nextActiveId = activeId;

    if (activeId === id) {
        const [fallback] = await db
            .select({ id: connectionsTable.id })
            .from(connectionsTable)
            .orderBy(asc(connectionsTable.createdAt))
            .limit(1);

        nextActiveId = fallback?.id ?? null;
        await setActiveConnectionId(nextActiveId);
    }

    return NextResponse.json({
        deletedId: deleted.id,
        activeConnectionId: nextActiveId,
    });
}
