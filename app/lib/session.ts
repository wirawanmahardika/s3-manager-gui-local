import { cookies } from 'next/headers';
import { db } from '@/src';
import { sessionsTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { SignJWT, jwtVerify } from 'jose';
import { SessionPayload } from './definitions';

const secretKey = process.env.SESSION_SECRET || Bun.env.SESSION_SECRET;
const encodedKey = new TextEncoder().encode(secretKey);

export async function encrypt(payload: SessionPayload) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(encodedKey);
}

export async function decrypt(session: string | undefined = '') {
    try {
        const { payload } = await jwtVerify(session, encodedKey, { algorithms: ['HS256'] });
        return payload as unknown as SessionPayload;
    } catch {
        return null;
    }
}

export async function getSession(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('s3manager_session')?.value;
    if (!token) return null;

    const payload = await decrypt(token);
    if (!payload?.id) return null;
    if (payload.expiresAt && Date.now() > payload.expiresAt) return null;

    const [sessionRow] = await db
        .select({ id: sessionsTable.id, expiresAt: sessionsTable.expiresAt })
        .from(sessionsTable)
        .where(eq(sessionsTable.id, payload.id))
        .limit(1);

    if (!sessionRow) return null;
    if (sessionRow.expiresAt && Date.now() > sessionRow.expiresAt) return null;

    return payload;
}

export async function createSession() {
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 1. Create a session in the database
    const [data] = await db.insert(sessionsTable).values({}).returning({ id: sessionsTable.id });
    const session = await encrypt({ id: data.id, expiresAt: expiresAt });

    // Store the session in cookies for optimistic auth checks
    const cookieStore = await cookies();
    cookieStore.set('s3manager_session', session, {
        httpOnly: true,
        secure: false,
        expires: expiresAt,
        sameSite: 'lax',
        path: '/',
    });
}
