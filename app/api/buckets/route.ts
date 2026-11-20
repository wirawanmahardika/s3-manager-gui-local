import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/app/lib/session';
import {
    createBucket,
    getActiveConnectionConfig,
    getConnectionConfigById,
    listBuckets,
} from '@/app/lib/s3';

const createBucketSchema = z.object({
    name: z
        .string()
        .trim()
        .min(3, 'Nama bucket minimal 3 karakter')
        .max(63, 'Nama bucket maksimal 63 karakter')
        .regex(
            /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/,
            'Nama bucket hanya boleh huruf kecil, angka, titik, dan tanda hubung'
        ),
    acl: z.enum(['private', 'public-read']).optional(),
});

export async function GET(request: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connectionId = request.nextUrl.searchParams.get('connectionId');
    const config = connectionId
        ? await getConnectionConfigById(connectionId)
        : await getActiveConnectionConfig();

    if (!config) {
        return NextResponse.json({
            buckets: [],
            connection: null,
        });
    }

    try {
        const buckets = await listBuckets(config);
        return NextResponse.json({
            buckets,
            connection: {
                id: config.id,
                name: config.name,
                endpoint: config.endpoint,
                region: config.region,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal memuat daftar bucket';
        return NextResponse.json(
            {
                error: message,
                connection: {
                    id: config.id,
                    name: config.name,
                    endpoint: config.endpoint,
                    region: config.region,
                },
            },
            { status: 502 }
        );
    }
}

export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getActiveConnectionConfig();
    if (!config) {
        return NextResponse.json(
            { error: 'Belum ada koneksi S3 yang aktif' },
            { status: 400 }
        );
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = createBucketSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    try {
        await createBucket(config, parsed.data.name, parsed.data.acl);
        return NextResponse.json({ name: parsed.data.name }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal membuat bucket';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
