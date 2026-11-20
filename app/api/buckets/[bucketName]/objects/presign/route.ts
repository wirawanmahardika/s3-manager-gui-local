import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/app/lib/session';
import { getActiveConnectionConfig, presignObject } from '@/app/lib/s3';

const presignSchema = z.object({
    key: z.string().min(1),
    expiresIn: z.number().int().min(60).max(604800).default(3600),
});

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ bucketName: string }> }
) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getActiveConnectionConfig();
    if (!config) {
        return NextResponse.json({ error: 'Belum ada koneksi S3 yang aktif' }, { status: 400 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = presignSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Parameter presign tidak valid' }, { status: 400 });
    }

    const { bucketName } = await context.params;
    const decodedBucket = decodeURIComponent(bucketName);

    try {
        const url = presignObject(
            config,
            decodedBucket,
            parsed.data.key,
            parsed.data.expiresIn
        );
        return NextResponse.json({ url, expiresIn: parsed.data.expiresIn });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal membuat presigned URL';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
