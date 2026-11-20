import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/lib/session';
import { deleteBucket, getActiveConnectionConfig } from '@/app/lib/s3';

export async function DELETE(
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
        await deleteBucket(config, decodedName);
        return NextResponse.json({ deleted: decodedName });
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : 'Gagal menghapus bucket (pastikan bucket sudah kosong)';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
