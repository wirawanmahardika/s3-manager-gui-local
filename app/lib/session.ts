import { cookies } from 'next/headers';
import { db } from '@/src';
import { sessionsTable } from '@/src/db/schema';
import { SignJWT, jwtVerify } from 'jose';
import { SessionPayload } from './definitions';

const secretKey = process.env.SESSION_SECRET;
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
        return payload;
    } catch (error) {
        console.log('Failed to verify session');
    }
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
