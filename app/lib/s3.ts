import { S3Client as BunS3Client } from 'bun';
import {
    S3Client as AwsS3Client,
    CORSRule,
    CreateBucketCommand,
    DeleteBucketCommand,
    DeleteBucketCorsCommand,
    DeleteBucketPolicyCommand,
    GetBucketAclCommand,
    GetBucketCorsCommand,
    GetBucketPolicyCommand,
    GetBucketVersioningCommand,
    ListBucketsCommand,
    PutBucketAclCommand,
    PutBucketCorsCommand,
    PutBucketPolicyCommand,
    PutBucketVersioningCommand,
} from '@aws-sdk/client-s3';
import { db } from '@/src';
import { connectionsTable, settingsTable } from '@/src/db/schema';
import { asc, eq } from 'drizzle-orm';
import { decryptSecret } from './crypto';

export const ACTIVE_CONNECTION_SETTING_KEY = 'active_connection_id';

export interface S3ConnectionConfig {
    id?: string;
    name?: string;
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle: boolean;
}

export function normalizeEndpoint(endpoint: string): string {
    const trimmed = endpoint.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(trimmed)) {
        return `https://${trimmed}`;
    }
    return trimmed;
}

/**
 * Primary Bun native S3Client for object operations (list, read, write, delete, stat, presign).
 */
export function createBunS3Client(config: S3ConnectionConfig, bucket?: string): BunS3Client {
    return new BunS3Client({
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        region: config.region || 'us-east-1',
        endpoint: normalizeEndpoint(config.endpoint),
        bucket,
        virtualHostedStyle: !config.forcePathStyle,
    });
}

/**
 * AWS SDK S3Client (running on Bun runtime) for bucket-level & configuration APIs
 * such as ListBuckets, CreateBucket, DeleteBucket, CORS, Policy, and Versioning.
 */
export function createAwsS3Client(config: S3ConnectionConfig): AwsS3Client {
    return new AwsS3Client({
        endpoint: normalizeEndpoint(config.endpoint),
        region: config.region || 'us-east-1',
        forcePathStyle: config.forcePathStyle,
        credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
        },
    });
}

export async function testS3Connection(config: S3ConnectionConfig) {
    const normalized: S3ConnectionConfig = {
        ...config,
        endpoint: normalizeEndpoint(config.endpoint),
        region: config.region.trim() || 'us-east-1',
    };

    const awsClient = createAwsS3Client(normalized);
    const listBucketsResult = await awsClient.send(new ListBucketsCommand({}));
    const buckets = (listBucketsResult.Buckets ?? [])
        .map((b) => b.Name)
        .filter((name): name is string => Boolean(name));

    // Verify Bun's native S3Client against the first bucket if one exists
    if (buckets.length > 0) {
        const bunClient = createBunS3Client(normalized, buckets[0]);
        await bunClient.list({ maxKeys: 1 });
    }

    return {
        ok: true as const,
        bucketsCount: buckets.length,
        sampleBuckets: buckets.slice(0, 5),
    };
}

export async function getConnectionConfigById(
    connectionId: string
): Promise<S3ConnectionConfig | null> {
    const [row] = await db
        .select()
        .from(connectionsTable)
        .where(eq(connectionsTable.id, connectionId))
        .limit(1);

    if (!row) return null;

    return {
        id: row.id,
        name: row.name,
        endpoint: row.endpoint,
        region: row.region,
        accessKeyId: row.accessKeyId,
        secretAccessKey: decryptSecret(row.secretAccessKey),
        forcePathStyle: row.forcePathStyle,
    };
}

export async function getActiveConnectionId(): Promise<string | null> {
    const [setting] = await db
        .select()
        .from(settingsTable)
        .where(eq(settingsTable.key, ACTIVE_CONNECTION_SETTING_KEY))
        .limit(1);

    if (setting?.value) {
        return setting.value;
    }

    const [first] = await db
        .select({ id: connectionsTable.id })
        .from(connectionsTable)
        .orderBy(asc(connectionsTable.createdAt))
        .limit(1);

    return first?.id ?? null;
}

export async function setActiveConnectionId(connectionId: string | null): Promise<void> {
    if (!connectionId) {
        await db.delete(settingsTable).where(eq(settingsTable.key, ACTIVE_CONNECTION_SETTING_KEY));
        return;
    }

    const now = new Date();
    await db
        .insert(settingsTable)
        .values({
            key: ACTIVE_CONNECTION_SETTING_KEY,
            value: connectionId,
            updatedAt: now,
        })
        .onConflictDoUpdate({
            target: settingsTable.key,
            set: { value: connectionId, updatedAt: now },
        });
}

