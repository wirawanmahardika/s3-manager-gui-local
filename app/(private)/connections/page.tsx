'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    CheckCircle2,
    ChevronRight,
    Edit3,
    Loader2,
    Plug,
    Plus,
    Server,
    Star,
    Trash2,
    Wifi,
    X,
    AlertCircle,
} from 'lucide-react';

interface ConnectionItem {
    id: string;
    name: string;
    endpoint: string;
    region: string;
    accessKeyId: string;
    forcePathStyle: boolean;
    createdAt: string;
    updatedAt: string;
}

interface ConnectionFormState {
    name: string;
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle: boolean;
    setActive: boolean;
}

const EMPTY_FORM: ConnectionFormState = {
    name: '',
    endpoint: '',
    region: 'idn',
    accessKeyId: '',
    secretAccessKey: '',
    forcePathStyle: true,
    setActive: true,
};

const PRESETS = [
    {
        label: 'Biznet Gio (WJV-1)',
        name: 'Biznet Gio WJV-1',
        endpoint: 'https://nos.wjv-1.neo.id',
        region: 'idn',
        forcePathStyle: true,
    },
    {
        label: 'Biznet Gio (JKT-1)',
        name: 'Biznet Gio JKT-1',
        endpoint: 'https://nos.jkt-1.neo.id',
        region: 'idn',
        forcePathStyle: true,
    },
];

