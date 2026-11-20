import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
    const rawSecret =
        process.env.ENCRYPTION_KEY ||
        process.env.SESSION_SECRET ||
        Bun.env.ENCRYPTION_KEY ||
        Bun.env.SESSION_SECRET;

    if (!rawSecret) {
        throw new Error('ENCRYPTION_KEY or SESSION_SECRET environment variable is required');
    }

    return createHash('sha256').update(rawSecret).digest();
}

export function encryptSecret(plaintext: string): string {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(payload: string): string {
    const parts = payload.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted secret format');
    }

    const [ivB64, authTagB64, encryptedB64] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const encrypted = Buffer.from(encryptedB64, 'base64');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
}
