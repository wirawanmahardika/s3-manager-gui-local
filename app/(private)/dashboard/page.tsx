'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Activity,
    Bookmark,
    Database,
    FolderOpen,
    Loader2,
    Plug,
    Server,
    Trash2,
} from 'lucide-react';

interface DashboardData {
    totalConnections: number;
    activeConnection: {
        id: string;
        name: string;
        endpoint: string;
        region: string;
    } | null;
    bookmarks: {
        id: string;
        bucketName: string;
        prefix: string;
        label: string;
    }[];
    recentTransfers: {
        id: string;
        type: string;
        bucketName: string;
        objectKey: string;
        sizeBytes: number;
        status: string;
        createdAt: string;
    }[];
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/dashboard');
            if (res.ok) {
                setData(await res.json());
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const removeBookmark = async (id: string) => {
        await fetch(`/api/bookmarks?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
        await loadDashboard();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-sm text-base-content/70">
                    Ringkasan koneksi S3 aktif, bookmark folder, dan aktivitas transfer terbaru.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card bg-base-100 border border-base-200 shadow-sm">
                    <div className="card-body p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-base-content/60">Active Connection</span>
                            <Server className="w-4 h-4 text-primary" />
                        </div>
                        {data?.activeConnection ? (
                            <>
                                <div className="text-lg font-bold truncate">
                                    {data.activeConnection.name}
                                </div>
                                <div className="text-xs font-mono text-base-content/60 truncate">
                                    {data.activeConnection.endpoint}
                                </div>
                            </>
                        ) : (
                            <Link href="/connections" className="link link-primary text-sm mt-1">
                                Tambah koneksi S3 →
                            </Link>
                        )}
                    </div>
                </div>

                <div className="card bg-base-100 border border-base-200 shadow-sm">
                    <div className="card-body p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-base-content/60">Total Connections</span>
                            <Plug className="w-4 h-4 text-secondary" />
                        </div>
                        <div className="text-2xl font-bold">{data?.totalConnections ?? 0}</div>
                        <Link href="/connections" className="text-xs link link-primary">
                            Kelola koneksi
                        </Link>
                    </div>
                </div>

                <div className="card bg-base-100 border border-base-200 shadow-sm">
                    <div className="card-body p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-base-content/60">Bookmarks</span>
                            <Bookmark className="w-4 h-4 text-accent" />
                        </div>
                        <div className="text-2xl font-bold">{data?.bookmarks.length ?? 0}</div>
                        <Link href="/buckets" className="text-xs link link-primary">
                            Buka Buckets
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bookmarks */}
                <div className="card bg-base-100 border border-base-200 shadow-sm">
                    <div className="card-body p-5 space-y-3">
                        <div className="flex items-center gap-2 font-semibold text-sm">
                            <Bookmark className="w-4 h-4 text-primary" />
                            Bookmarked Folders
                        </div>
                        {!data?.bookmarks.length ? (
                            <p className="text-xs text-base-content/60 py-4">
                                Belum ada bookmark. Buka salah satu bucket dan klik Bookmark untuk menyimpan jalan pintas.
                            </p>
                        ) : (
                            <div className="divide-y divide-base-200">
                                {data.bookmarks.map((bm) => (
                                    <div
                                        key={bm.id}
                                        className="flex items-center justify-between py-2.5 gap-2"
                                    >
                                        <Link
                                            href={`/buckets/${encodeURIComponent(bm.bucketName)}?prefix=${encodeURIComponent(bm.prefix)}`}
                                            className="flex items-center gap-2 min-w-0 hover:text-primary"
                                        >
                                            <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                                            <span className="text-xs font-mono truncate">
                                                {bm.label}
                                            </span>
                                        </Link>
                                        <button
                                            onClick={() => removeBookmark(bm.id)}
                                            className="btn btn-ghost btn-xs btn-square text-error shrink-0"
                                            title="Hapus bookmark"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Transfers */}
                <div className="card bg-base-100 border border-base-200 shadow-sm">
                    <div className="card-body p-5 space-y-3">
                        <div className="flex items-center gap-2 font-semibold text-sm">
                            <Activity className="w-4 h-4 text-primary" />
                            Recent Activity
                        </div>
                        {!data?.recentTransfers.length ? (
                            <p className="text-xs text-base-content/60 py-4">
                                Belum ada aktivitas upload, copy, atau hapus objek.
                            </p>
                        ) : (
                            <div className="divide-y divide-base-200">
                                {data.recentTransfers.map((t) => (
                                    <div
                                        key={t.id}
                                        className="flex items-center justify-between py-2 gap-3 text-xs"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="badge badge-xs badge-ghost font-mono">
                                                {t.type}
                                            </span>
                                            <span className="font-mono truncate" title={`${t.bucketName}/${t.objectKey}`}>
                                                <Database className="w-3 h-3 inline mr-1 opacity-60" />
                                                {t.bucketName}/{t.objectKey}
                                            </span>
                                        </div>
                                        <span className="text-base-content/50 shrink-0">
                                            {new Date(t.createdAt).toLocaleTimeString('id-ID')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
