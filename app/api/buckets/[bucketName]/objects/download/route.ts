import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/lib/session';
import { getActiveConnectionConfig, getObjectDownload } from '@/app/lib/s3';

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

    const key = request.nextUrl.searchParams.get('key');
    if (!key) {
        return NextResponse.json({ error: 'Parameter key wajib diisi' }, { status: 400 });
    }

    const inline = request.nextUrl.searchParams.get('inline') === '1';
    const { bucketName } = await context.params;
    const decodedBucket = decodeURIComponent(bucketName);

    try {
        const { stream, size, contentType, etag } = await getObjectDownload(
            config,
            decodedBucket,
            key
        );

        const fileName = key.split('/').pop() || 'download';
        const disposition = inline
            ? `inline; filename="${encodeURIComponent(fileName)}"`
            : `attachment; filename="${encodeURIComponent(fileName)}"`;

        const headers = new Headers();
        headers.set('Content-Type', contentType);
        headers.set('Content-Disposition', disposition);
        if (typeof size === 'number' && size >= 0) {
            headers.set('Content-Length', String(size));
        }
        if (etag) {
            headers.set('ETag', etag);
        }

        return new Response(stream, { status: 200, headers });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal mengunduh objek';
        return NextResponse.json({ error: message }, { status: 404 });
    }
}
