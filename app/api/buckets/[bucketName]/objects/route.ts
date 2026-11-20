import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/src';
import { transferTasksTable } from '@/src/db/schema';
import { getSession } from '@/app/lib/session';
import {
    copyObjectInBucket,
    deleteObjects,
    getActiveConnectionConfig,
    listObjects,
    uploadObject,
} from '@/app/lib/s3';

const actionSchema = z.discriminatedUnion('action', [
    z.object({
        action: z.literal('create-folder'),
        prefix: z.string().trim().min(1),
    }),
    z.object({
        action: z.literal('copy'),
        sourceKey: z.string().min(1),
        destinationKey: z.string().min(1),
    }),
    z.object({
        action: z.literal('rename'),
        sourceKey: z.string().min(1),
        destinationKey: z.string().min(1),
    }),
]);

const deleteSchema = z.object({
    keys: z.array(z.string().min(1)).min(1),
});

export async function GET(
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

    const { bucketName } = await context.params;
    const decodedBucket = decodeURIComponent(bucketName);
    const prefix = request.nextUrl.searchParams.get('prefix') ?? '';
    const continuationToken = request.nextUrl.searchParams.get('continuationToken') ?? undefined;
    const maxKeysParam = Number(request.nextUrl.searchParams.get('maxKeys') ?? '200');
    const maxKeys = Number.isFinite(maxKeysParam) && maxKeysParam > 0 ? Math.min(maxKeysParam, 1000) : 200;

    try {
        const result = await listObjects(config, decodedBucket, {
            prefix,
            continuationToken,
            maxKeys,
        });
        return NextResponse.json(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal memuat daftar file';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ bucketName: string }> }
) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getActiveConnectionConfig();
    if (!config || !config.id) {
        return NextResponse.json({ error: 'Belum ada koneksi S3 yang aktif' }, { status: 400 });
    }

    const { bucketName } = await context.params;
    const decodedBucket = decodeURIComponent(bucketName);
    const contentTypeHeader = request.headers.get('content-type') ?? '';

    if (contentTypeHeader.includes('multipart/form-data')) {
        try {
            const formData = await request.formData();
            const prefix = String(formData.get('prefix') ?? '');
            const files = formData.getAll('files').filter((f): f is File => f instanceof File);

            if (files.length === 0) {
                return NextResponse.json({ error: 'Tidak ada file yang dipilih' }, { status: 400 });
            }

            const uploaded: string[] = [];
            for (const file of files) {
                const key = `${prefix}${file.name}`;
                const buffer = await file.arrayBuffer();
                const now = new Date();

                await uploadObject(
                    config,
                    decodedBucket,
                    key,
                    buffer,
                    file.type || 'application/octet-stream'
                );

                await db.insert(transferTasksTable).values({
                    connectionId: config.id,
                    type: 'UPLOAD',
                    bucketName: decodedBucket,
                    objectKey: key,
                    sizeBytes: file.size,
                    transferredBytes: file.size,
                    status: 'COMPLETED',
                    createdAt: now,
                    updatedAt: now,
                });

                uploaded.push(key);
            }

            return NextResponse.json({ uploaded }, { status: 201 });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Gagal mengunggah file';
            return NextResponse.json({ error: message }, { status: 400 });
        }
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    try {
        const data = parsed.data;
        if (data.action === 'create-folder') {
            const folderKey = data.prefix.endsWith('/') ? data.prefix : `${data.prefix}/`;
            await uploadObject(config, decodedBucket, folderKey, '', 'application/x-directory');
            return NextResponse.json({ created: folderKey }, { status: 201 });
        }

        if (data.action === 'copy' || data.action === 'rename') {
            await copyObjectInBucket(config, decodedBucket, data.sourceKey, data.destinationKey);
            if (data.action === 'rename' && data.sourceKey !== data.destinationKey) {
                await deleteObjects(config, decodedBucket, [data.sourceKey]);
            }
            const now = new Date();
            await db.insert(transferTasksTable).values({
                connectionId: config.id,
                type: 'COPY',
                bucketName: decodedBucket,
                objectKey: data.destinationKey,
                sizeBytes: 0,
                transferredBytes: 0,
                status: 'COMPLETED',
                createdAt: now,
                updatedAt: now,
            });
            return NextResponse.json({ key: data.destinationKey });
        }

        return NextResponse.json({ error: 'Aksi tidak dikenal' }, { status: 400 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Operasi gagal';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ bucketName: string }> }
) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getActiveConnectionConfig();
    if (!config || !config.id) {
        return NextResponse.json({ error: 'Belum ada koneksi S3 yang aktif' }, { status: 400 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Daftar key wajib diisi' }, { status: 400 });
    }

    const { bucketName } = await context.params;
    const decodedBucket = decodeURIComponent(bucketName);

    try {
        await deleteObjects(config, decodedBucket, parsed.data.keys);
        const now = new Date();
        await db.insert(transferTasksTable).values(
            parsed.data.keys.map((key) => ({
                connectionId: config.id!,
                type: 'DELETE' as const,
                bucketName: decodedBucket,
                objectKey: key,
                sizeBytes: 0,
                transferredBytes: 0,
                status: 'COMPLETED' as const,
                createdAt: now,
                updatedAt: now,
            }))
        );
        return NextResponse.json({ deleted: parsed.data.keys });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal menghapus objek';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
