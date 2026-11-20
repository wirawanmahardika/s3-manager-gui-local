import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/app/lib/session';
import {
    getActiveConnectionConfig,
    getBucketSettings,
    updateBucketSettings,
} from '@/app/lib/s3';

const corsRuleSchema = z.object({
    AllowedHeaders: z.array(z.string()).optional(),
    AllowedMethods: z.array(z.string()).min(1),
    AllowedOrigins: z.array(z.string()).min(1),
    ExposeHeaders: z.array(z.string()).optional(),
    MaxAgeSeconds: z.number().int().nonnegative().optional(),
});

const updateSettingsSchema = z.object({
    acl: z.enum(['private', 'public-read']).optional(),
    versioning: z.enum(['Enabled', 'Suspended']).optional(),
    corsRules: z.array(corsRuleSchema).optional(),
    policy: z.string().nullable().optional(),
});

export async function GET(
    _request: NextRequest,
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

    const { bucketName } = await context.params;
    const decodedName = decodeURIComponent(bucketName);

    try {
        const settings = await getBucketSettings(config, decodedName);
        return NextResponse.json(settings);
    } catch (error) {
        const message =
            error instanceof Error ? error.message : 'Gagal memuat konfigurasi bucket';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

export async function PUT(
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

    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    const { bucketName } = await context.params;
    const decodedName = decodeURIComponent(bucketName);

    try {
        await updateBucketSettings(config, decodedName, parsed.data);
        const updated = await getBucketSettings(config, decodedName);
        return NextResponse.json(updated);
    } catch (error) {
        const message =
            error instanceof Error ? error.message : 'Gagal memperbarui konfigurasi bucket';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
