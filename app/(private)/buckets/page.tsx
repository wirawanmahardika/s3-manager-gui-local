'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    Folder,
    FolderOpen,
    LayoutGrid,
    List,
    Loader2,
    MoreVertical,
    Plug,
    Plus,
    RefreshCw,
    Search,
    Server,
    SlidersHorizontal,
    Trash2,
    X,
} from 'lucide-react';

interface BucketItem {
    name: string;
    creationDate: string | null;
}

interface ActiveConnectionInfo {
    id: string;
    name: string;
    endpoint: string;
    region: string;
}

export default function BucketsPage() {
    const [buckets, setBuckets] = useState<BucketItem[]>([]);
    const [connection, setConnection] = useState<ActiveConnectionInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    // Create bucket modal
    const [createOpen, setCreateOpen] = useState(false);
    const [newBucketName, setNewBucketName] = useState('');
    const [newBucketAcl, setNewBucketAcl] = useState<'private' | 'public-read'>('private');
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // Bucket settings modal
    const [settingsBucket, setSettingsBucket] = useState<string | null>(null);
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [settingsSaving, setSettingsSaving] = useState(false);
    const [settingsError, setSettingsError] = useState<string | null>(null);
    const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
    const [acl, setAcl] = useState<'private' | 'public-read'>('private');
    const [versioning, setVersioning] = useState<'Enabled' | 'Suspended'>('Suspended');
    const [corsJson, setCorsJson] = useState('[]');
    const [policyJson, setPolicyJson] = useState('');

    const fetchBuckets = useCallback(async () => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const res = await fetch('/api/buckets');
            const data = await res.json();
            if (!res.ok) {
                setConnection(data.connection ?? null);
                throw new Error(data.error || 'Gagal memuat daftar bucket');
            }
            setBuckets(data.buckets ?? []);
            setConnection(data.connection ?? null);
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Terjadi kesalahan');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBuckets();
    }, [fetchBuckets]);

    const handleCreateBucket = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setCreateError(null);
        try {
            const res = await fetch('/api/buckets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newBucketName.trim(),
                    acl: newBucketAcl,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Gagal membuat bucket');
            }
            setCreateOpen(false);
            setNewBucketName('');
            setNewBucketAcl('private');
            await fetchBuckets();
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : 'Gagal membuat bucket');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteBucket = async (bucketName: string) => {
        if (
            !confirm(
                `Hapus bucket "${bucketName}"? Bucket harus dalam keadaan kosong sebelum dapat dihapus.`
            )
        ) {
            return;
        }
        setErrorMessage(null);
        try {
            const res = await fetch(`/api/buckets/${encodeURIComponent(bucketName)}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Gagal menghapus bucket');
            }
            await fetchBuckets();
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Gagal menghapus bucket');
        }
    };

    const openSettingsModal = async (bucketName: string) => {
        setSettingsBucket(bucketName);
        setSettingsLoading(true);
        setSettingsError(null);
        setSettingsSuccess(null);

        try {
            const res = await fetch(`/api/buckets/${encodeURIComponent(bucketName)}/settings`);
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Gagal memuat pengaturan bucket');
            }
            setAcl(data.isPublic ? 'public-read' : 'private');
            setVersioning(data.versioning === 'Enabled' ? 'Enabled' : 'Suspended');
            setCorsJson(JSON.stringify(data.corsRules ?? [], null, 2));
            setPolicyJson(data.policy ?? '');
        } catch (err) {
            setSettingsError(
                err instanceof Error ? err.message : 'Gagal memuat pengaturan bucket'
            );
        } finally {
            setSettingsLoading(false);
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settingsBucket) return;

        setSettingsSaving(true);
        setSettingsError(null);
        setSettingsSuccess(null);

        try {
            let parsedCors: unknown[];
            try {
                parsedCors = corsJson.trim() ? JSON.parse(corsJson) : [];
                if (!Array.isArray(parsedCors)) {
                    throw new Error('CORS harus berupa array JSON');
                }
            } catch (err) {
                throw new Error(
                    err instanceof Error ? `Format CORS JSON tidak valid: ${err.message}` : 'Format CORS JSON tidak valid'
                );
            }

            if (policyJson.trim()) {
                try {
                    JSON.parse(policyJson);
                } catch {
                    throw new Error('Format Bucket Policy JSON tidak valid');
                }
            }

            const res = await fetch(
                `/api/buckets/${encodeURIComponent(settingsBucket)}/settings`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        acl,
                        versioning,
                        corsRules: parsedCors,
                        policy: policyJson.trim() ? policyJson.trim() : null,
                    }),
                }
            );
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Gagal menyimpan pengaturan bucket');
            }
            setSettingsSuccess('Konfigurasi bucket berhasil disimpan.');
        } catch (err) {
            setSettingsError(
                err instanceof Error ? err.message : 'Gagal menyimpan pengaturan bucket'
            );
        } finally {
            setSettingsSaving(false);
        }
    };

    const filteredBuckets = buckets.filter((b) =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (iso: string | null) => {
        if (!iso) return '-';
        try {
            return new Date(iso).toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return iso;
        }
    };

    return (
        <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-base-content/60">
                    <span>Dashboard</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className="text-base-content font-medium">Buckets</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Bucket Storage</h1>
                        <p className="text-sm text-base-content/70">
                            Kelola bucket dan konfigurasi pada koneksi S3 yang aktif.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchBuckets}
                            disabled={loading}
                            className="btn btn-ghost btn-sm sm:btn-md gap-1.5"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <button
                            onClick={() => {
                                setCreateError(null);
                                setCreateOpen(true);
                            }}
                            disabled={!connection}
                            className="btn btn-primary btn-sm sm:btn-md gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Create Bucket
                        </button>
                    </div>
                </div>
            </div>

            {/* Active Connection Banner */}
            {connection && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-base-100 px-4 py-3 rounded-lg border border-base-200 shadow-sm text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <Server className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-semibold truncate">{connection.name}</span>
                        <span className="text-base-content/60 font-mono truncate">
                            {connection.endpoint}
                        </span>
                        <span className="badge badge-ghost badge-xs font-mono">
                            {connection.region}
                        </span>
                    </div>
                    <Link href="/connections" className="link link-primary text-xs shrink-0">
                        Ganti Koneksi
                    </Link>
                </div>
            )}

            {errorMessage && (
                <div role="alert" className="alert alert-error text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            ) : !connection ? (
                <div className="card bg-base-100 border border-base-200 shadow-sm">
                    <div className="card-body items-center text-center py-12 space-y-3">
                        <div className="p-3 bg-primary/10 rounded-full text-primary">
                            <Plug className="w-7 h-7" />
                        </div>
                        <h2 className="text-lg font-semibold">Belum ada koneksi S3 aktif</h2>
                        <p className="text-sm text-base-content/70 max-w-md">
                            Tambahkan dan aktifkan koneksi Biznet Gio atau S3-compatible terlebih dahulu di halaman Connections.
                        </p>
                        <Link href="/connections" className="btn btn-primary btn-sm gap-2">
                            <Plug className="w-4 h-4" />
                            Buka Connections
                        </Link>
                    </div>
                </div>
            ) : (
                <>
                    {/* Control Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-base-100 p-3 rounded-lg border border-base-200 shadow-sm">
                        <div className="relative w-full sm:w-80">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                            <input
                                type="text"
                                placeholder="Cari nama bucket..."
                                className="input input-bordered w-full pl-9 input-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                            <span className="text-xs text-base-content/60">
                                {filteredBuckets.length} bucket
                            </span>
                            <div className="join border border-base-300">
                                <button
                                    className={`btn btn-xs sm:btn-sm join-item ${viewMode === 'grid' ? 'btn-active' : ''}`}
                                    onClick={() => setViewMode('grid')}
                                    title="Grid View"
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button
                                    className={`btn btn-xs sm:btn-sm join-item ${viewMode === 'table' ? 'btn-active' : ''}`}
                                    onClick={() => setViewMode('table')}
                                    title="Table View"
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {filteredBuckets.length === 0 ? (
                        <div className="card bg-base-100 border border-base-200 shadow-sm">
                            <div className="card-body items-center text-center py-12 text-sm text-base-content/70">
                                Tidak ada bucket yang ditemukan.
                            </div>
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                            {filteredBuckets.map((bucket) => (
                                <div
                                    key={bucket.name}
                                    className="card bg-base-100 border border-base-200 shadow-sm hover:border-base-300 transition-all"
                                >
                                    <div className="card-body p-4 space-y-3">
                                        <div className="flex items-start justify-between">
                                            <Link
                                                href={`/buckets/${encodeURIComponent(bucket.name)}`}
                                                className="flex items-center gap-3 min-w-0 group"
                                            >
                                                <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-content transition-colors">
                                                    <Folder className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3
                                                        className="font-semibold text-sm truncate group-hover:text-primary"
                                                        title={bucket.name}
                                                    >
                                                        {bucket.name}
                                                    </h3>
                                                    <span className="text-xs text-base-content/60">
                                                        Dibuat: {formatDate(bucket.creationDate)}
                                                    </span>
                                                </div>
                                            </Link>

                                            <div className="dropdown dropdown-end shrink-0">
                                                <div
                                                    tabIndex={0}
                                                    role="button"
                                                    className="btn btn-ghost btn-xs btn-square"
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </div>
                                                <ul
                                                    tabIndex={0}
                                                    className="dropdown-content z-10 menu p-2 shadow bg-base-100 rounded-box w-44 text-xs"
                                                >
                                                    <li>
                                                        <Link
                                                            href={`/buckets/${encodeURIComponent(bucket.name)}`}
                                                        >
                                                            <FolderOpen className="w-3.5 h-3.5" />
                                                            Browse Files
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <button
                                                            onClick={() =>
                                                                openSettingsModal(bucket.name)
                                                            }
                                                        >
                                                            <SlidersHorizontal className="w-3.5 h-3.5" />
                                                            Bucket Settings
                                                        </button>
                                                    </li>
                                                    <li className="text-error">
                                                        <button
                                                            onClick={() =>
                                                                handleDeleteBucket(bucket.name)
                                                            }
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            Delete Bucket
                                                        </button>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="divider my-0"></div>

                                        <div className="flex items-center justify-between pt-1">
                                            <Link
                                                href={`/buckets/${encodeURIComponent(bucket.name)}`}
                                                className="btn btn-xs btn-primary btn-outline gap-1"
                                            >
                                                <FolderOpen className="w-3.5 h-3.5" />
                                                Buka
                                            </Link>
                                            <button
                                                onClick={() => openSettingsModal(bucket.name)}
                                                className="btn btn-xs btn-ghost gap-1"
                                            >
                                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                                Settings
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-x-auto bg-base-100 rounded-lg border border-base-200 shadow-sm">
                            <table className="table table-sm sm:table-md w-full">
                                <thead>
                                    <tr className="bg-base-200/50">
                                        <th>Bucket Name</th>
                                        <th>Region</th>
                                        <th>Created Date</th>
                                        <th className="text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredBuckets.map((bucket) => (
                                        <tr key={bucket.name} className="hover">
                                            <td className="font-medium">
                                                <Link
                                                    href={`/buckets/${encodeURIComponent(bucket.name)}`}
                                                    className="flex items-center gap-2 hover:text-primary"
                                                >
                                                    <Folder className="w-4 h-4 text-primary shrink-0" />
                                                    <span className="truncate max-w-xs">
                                                        {bucket.name}
                                                    </span>
                                                </Link>
                                            </td>
                                            <td className="font-mono text-xs">{connection.region}</td>
                                            <td className="text-xs">
                                                {formatDate(bucket.creationDate)}
                                            </td>
                                            <td className="text-right space-x-1">
                                                <Link
                                                    href={`/buckets/${encodeURIComponent(bucket.name)}`}
                                                    className="btn btn-ghost btn-xs"
                                                >
                                                    Browse
                                                </Link>
                                                <button
                                                    onClick={() => openSettingsModal(bucket.name)}
                                                    className="btn btn-ghost btn-xs"
                                                >
                                                    Settings
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteBucket(bucket.name)}
                                                    className="btn btn-ghost btn-xs text-error"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Create Bucket Modal */}
            {createOpen && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg">Create Bucket</h3>
                            <button
                                onClick={() => setCreateOpen(false)}
                                className="btn btn-sm btn-circle btn-ghost"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateBucket} className="space-y-4">
                            <label className="form-control w-full">
                                <div className="label py-1">
                                    <span className="label-text text-xs font-medium">
                                        Nama Bucket
                                    </span>
                                </div>
                                <input
                                    type="text"
                                    required
                                    placeholder="contoh: media-production-2026"
                                    className="input input-bordered input-sm w-full font-mono"
                                    value={newBucketName}
                                    onChange={(e) => setNewBucketName(e.target.value.toLowerCase())}
                                />
                                <div className="label py-1">
                                    <span className="label-text-alt text-base-content/60">
                                        Huruf kecil, angka, titik, atau tanda hubung (3-63 karakter).
                                    </span>
                                </div>
                            </label>

                            <label className="form-control w-full">
                                <div className="label py-1">
                                    <span className="label-text text-xs font-medium">
                                        Access Control (ACL)
                                    </span>
                                </div>
                                <select
                                    className="select select-bordered select-sm w-full"
                                    value={newBucketAcl}
                                    onChange={(e) =>
                                        setNewBucketAcl(e.target.value as 'private' | 'public-read')
                                    }
                                >
                                    <option value="private">Private</option>
                                    <option value="public-read">Public Read</option>
                                </select>
                            </label>

                            {createError && (
                                <div role="alert" className="alert alert-error text-xs py-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{createError}</span>
                                </div>
                            )}

                            <div className="modal-action">
                                <button
                                    type="button"
                                    onClick={() => setCreateOpen(false)}
                                    className="btn btn-sm btn-ghost"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="btn btn-sm btn-primary gap-1.5"
                                >
                                    {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Buat Bucket
                                </button>
                            </div>
                        </form>
                    </div>
                    <div className="modal-backdrop" onClick={() => setCreateOpen(false)}></div>
                </div>
            )}

            {/* Bucket Settings Modal */}
            {settingsBucket && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-lg">Bucket Settings</h3>
                                <p className="text-xs font-mono text-base-content/60">
                                    {settingsBucket}
                                </p>
                            </div>
                            <button
                                onClick={() => setSettingsBucket(null)}
                                className="btn btn-sm btn-circle btn-ghost"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {settingsLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : (
                            <form onSubmit={handleSaveSettings} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <label className="form-control w-full">
                                        <div className="label py-1">
                                            <span className="label-text text-xs font-medium">
                                                Bucket ACL
                                            </span>
                                        </div>
                                        <select
                                            className="select select-bordered select-sm w-full"
                                            value={acl}
                                            onChange={(e) =>
                                                setAcl(e.target.value as 'private' | 'public-read')
                                            }
                                        >
                                            <option value="private">Private</option>
                                            <option value="public-read">Public Read</option>
                                        </select>
                                    </label>

                                    <label className="form-control w-full">
                                        <div className="label py-1">
                                            <span className="label-text text-xs font-medium">
                                                Object Versioning
                                            </span>
                                        </div>
                                        <select
                                            className="select select-bordered select-sm w-full"
                                            value={versioning}
                                            onChange={(e) =>
                                                setVersioning(
                                                    e.target.value as 'Enabled' | 'Suspended'
                                                )
                                            }
                                        >
                                            <option value="Enabled">Enabled</option>
                                            <option value="Suspended">Suspended</option>
                                        </select>
                                    </label>
                                </div>

                                <label className="form-control w-full">
                                    <div className="label py-1">
                                        <span className="label-text text-xs font-medium">
                                            CORS Rules (JSON Array)
                                        </span>
                                    </div>
                                    <textarea
                                        rows={5}
                                        className="textarea textarea-bordered font-mono text-xs w-full"
                                        value={corsJson}
                                        onChange={(e) => setCorsJson(e.target.value)}
                                        placeholder='[{"AllowedOrigins":["*"],"AllowedMethods":["GET","PUT"],"AllowedHeaders":["*"]}]'
                                    />
                                </label>

                                <label className="form-control w-full">
                                    <div className="label py-1">
                                        <span className="label-text text-xs font-medium">
                                            Bucket Policy (JSON, kosongkan untuk menghapus policy)
                                        </span>
                                    </div>
                                    <textarea
                                        rows={5}
                                        className="textarea textarea-bordered font-mono text-xs w-full"
                                        value={policyJson}
                                        onChange={(e) => setPolicyJson(e.target.value)}
                                        placeholder='{"Version":"2012-10-17","Statement":[...]}'
                                    />
                                </label>

                                {settingsError && (
                                    <div role="alert" className="alert alert-error text-xs py-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{settingsError}</span>
                                    </div>
                                )}

                                {settingsSuccess && (
                                    <div role="alert" className="alert alert-success text-xs py-2">
                                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                                        <span>{settingsSuccess}</span>
                                    </div>
                                )}

                                <div className="modal-action">
                                    <button
                                        type="button"
                                        onClick={() => setSettingsBucket(null)}
                                        className="btn btn-sm btn-ghost"
                                    >
                                        Tutup
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={settingsSaving}
                                        className="btn btn-sm btn-primary gap-1.5"
                                    >
                                        {settingsSaving && (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        )}
                                        Simpan Konfigurasi
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                    <div
                        className="modal-backdrop"
                        onClick={() => setSettingsBucket(null)}
                    ></div>
                </div>
            )}
        </div>
    );
}
