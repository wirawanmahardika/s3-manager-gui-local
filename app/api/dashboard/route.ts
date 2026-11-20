import { NextResponse } from 'next/server';
import { count, desc, eq } from 'drizzle-orm';
import { db } from '@/src';
import { bookmarksTable, connectionsTable, transferTasksTable } from '@/src/db/schema';
import { getSession } from '@/app/lib/session';
import { getActiveConnectionId } from '@/app/lib/s3';

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [{ totalConnections }] = await db
        .select({ totalConnections: count() })
        .from(connectionsTable);

    const activeId = await getActiveConnectionId();
    let activeConnection: {
        id: string;
        name: string;
        endpoint: string;
        region: string;
    } | null = null;

    if (activeId) {
        const [conn] = await db
            .select({
                id: connectionsTable.id,
                name: connectionsTable.name,
                endpoint: connectionsTable.endpoint,
                region: connectionsTable.region,
            })
            .from(connectionsTable)
            .where(eq(connectionsTable.id, activeId))
            .limit(1);
        activeConnection = conn ?? null;
    }

    const bookmarks = activeId
        ? await db
              .select()
              .from(bookmarksTable)
              .where(eq(bookmarksTable.connectionId, activeId))
              .orderBy(desc(bookmarksTable.createdAt))
              .limit(10)
        : [];

    const recentTransfers = activeId
        ? await db
              .select()
              .from(transferTasksTable)
              .where(eq(transferTasksTable.connectionId, activeId))
              .orderBy(desc(transferTasksTable.createdAt))
              .limit(12)
        : [];

    return NextResponse.json({
        totalConnections,
        activeConnection,
        bookmarks,
        recentTransfers,
    });
}
