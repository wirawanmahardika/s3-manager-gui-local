import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const sessionsTable = sqliteTable('sessions', {
    id: text('id')
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    expiresAt: int('expired_at').default(Date.now() + 7 * 24 * 60 * 60 * 1000),
});

export const connectionsTable = sqliteTable('connections', {
    id: text('id')
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    endpoint: text('endpoint').notNull(),
    region: text('region').notNull().default('us-east-1'),
    accessKeyId: text('access_key_id').notNull(),
    secretAccessKey: text('secret_access_key').notNull(),
    forcePathStyle: int('force_path_style', { mode: 'boolean' }).notNull().default(true),
    createdAt: int('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: int('updated_at', { mode: 'timestamp' }).notNull(),
});

export const bookmarksTable = sqliteTable('bookmarks', {
    id: text('id')
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    connectionId: text('connection_id')
        .notNull()
        .references(() => connectionsTable.id, { onDelete: 'cascade' }),
    bucketName: text('bucket_name').notNull(),
    prefix: text('prefix').notNull().default(''),
    label: text('label').notNull(),
    createdAt: int('created_at', { mode: 'timestamp' }).notNull(),
});

export const transferTasksTable = sqliteTable('transfer_tasks', {
    id: text('id')
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    connectionId: text('connection_id')
        .notNull()
        .references(() => connectionsTable.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['UPLOAD', 'DOWNLOAD', 'COPY', 'DELETE'] }).notNull(),
    bucketName: text('bucket_name').notNull(),
    objectKey: text('object_key').notNull(),
    localPath: text('local_path'),
    sizeBytes: int('size_bytes').notNull().default(0),
    transferredBytes: int('transferred_bytes').notNull().default(0),
    status: text('status', { enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'] })
        .notNull()
        .default('PENDING'),
    errorMessage: text('error_message'),
    createdAt: int('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: int('updated_at', { mode: 'timestamp' }).notNull(),
});

export const settingsTable = sqliteTable('settings', {
    key: text('key').primaryKey(),
    value: text('value').notNull(),
    updatedAt: int('updated_at', { mode: 'timestamp' }).notNull(),
});
