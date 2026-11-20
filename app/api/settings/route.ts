import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { inArray } from 'drizzle-orm';
import { db } from '@/src';
import { settingsTable } from '@/src/db/schema';
import { getSession } from '@/app/lib/session';

const SETTING_KEYS = ['default_region', 'default_presign_expires', 'max_list_keys'] as const;

const DEFAULTS: Record<(typeof SETTING_KEYS)[number], string> = {
    default_region: 'idn',
    default_presign_expires: '3600',
    max_list_keys: '200',
};

const updateSettingsSchema = z.object({
    default_region: z.string().trim().min(1).max(64).optional(),
    default_presign_expires: z.coerce.number().int().min(60).max(604800).optional(),
    max_list_keys: z.coerce.number().int().min(20).max(1000).optional(),
});

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await db
        .select()
        .from(settingsTable)
        .where(inArray(settingsTable.key, [...SETTING_KEYS]));

    const result: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) {
        result[row.key] = row.value;
    }

    return NextResponse.json({ settings: result });
}

export async function PUT(request: NextRequest) {
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

    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    const now = new Date();
    const entries: { key: string; value: string }[] = [];
    if (parsed.data.default_region !== undefined) {
        entries.push({ key: 'default_region', value: parsed.data.default_region });
    }
    if (parsed.data.default_presign_expires !== undefined) {
        entries.push({
            key: 'default_presign_expires',
            value: String(parsed.data.default_presign_expires),
        });
    }
    if (parsed.data.max_list_keys !== undefined) {
        entries.push({ key: 'max_list_keys', value: String(parsed.data.max_list_keys) });
    }

    for (const entry of entries) {
        await db
            .insert(settingsTable)
            .values({
                key: entry.key,
                value: entry.value,
                updatedAt: now,
            })
            .onConflictDoUpdate({
                target: settingsTable.key,
                set: { value: entry.value, updatedAt: now },
            });
    }

    return NextResponse.json({ ok: true });
}
