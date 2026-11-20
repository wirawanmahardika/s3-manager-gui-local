import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';

const dbFile = process.env.DB_FILE_NAME || Bun.env.DB_FILE_NAME || 'storage/local.db';
mkdirSync(dirname(dbFile), { recursive: true });

const globalForDb = globalThis as unknown as {
    __sqlite?: Database;
    __dbInitialized?: boolean;
};

const sqlite = globalForDb.__sqlite ?? new Database(dbFile);
globalForDb.__sqlite = sqlite;

export function initDatabase() {
    if (globalForDb.__dbInitialized) return;
    sqlite.exec(`
        PRAGMA busy_timeout = 5000;
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            expired_at INTEGER
        );

        CREATE TABLE IF NOT EXISTS connections (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            endpoint TEXT NOT NULL,
            region TEXT NOT NULL DEFAULT 'us-east-1',
            access_key_id TEXT NOT NULL,
            secret_access_key TEXT NOT NULL,
            force_path_style INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS bookmarks (
            id TEXT PRIMARY KEY,
            connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
            bucket_name TEXT NOT NULL,
            prefix TEXT NOT NULL DEFAULT '',
            label TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS transfer_tasks (
            id TEXT PRIMARY KEY,
            connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
            type TEXT NOT NULL,
            bucket_name TEXT NOT NULL,
            object_key TEXT NOT NULL,
            local_path TEXT,
            size_bytes INTEGER NOT NULL DEFAULT 0,
            transferred_bytes INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'PENDING',
            error_message TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );
    `);
    globalForDb.__dbInitialized = true;
}

if (process.env.NEXT_PHASE !== 'phase-production-build') {
    initDatabase();
}

export const db = drizzle({ client: sqlite });
