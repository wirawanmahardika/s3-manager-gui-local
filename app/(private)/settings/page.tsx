'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronRight, Loader2, Save } from 'lucide-react';

export default function SettingsPage() {
    const [defaultRegion, setDefaultRegion] = useState('idn');
    const [defaultPresignExpires, setDefaultPresignExpires] = useState('3600');
    const [maxListKeys, setMaxListKeys] = useState('200');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch('/api/settings');
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Gagal memuat pengaturan');
                setDefaultRegion(data.settings.default_region ?? 'idn');
                setDefaultPresignExpires(data.settings.default_presign_expires ?? '3600');
                setMaxListKeys(data.settings.max_list_keys ?? '200');
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Gagal memuat pengaturan');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    default_region: defaultRegion,
                    default_presign_expires: Number(defaultPresignExpires),
                    max_list_keys: Number(maxListKeys),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Gagal menyimpan pengaturan');
            setSuccess('Pengaturan berhasil disimpan.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8 max-w-3xl">
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-base-content/60">
                    <span>Dashboard</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className="text-base-content font-medium">Settings</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Application Settings</h1>
                <p className="text-sm text-base-content/70">
                    Konfigurasi default untuk S3 Manager dan perilaku file explorer.
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            ) : (
                <form
                    onSubmit={handleSave}
                    className="card bg-base-100 border border-base-200 shadow-sm"
                >
                    <div className="card-body p-6 space-y-4">
                        <label className="form-control w-full">
                            <div className="label py-1">
                                <span className="label-text text-xs font-medium">
                                    Default Region
                                </span>
                            </div>
                            <input
                                type="text"
                                required
                                className="input input-bordered input-sm w-full font-mono"
                                value={defaultRegion}
                                onChange={(e) => setDefaultRegion(e.target.value)}
                            />
                            <div className="label py-1">
                                <span className="label-text-alt text-base-content/60">
                                    Contoh: idn (Biznet Gio) atau us-east-1
                                </span>
                            </div>
                        </label>

                        <label className="form-control w-full">
                            <div className="label py-1">
                                <span className="label-text text-xs font-medium">
                                    Default Presigned URL Expiry (detik)
                                </span>
                            </div>
                            <select
                                className="select select-bordered select-sm w-full"
                                value={defaultPresignExpires}
                                onChange={(e) => setDefaultPresignExpires(e.target.value)}
                            >
                                <option value="300">300 (5 Menit)</option>
                                <option value="3600">3600 (1 Jam)</option>
                                <option value="86400">86400 (24 Jam)</option>
                                <option value="604800">604800 (7 Hari)</option>
                            </select>
                        </label>

                        <label className="form-control w-full">
                            <div className="label py-1">
                                <span className="label-text text-xs font-medium">
                                    Max Objects per Page
                                </span>
                            </div>
                            <input
                                type="number"
                                min={20}
                                max={1000}
                                required
                                className="input input-bordered input-sm w-full font-mono"
                                value={maxListKeys}
                                onChange={(e) => setMaxListKeys(e.target.value)}
                            />
                        </label>

                        {error && (
                            <div role="alert" className="alert alert-error text-xs py-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {success && (
                            <div role="alert" className="alert alert-success text-xs py-2">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span>{success}</span>
                            </div>
                        )}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn btn-primary btn-sm gap-2"
                            >
                                {saving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                Simpan Pengaturan
                            </button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
}