export async function getActiveConnectionConfig(): Promise<S3ConnectionConfig | null> {
    const activeId = await getActiveConnectionId();
    if (!activeId) return null;
    return getConnectionConfigById(activeId);
}

export interface BucketSummary {
    name: string;
    creationDate: string | null;
}

export async function listBuckets(config: S3ConnectionConfig): Promise<BucketSummary[]> {
    const client = createAwsS3Client(config);
    const result = await client.send(new ListBucketsCommand({}));
    return (result.Buckets ?? [])
        .filter((b): b is { Name: string; CreationDate?: Date } => Boolean(b.Name))
        .map((b) => ({
            name: b.Name,
            creationDate: b.CreationDate ? b.CreationDate.toISOString() : null,
        }));
}

export async function createBucket(
    config: S3ConnectionConfig,
    bucketName: string,
    acl?: 'private' | 'public-read'
): Promise<void> {
    const client = createAwsS3Client(config);
    await client.send(
        new CreateBucketCommand({
            Bucket: bucketName,
            ACL: acl,
        })
    );
}

export async function deleteBucket(config: S3ConnectionConfig, bucketName: string): Promise<void> {
    const client = createAwsS3Client(config);
    await client.send(
        new DeleteBucketCommand({
            Bucket: bucketName,
        })
    );
}

export interface BucketSettingsData {
    isPublic: boolean;
    versioning: 'Enabled' | 'Suspended' | 'Disabled';
    corsRules: CORSRule[];
    policy: string | null;
}

const ALL_USERS_URI = 'http://acs.amazonaws.com/groups/global/AllUsers';

export async function getBucketSettings(
    config: S3ConnectionConfig,
    bucketName: string
): Promise<BucketSettingsData> {
    const client = createAwsS3Client(config);

    const [aclRes, verRes, corsRes, policyRes] = await Promise.allSettled([
        client.send(new GetBucketAclCommand({ Bucket: bucketName })),
        client.send(new GetBucketVersioningCommand({ Bucket: bucketName })),
        client.send(new GetBucketCorsCommand({ Bucket: bucketName })),
        client.send(new GetBucketPolicyCommand({ Bucket: bucketName })),
    ]);

    let isPublic = false;
    if (aclRes.status === 'fulfilled') {
        isPublic = (aclRes.value.Grants ?? []).some(
            (g) =>
                g.Grantee?.URI === ALL_USERS_URI &&
                (g.Permission === 'READ' || g.Permission === 'FULL_CONTROL')
        );
    }

    let versioning: 'Enabled' | 'Suspended' | 'Disabled' = 'Disabled';
    if (verRes.status === 'fulfilled') {
        if (verRes.value.Status === 'Enabled') versioning = 'Enabled';
        else if (verRes.value.Status === 'Suspended') versioning = 'Suspended';
    }

    let corsRules: CORSRule[] = [];
    if (corsRes.status === 'fulfilled') {
        corsRules = corsRes.value.CORSRules ?? [];
    }

    let policy: string | null = null;
    if (policyRes.status === 'fulfilled' && policyRes.value.Policy) {
        try {
            policy = JSON.stringify(JSON.parse(policyRes.value.Policy), null, 2);
        } catch {
            policy = policyRes.value.Policy;
        }
    }

    return { isPublic, versioning, corsRules, policy };
}

export async function updateBucketSettings(
    config: S3ConnectionConfig,
    bucketName: string,
    updates: {
        acl?: 'private' | 'public-read';
        versioning?: 'Enabled' | 'Suspended';
        corsRules?: CORSRule[];
        policy?: string | null;
    }
): Promise<void> {
    const client = createAwsS3Client(config);

    if (updates.acl) {
        await client.send(
            new PutBucketAclCommand({
                Bucket: bucketName,
                ACL: updates.acl,
            })
        );
    }

    if (updates.versioning) {
        await client.send(
            new PutBucketVersioningCommand({
                Bucket: bucketName,
                VersioningConfiguration: { Status: updates.versioning },
            })
        );
    }

    if (updates.corsRules !== undefined) {
        if (updates.corsRules.length === 0) {
            await client.send(new DeleteBucketCorsCommand({ Bucket: bucketName }));
        } else {
            await client.send(
                new PutBucketCorsCommand({
                    Bucket: bucketName,
                    CORSConfiguration: { CORSRules: updates.corsRules },
                })
            );
        }
    }

    if (updates.policy !== undefined) {
        if (!updates.policy || updates.policy.trim() === '') {
            await client.send(new DeleteBucketPolicyCommand({ Bucket: bucketName }));
        } else {
            await client.send(
                new PutBucketPolicyCommand({
                    Bucket: bucketName,
                    Policy: updates.policy,
                })
            );
        }
    }
}
