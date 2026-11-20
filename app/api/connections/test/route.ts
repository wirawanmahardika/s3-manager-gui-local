import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/app/lib/session';
import {
    getConnectionConfigById,
    S3ConnectionConfig,
    testS3Connection,
} from '@/app/lib/s3';

const testByIdSchema = z.object({
    connectionId: z.string().min(1),
});

const testRawSchema = z.object({
    connectionId: z.string().optional(),
    endpoint: z.string().trim().min(1, 'Endpoint wajib diisi'),
    region: z.string().trim().min(1, 'Region wajib diisi').default('us-east-1'),
    accessKeyId: z.string().trim().min(1, 'Access Key ID wajib diisi'),
    secretAccessKey: z.string().trim().optional(),
    forcePathStyle: z.boolean().default(true),
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

    let config: S3ConnectionConfig | null = null;

    if (
        typeof body === 'object' &&
        body !== null &&
        'connectionId' in body &&
        !('endpoint' in body)
    ) {
        const parsed = testByIdSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'connectionId tidak valid' }, { status: 400 });
        }
        config = await getConnectionConfigById(parsed.data.connectionId);
        if (!config) {
            return NextResponse.json({ error: 'Koneksi tidak ditemukan' }, { status: 404 });
        }
    } else {
        const parsed = testRawSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        let secret = parsed.data.secretAccessKey;
        if ((!secret || secret.length === 0) && parsed.data.connectionId) {
            const existing = await getConnectionConfigById(parsed.data.connectionId);
            if (!existing) {
                return NextResponse.json({ error: 'Koneksi tidak ditemukan' }, { status: 404 });
            }
            secret = existing.secretAccessKey;
        }

        if (!secret) {
            return NextResponse.json(
                { error: 'Secret Access Key wajib diisi untuk pengujian' },
                { status: 400 }
            );
        }

        config = {
            endpoint: parsed.data.endpoint,
            region: parsed.data.region,
            accessKeyId: parsed.data.accessKeyId,
            secretAccessKey: secret,
            forcePathStyle: parsed.data.forcePathStyle,
        };
    }

    try {
        const result = await testS3Connection(config);
        return NextResponse.json(result);
    } catch (error) {
        const message =
            error instanceof Error ? error.message : 'Gagal terhubung ke S3 endpoint';
        return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
}
