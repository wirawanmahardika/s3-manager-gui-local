'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Activity,
    ArrowRight,
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

function getTransferBadgeClass(type: string) {
    if (type === 'UPLOAD') return 'badge-success badge-soft';
    if (type === 'COPY') return 'badge-info badge-soft';
    if (type === 'DELETE') return 'badge-error badge-soft';
    return 'badge-ghost';
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
            {/* Hero Header */}
            <div className="card bg-linear-to-r from-primary/10 via-base-100 to-secondary/10 border border-base-200 shadow-sm">
                <div className="card-body p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight">
                            Object Storage Console
                        </h1>
                        <p className="text-sm text-base-content/70">
                            Pantau koneksi S3 aktif, akses cepat folder favorit, dan riwayat aktivitas terbaru.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                        <Link href="/buckets" className="btn btn-primary btn-sm gap-1.5">
                            <Database className="w-4 h-4" />
                            Browse Buckets
                        </Link>
                        <Link href="/connections" className="btn btn-outline btn-sm gap-1.5">
                            <Plug className="w-4 h-4" />
                            Connections
                        </Link>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card bg-base-100 border border-base-200 shadow-sm hover:border-primary/40 transition-colors">
                    <div className="card-body p-5 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-base-content/60">
                                Active Connection
                            </span>
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Server className="w-4 h-4" />
                            </div>
                        </div>
                        {data?.activeConnection ? (
                            <div>
                                <div className="text-lg font-bold truncate">
                                    {data.activeConnection.name}
                                </div>
                                <div className="text-xs font-mono text-base-content/60 truncate">
                                    {data.activeConnection.endpoint}
                                </div>
                            </div>
                        ) : (
                            <Link
                                href="/connections"
                                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                            >
                                Tambah koneksi S3 <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        )}
                    </div>
                </div>

                <div className="card bg-base-100 border border-base-200 shadow-sm hover:border-secondary/40 transition-colors">
                    <div className="card-body p-5 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-base-content/60">
                                Total Connections
                            </span>
                            <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
                                <Plug className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-bold">{data?.totalConnections ?? 0}</div>
                        <Link
                            href="/connections"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                            Kelola koneksi <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>

                <div className="card bg-base-100 border border-base-200 shadow-sm hover:border-accent/40 transition-colors">
                    <div className="card-body p-5 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-base-content/60">
                                Bookmarks
                            </span>
                            <div className="p-2 rounded-lg bg-accent/10 text-accent">
                                <Bookmark className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-bold">{data?.bookmarks.length ?? 0}</div>
                        <Link
                            href="/buckets"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                            Buka Buckets <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bookmarks */}
                <div className="card bg-base-100 border border-base-200 shadow-sm">
                    <div className="card-body p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-semibold text-sm">
                                <Bookmark className="w-4 h-4 text-primary" />
                                Bookmarked Folders
                            </div>
                            <span className="badge badge-ghost badge-xs">
                                {data?.bookmarks.length ?? 0}
                            </span>
                        </div>
                        {!data?.bookmarks.length ? (
                            <p className="text-xs text-base-content/60 py-6 text-center">
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
                                            className="flex items-center gap-2.5 min-w-0 hover:text-primary"
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
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-semibold text-sm">
                                <Activity className="w-4 h-4 text-primary" />
                                Recent Activity
                            </div>
                            <span className="badge badge-ghost badge-xs">
                                {data?.recentTransfers.length ?? 0}
                            </span>
                        </div>
                        {!data?.recentTransfers.length ? (
                            <p className="text-xs text-base-content/60 py-6 text-center">
                                Belum ada aktivitas upload, copy, atau hapus objek.
                            </p>
                        ) : (
                            <div className="divide-y divide-base-200">
                                {data.recentTransfers.map((t) => (
                                    <div
                                        key={t.id}
                                        className="flex items-center justify-between py-2.5 gap-3 text-xs"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span
                                                className={`badge badge-xs font-mono ${getTransferBadgeClass(t.type)}`}
                                            >
                                                {t.type}
                                            </span>
                                            <span
                                                className="font-mono truncate"
                                                title={`${t.bucketName}/${t.objectKey}`}
                                            >
                                                {t.bucketName}/{t.objectKey}
                                            </span>
                                        </div>
                                        <span className="text-base-content/50 shrink-0 font-mono text-[11px]">
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
