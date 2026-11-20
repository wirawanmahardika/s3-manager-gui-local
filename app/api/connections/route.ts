import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { asc } from 'drizzle-orm';
import { db } from '@/src';
import { connectionsTable } from '@/src/db/schema';
import { getSession } from '@/app/lib/session';
import { encryptSecret } from '@/app/lib/crypto';
import {
    getActiveConnectionId,
    normalizeEndpoint,
    setActiveConnectionId,
} from '@/app/lib/s3';

const createConnectionSchema = z.object({
    name: z.string().trim().min(1, 'Nama koneksi wajib diisi').max(100),
    endpoint: z.string().trim().min(1, 'Endpoint wajib diisi').max(300),
    region: z.string().trim().min(1, 'Region wajib diisi').max(64).default('us-east-1'),
    accessKeyId: z.string().trim().min(1, 'Access Key ID wajib diisi').max(200),
    secretAccessKey: z.string().trim().min(1, 'Secret Access Key wajib diisi').max(300),
    forcePathStyle: z.boolean().default(true),
    setActive: z.boolean().optional(),
});

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await db
        .select({
            id: connectionsTable.id,
            name: connectionsTable.name,
            endpoint: connectionsTable.endpoint,
            region: connectionsTable.region,
            accessKeyId: connectionsTable.accessKeyId,
            forcePathStyle: connectionsTable.forcePathStyle,
            createdAt: connectionsTable.createdAt,
            updatedAt: connectionsTable.updatedAt,
        })
        .from(connectionsTable)
        .orderBy(asc(connectionsTable.createdAt));

    const activeConnectionId = await getActiveConnectionId();

    return NextResponse.json({
        connections: rows,
        activeConnectionId,
    });
}

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

    const parsed = createConnectionSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    const { name, endpoint, region, accessKeyId, secretAccessKey, forcePathStyle, setActive } =
        parsed.data;

    const now = new Date();
    const existingActive = await getActiveConnectionId();

    const [created] = await db
        .insert(connectionsTable)
        .values({
            name,
            endpoint: normalizeEndpoint(endpoint),
            region,
            accessKeyId,
            secretAccessKey: encryptSecret(secretAccessKey),
            forcePathStyle,
            createdAt: now,
            updatedAt: now,
        })
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

    if (setActive || !existingActive) {
        await setActiveConnectionId(created.id);
    }

    return NextResponse.json(
        {
            connection: created,
            activeConnectionId: setActive || !existingActive ? created.id : existingActive,
        },
        { status: 201 }
    );
}