export default function ConnectionsPage() {
    const [connections, setConnections] = useState<ConnectionItem[]>([]);
    const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<ConnectionFormState>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const [testingModal, setTestingModal] = useState(false);
    const [testResult, setTestResult] = useState<{
        ok: boolean;
        message: string;
    } | null>(null);

    const [testingCardId, setTestingCardId] = useState<string | null>(null);
    const [cardTestResults, setCardTestResults] = useState<
        Record<string, { ok: boolean; message: string }>
    >({});

    const fetchConnections = useCallback(async () => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const res = await fetch('/api/connections');
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Gagal memuat daftar koneksi');
            }
            setConnections(data.connections ?? []);
            setActiveConnectionId(data.activeConnectionId ?? null);
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Terjadi kesalahan');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConnections();
    }, [fetchConnections]);

    const openCreateModal = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setTestResult(null);
        setModalOpen(true);
    };

    const openEditModal = (conn: ConnectionItem) => {
        setEditingId(conn.id);
        setForm({
            name: conn.name,
            endpoint: conn.endpoint,
            region: conn.region,
            accessKeyId: conn.accessKeyId,
            secretAccessKey: '',
            forcePathStyle: conn.forcePathStyle,
            setActive: conn.id === activeConnectionId,
        });
        setTestResult(null);
        setModalOpen(true);
    };

    const applyPreset = (preset: (typeof PRESETS)[number]) => {
        setForm((prev) => ({
            ...prev,
            name: prev.name || preset.name,
            endpoint: preset.endpoint,
            region: preset.region,
            forcePathStyle: preset.forcePathStyle,
        }));
    };

    const handleTestInModal = async () => {
        setTestingModal(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/connections/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    connectionId: editingId ?? undefined,
                    endpoint: form.endpoint,
                    region: form.region,
                    accessKeyId: form.accessKeyId,
                    secretAccessKey: form.secretAccessKey || undefined,
                    forcePathStyle: form.forcePathStyle,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                throw new Error(data.error || 'Koneksi gagal');
            }
            const bucketInfo =
                data.bucketsCount > 0
                    ? `${data.bucketsCount} bucket ditemukan (${data.sampleBuckets.join(', ')})`
                    : 'Terhubung, belum ada bucket';
            setTestResult({ ok: true, message: bucketInfo });
        } catch (err) {
            setTestResult({
                ok: false,
                message: err instanceof Error ? err.message : 'Koneksi gagal',
            });
        } finally {
            setTestingModal(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setTestResult(null);

        try {
            const url = editingId ? `/api/connections/${editingId}` : '/api/connections';
            const method = editingId ? 'PATCH' : 'POST';

            const payload = editingId
                ? {
                      name: form.name,
                      endpoint: form.endpoint,
                      region: form.region,
                      accessKeyId: form.accessKeyId,
                      forcePathStyle: form.forcePathStyle,
                      ...(form.secretAccessKey ? { secretAccessKey: form.secretAccessKey } : {}),
                  }
                : form;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Gagal menyimpan koneksi');
            }

            setModalOpen(false);
            await fetchConnections();
        } catch (err) {
            setTestResult({
                ok: false,
                message: err instanceof Error ? err.message : 'Gagal menyimpan koneksi',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleSetActive = async (connectionId: string) => {
        try {
            const res = await fetch('/api/connections/active', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ connectionId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Gagal mengaktifkan koneksi');
            setActiveConnectionId(data.activeConnectionId);
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Gagal mengaktifkan koneksi');
        }
    };

    const handleTestCard = async (connectionId: string) => {
        setTestingCardId(connectionId);
        try {
            const res = await fetch('/api/connections/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ connectionId }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                throw new Error(data.error || 'Koneksi gagal');
            }
            setCardTestResults((prev) => ({
                ...prev,
                [connectionId]: {
                    ok: true,
                    message: `OK (${data.bucketsCount} bucket)`,
                },
            }));
        } catch (err) {
            setCardTestResults((prev) => ({
                ...prev,
                [connectionId]: {
                    ok: false,
                    message: err instanceof Error ? err.message : 'Gagal',
                },
            }));
        } finally {
            setTestingCardId(null);
        }
    };

    const handleDelete = async (conn: ConnectionItem) => {
        if (!confirm(`Hapus koneksi "${conn.name}"?`)) return;
        try {
            const res = await fetch(`/api/connections/${conn.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Gagal menghapus koneksi');
            await fetchConnections();
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Gagal menghapus koneksi');
        }
    };

    return (
        <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-base-content/60">
                    <span>Dashboard</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className="text-base-content font-medium">Connections</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">S3 Connections</h1>
                        <p className="text-sm text-base-content/70">
                            Hubungkan dan kelola profil S3-compatible storage (Biznet Gio, MinIO, R2, AWS S3).
                        </p>
                    </div>
                    <button onClick={openCreateModal} className="btn btn-primary btn-sm sm:btn-md gap-2">
                        <Plus className="w-4 h-4" />
                        Add Connection
                    </button>
                </div>
            </div>

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
            ) : connections.length === 0 ? (
                <div className="card bg-base-100 border border-base-200 shadow-sm">
                    <div className="card-body items-center text-center py-12 space-y-3">
                        <div className="p-3 bg-primary/10 rounded-full text-primary">
                            <Plug className="w-7 h-7" />
                        </div>
                        <h2 className="text-lg font-semibold">Belum ada koneksi S3</h2>
                        <p className="text-sm text-base-content/70 max-w-md">
                            Tambahkan koneksi Biznet Gio NEO Object Storage atau S3-compatible lainnya untuk mulai mengelola bucket dan file.
                        </p>
                        <button onClick={openCreateModal} className="btn btn-primary btn-sm gap-2">
                            <Plus className="w-4 h-4" />
                            Tambah Koneksi Pertama
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {connections.map((conn) => {
                        const isActive = conn.id === activeConnectionId;
                        const cardResult = cardTestResults[conn.id];
                        return (
                            <div
                                key={conn.id}
                                className={`card bg-base-100 border shadow-sm transition-all ${
                                    isActive ? 'border-primary ring-1 ring-primary/30' : 'border-base-200'
                                }`}
                            >
                                <div className="card-body p-5 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                                                <Server className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-base truncate" title={conn.name}>
                                                    {conn.name}
                                                </h3>
                                                <p className="text-xs text-base-content/60 font-mono truncate" title={conn.endpoint}>
                                                    {conn.endpoint}
                                                </p>
                                            </div>
                                        </div>
                                        {isActive && (
                                            <span className="badge badge-primary badge-sm gap-1 shrink-0">
                                                <Star className="w-3 h-3" />
                                                Active
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2 text-xs">
                                        <span className="badge badge-ghost badge-sm font-mono">
                                            Region: {conn.region}
                                        </span>
                                        <span className="badge badge-ghost badge-sm">
                                            {conn.forcePathStyle ? 'Path-Style' : 'Virtual-Hosted'}
                                        </span>
                                    </div>

                                    <div className="text-xs text-base-content/70 font-mono truncate">
                                        Access Key: {conn.accessKeyId}
                                    </div>

                                    {cardResult && (
                                        <div
                                            className={`text-xs px-2.5 py-1.5 rounded-md flex items-center gap-1.5 ${
                                                cardResult.ok
                                                    ? 'bg-success/10 text-success'
                                                    : 'bg-error/10 text-error'
                                            }`}
                                        >
                                            {cardResult.ok ? (
                                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                            ) : (
                                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                            )}
                                            <span className="truncate" title={cardResult.message}>
                                                {cardResult.message}
                                            </span>
                                        </div>
                                    )}

                                    <div className="divider my-0"></div>

                                    <div className="flex items-center justify-between gap-2 pt-1">
                                        <div className="flex items-center gap-1">
                                            {!isActive && (
                                                <button
                                                    onClick={() => handleSetActive(conn.id)}
                                                    className="btn btn-xs btn-primary btn-outline"
                                                >
                                                    Set Active
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleTestCard(conn.id)}
                                                disabled={testingCardId === conn.id}
                                                className="btn btn-xs btn-ghost gap-1"
                                            >
                                                {testingCardId === conn.id ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <Wifi className="w-3.5 h-3.5" />
                                                )}
                                                Test
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => openEditModal(conn)}
                                                className="btn btn-xs btn-ghost btn-square"
                                                title="Edit"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(conn)}
                                                className="btn btn-xs btn-ghost btn-square text-error"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {modalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg">
                                {editingId ? 'Edit Koneksi S3' : 'Tambah Koneksi S3'}
                            </h3>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="btn btn-sm btn-circle btn-ghost"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="mb-4">
                            <span className="text-xs font-medium text-base-content/70 block mb-1.5">
                                Quick Preset:
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {PRESETS.map((preset) => (
                                    <button
                                        key={preset.label}
                                        type="button"
                                        onClick={() => applyPreset(preset)}
                                        className="btn btn-xs btn-outline"
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <form onSubmit={handleSave} className="space-y-3">
                            <label className="form-control w-full">
                                <div className="label py-1">
                                    <span className="label-text text-xs font-medium">Nama Koneksi</span>
                                </div>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Biznet Gio Production"
                                    className="input input-bordered input-sm w-full"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                />
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <label className="form-control w-full sm:col-span-2">
                                    <div className="label py-1">
                                        <span className="label-text text-xs font-medium">Endpoint URL</span>
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        placeholder="https://nos.wjv-1.neo.id"
                                        className="input input-bordered input-sm w-full font-mono"
                                        value={form.endpoint}
                                        onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                                    />
                                </label>

                                <label className="form-control w-full">
                                    <div className="label py-1">
                                        <span className="label-text text-xs font-medium">Region</span>
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        placeholder="idn"
                                        className="input input-bordered input-sm w-full font-mono"
                                        value={form.region}
                                        onChange={(e) => setForm({ ...form, region: e.target.value })}
                                    />
                                </label>
                            </div>

                            <label className="form-control w-full">
                                <div className="label py-1">
                                    <span className="label-text text-xs font-medium">Access Key ID</span>
                                </div>
                                <input
                                    type="text"
                                    required
                                    className="input input-bordered input-sm w-full font-mono"
                                    value={form.accessKeyId}
                                    onChange={(e) => setForm({ ...form, accessKeyId: e.target.value })}
                                />
                            </label>

                            <label className="form-control w-full">
                                <div className="label py-1">
                                    <span className="label-text text-xs font-medium">
                                        Secret Access Key{' '}
                                        {editingId && (
                                            <span className="text-base-content/50 font-normal">
                                                (kosongkan jika tidak diubah)
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <input
                                    type="password"
                                    required={!editingId}
                                    className="input input-bordered input-sm w-full font-mono"
                                    value={form.secretAccessKey}
                                    onChange={(e) => setForm({ ...form, secretAccessKey: e.target.value })}
                                />
                            </label>

                            <div className="flex flex-wrap items-center gap-6 pt-1">
                                <label className="label cursor-pointer gap-2 p-0">
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-sm checkbox-primary"
                                        checked={form.forcePathStyle}
                                        onChange={(e) =>
                                            setForm({ ...form, forcePathStyle: e.target.checked })
                                        }
                                    />
                                    <span className="label-text text-xs">Force Path Style</span>
                                </label>

                                {!editingId && (
                                    <label className="label cursor-pointer gap-2 p-0">
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-sm checkbox-primary"
                                            checked={form.setActive}
                                            onChange={(e) =>
                                                setForm({ ...form, setActive: e.target.checked })
                                            }
                                        />
                                        <span className="label-text text-xs">Jadikan koneksi aktif</span>
                                    </label>
                                )}
                            </div>

                            {testResult && (
                                <div
                                    role="alert"
                                    className={`alert text-xs py-2 ${
                                        testResult.ok ? 'alert-success' : 'alert-error'
                                    }`}
                                >
                                    {testResult.ok ? (
                                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    ) : (
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                    )}
                                    <span>{testResult.message}</span>
                                </div>
                            )}

                            <div className="modal-action justify-between pt-2">
                                <button
                                    type="button"
                                    onClick={handleTestInModal}
                                    disabled={testingModal || !form.endpoint || !form.accessKeyId}
                                    className="btn btn-sm btn-outline gap-1.5"
                                >
                                    {testingModal ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Wifi className="w-3.5 h-3.5" />
                                    )}
                                    Test Connection
                                </button>

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setModalOpen(false)}
                                        className="btn btn-sm btn-ghost"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="btn btn-sm btn-primary gap-1.5"
                                    >
                                        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                        Simpan
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div className="modal-backdrop" onClick={() => setModalOpen(false)}></div>
                </div>
            )}
        </div>
    );
}
