'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
    AlertCircle,
    ArrowLeft,
    Bookmark,
    Check,
    ChevronRight,
    Copy,
    Download,
    Edit3,
    Eye,
    File as FileIcon,
    FileCode,
    FileImage,
    FileText,
    Folder,
    FolderPlus,
    Link2,
    Loader2,
    RefreshCw,
    Search,
    Trash2,
    Upload,
    X,
} from 'lucide-react';

interface ListedFolder {
    prefix: string;
    name: string;
}

interface ListedObject {
    key: string;
    name: string;
    size: number;
    lastModified: string | null;
    eTag: string | null;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function getFileIcon(fileName: string) {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
        return <FileImage className="w-4 h-4 text-info shrink-0" />;
    }
    if (['json', 'ts', 'tsx', 'js', 'jsx', 'html', 'css', 'xml', 'yaml', 'yml', 'md'].includes(ext)) {
        return <FileCode className="w-4 h-4 text-accent shrink-0" />;
    }
    if (['txt', 'log', 'csv', 'pdf'].includes(ext)) {
        return <FileText className="w-4 h-4 text-warning shrink-0" />;
    }
    return <FileIcon className="w-4 h-4 text-base-content/70 shrink-0" />;
}

function isPreviewable(fileName: string): 'image' | 'pdf' | 'text' | null {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['txt', 'log', 'csv', 'json', 'md', 'xml', 'yaml', 'yml', 'html', 'css', 'js', 'ts'].includes(ext)) {
        return 'text';
    }
    return null;
}

export default function BucketExplorerPage() {
    const params = useParams<{ bucketName: string }>();
    const searchParams = useSearchParams();
    const bucketName = decodeURIComponent(params.bucketName);
    const initialPrefix = searchParams.get('prefix') ?? '';

    const [prefix, setPrefix] = useState(initialPrefix);
    const [folders, setFolders] = useState<ListedFolder[]>([]);
    const [objects, setObjects] = useState<ListedObject[]>([]);
    const [nextToken, setNextToken] = useState<string | null>(null);
    const [isTruncated, setIsTruncated] = useState(false);

    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

    // Upload
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    // New folder modal
    const [folderModalOpen, setFolderModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [creatingFolder, setCreatingFolder] = useState(false);

    // Rename / Copy modal
    const [copyModal, setCopyModal] = useState<{
        mode: 'rename' | 'copy';
        sourceKey: string;
        targetKey: string;
    } | null>(null);
    const [copying, setCopying] = useState(false);

    // Presign modal
    const [presignModal, setPresignModal] = useState<{
        key: string;
        expiresIn: number;
        url: string | null;
        loading: boolean;
        copied: boolean;
    } | null>(null);

    // Preview modal
    const [previewModal, setPreviewModal] = useState<{
        key: string;
        name: string;
        kind: 'image' | 'pdf' | 'text';
        textContent?: string;
        loading?: boolean;
    } | null>(null);

    // Bookmark
    const [bookmarking, setBookmarking] = useState(false);
    const [bookmarkFeedback, setBookmarkFeedback] = useState<string | null>(null);

    const loadObjects = useCallback(
        async (targetPrefix: string, token?: string, append = false) => {
            if (append) {
                setLoadingMore(true);
            } else {
                setLoading(true);
                setSelectedKeys(new Set());
            }
            setErrorMessage(null);

            try {
                const query = new URLSearchParams({ prefix: targetPrefix });
                if (token) query.set('continuationToken', token);

                const res = await fetch(
                    `/api/buckets/${encodeURIComponent(bucketName)}/objects?${query.toString()}`
                );
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || 'Gagal memuat daftar objek');
                }

                if (append) {
                    setFolders((prev) => [...prev, ...(data.folders ?? [])]);
                    setObjects((prev) => [...prev, ...(data.objects ?? [])]);
                } else {
                    setFolders(data.folders ?? []);
                    setObjects(data.objects ?? []);
                }
                setIsTruncated(Boolean(data.isTruncated));
                setNextToken(data.nextContinuationToken ?? null);
            } catch (err) {
                setErrorMessage(err instanceof Error ? err.message : 'Terjadi kesalahan');
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [bucketName]
    );

    useEffect(() => {
        loadObjects(prefix);
    }, [prefix, loadObjects]);

    const handleUploadFiles = async (fileList: FileList | File[]) => {
        const files = Array.from(fileList);
        if (files.length === 0) return;

        setUploading(true);
        setErrorMessage(null);
        try {
            const formData = new FormData();
            formData.append('prefix', prefix);
            for (const file of files) {
                formData.append('files', file);
            }

            const res = await fetch(
                `/api/buckets/${encodeURIComponent(bucketName)}/objects`,
                {
                    method: 'POST',
                    body: formData,
                }
            );
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Gagal mengunggah file');
            }
            await loadObjects(prefix);
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Gagal mengunggah file');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleaned = newFolderName.trim().replace(/^\/+|\/+$/g, '');
        if (!cleaned) return;

        setCreatingFolder(true);
        setErrorMessage(null);
        try {
            const res = await fetch(
                `/api/buckets/${encodeURIComponent(bucketName)}/objects`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'create-folder',
                        prefix: `${prefix}${cleaned}/`,
                    }),
                }
            );
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Gagal membuat folder');
            }
            setFolderModalOpen(false);
            setNewFolderName('');
            await loadObjects(prefix);
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Gagal membuat folder');
        } finally {
            setCreatingFolder(false);
        }
    };

    const handleDeleteKeys = async (keys: string[]) => {
        if (keys.length === 0) return;
        if (!confirm(`Hapus ${keys.length} objek terpilih?`)) return;

        setErrorMessage(null);
        try {
            const res = await fetch(
                `/api/buckets/${encodeURIComponent(bucketName)}/objects`,
                {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ keys }),
                }
            );
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Gagal menghapus objek');
            }
            await loadObjects(prefix);
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Gagal menghapus objek');
        }
    };

    const handleCopyOrRename = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!copyModal) return;

        setCopying(true);
        setErrorMessage(null);
        try {
            const res = await fetch(
                `/api/buckets/${encodeURIComponent(bucketName)}/objects`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: copyModal.mode,
                        sourceKey: copyModal.sourceKey,
                        destinationKey: copyModal.targetKey.trim(),
                    }),
                }
            );
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Operasi gagal');
            }
            setCopyModal(null);
            await loadObjects(prefix);
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Operasi gagal');
        } finally {
            setCopying(false);
        }
    };

    const generatePresignUrl = async (key: string, expiresIn: number) => {
        setPresignModal({ key, expiresIn, url: null, loading: true, copied: false });
        try {
            const res = await fetch(
                `/api/buckets/${encodeURIComponent(bucketName)}/objects/presign`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key, expiresIn }),
                }
            );
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Gagal membuat presigned URL');
            }
            setPresignModal({
                key,
                expiresIn,
                url: data.url,
                loading: false,
                copied: false,
            });
        } catch (err) {
            setPresignModal(null);
            setErrorMessage(
                err instanceof Error ? err.message : 'Gagal membuat presigned URL'
            );
        }
    };

    const openPreview = async (obj: ListedObject) => {
        const kind = isPreviewable(obj.name);
        if (!kind) return;

        if (kind === 'text') {
            setPreviewModal({ key: obj.key, name: obj.name, kind, loading: true });
            try {
                const res = await fetch(
                    `/api/buckets/${encodeURIComponent(bucketName)}/objects/download?key=${encodeURIComponent(obj.key)}&inline=1`
                );
                const text = await res.text();
                setPreviewModal({
                    key: obj.key,
                    name: obj.name,
                    kind,
                    textContent: text.slice(0, 100_000),
                    loading: false,
                });
            } catch {
                setPreviewModal(null);
                setErrorMessage('Gagal memuat preview file');
            }
        } else {
            setPreviewModal({ key: obj.key, name: obj.name, kind });
        }
    };

    const handleAddBookmark = async () => {
        setBookmarking(true);
        setBookmarkFeedback(null);
        try {
            const label = prefix ? `${bucketName}/${prefix.replace(/\/$/, '')}` : bucketName;
            const res = await fetch('/api/bookmarks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bucketName, prefix, label }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Gagal menyimpan bookmark');
            setBookmarkFeedback('Tersimpan di Bookmark');
            setTimeout(() => setBookmarkFeedback(null), 2500);
        } catch (err) {
            setErrorMessage(
                err instanceof Error ? err.message : 'Gagal menyimpan bookmark'
            );
        } finally {
            setBookmarking(false);
        }
    };

    const toggleSelect = (key: string) => {
        setSelectedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const prefixSegments = prefix.split('/').filter(Boolean);
    const filteredFolders = folders.filter((f) =>
        f.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredObjects = objects.filter((o) =>
        o.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div
            className="w-full space-y-5 p-4 sm:p-6 lg:p-8"
            onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files?.length) {
                    handleUploadFiles(e.dataTransfer.files);
                }
            }}
        >
            {/* Breadcrumb & Header */}
            <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-base-content/60">
                    <Link href="/buckets" className="hover:text-primary flex items-center gap-1">
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Buckets
                    </Link>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <button
                        onClick={() => setPrefix('')}
                        className={`hover:text-primary font-mono ${prefix === '' ? 'text-base-content font-semibold' : ''}`}
                    >
                        {bucketName}
                    </button>
                    {prefixSegments.map((seg, idx) => {
                        const segPrefix = `${prefixSegments.slice(0, idx + 1).join('/')}/`;
                        const isLast = idx === prefixSegments.length - 1;
                        return (
                            <span key={segPrefix} className="flex items-center gap-1.5">
                                <ChevronRight className="w-3.5 h-3.5" />
                                <button
                                    onClick={() => setPrefix(segPrefix)}
                                    className={`hover:text-primary font-mono ${isLast ? 'text-base-content font-semibold' : ''}`}
                                >
                                    {seg}
                                </button>
                            </span>
                        );
                    })}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight font-mono">
                            {bucketName}
                        </h1>
                        <p className="text-xs text-base-content/60 font-mono">
                            Prefix: /{prefix}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                                if (e.target.files) handleUploadFiles(e.target.files);
                            }}
                        />
                        <button
                            onClick={handleAddBookmark}
                            disabled={bookmarking}
                            className="btn btn-ghost btn-sm gap-1.5"
                            title="Bookmark folder ini"
                        >
                            <Bookmark className="w-4 h-4" />
                            {bookmarkFeedback ?? 'Bookmark'}
                        </button>
                        <button
                            onClick={() => setFolderModalOpen(true)}
                            className="btn btn-outline btn-sm gap-1.5"
                        >
                            <FolderPlus className="w-4 h-4" />
                            New Folder
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="btn btn-primary btn-sm gap-1.5"
                        >
                            {uploading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Upload className="w-4 h-4" />
                            )}
                            {uploading ? 'Uploading...' : 'Upload'}
                        </button>
                    </div>
                </div>
            </div>

            {dragOver && (
                <div className="border-2 border-dashed border-primary bg-primary/5 rounded-lg p-6 text-center text-sm text-primary font-medium">
                    Lepaskan file di sini untuk mengunggah ke /{prefix}
                </div>
            )}

            {errorMessage && (
                <div role="alert" className="alert alert-error text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                </div>
            )}

            {/* Control Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-base-100 p-3 rounded-lg border border-base-200 shadow-sm">
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                    <input
                        type="text"
                        placeholder="Filter file atau folder..."
                        className="input input-bordered w-full pl-9 input-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    {selectedKeys.size > 0 && (
                        <button
                            onClick={() => handleDeleteKeys(Array.from(selectedKeys))}
                            className="btn btn-error btn-xs sm:btn-sm gap-1.5"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Hapus ({selectedKeys.size})
                        </button>
                    )}
                    <button
                        onClick={() => loadObjects(prefix)}
                        disabled={loading}
                        className="btn btn-ghost btn-xs sm:btn-sm gap-1.5"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Object Table */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            ) : (
                <div className="overflow-x-auto bg-base-100 rounded-lg border border-base-200 shadow-sm">
                    <table className="table table-sm w-full">
                        <thead>
                            <tr className="bg-base-200/50">
                                <th className="w-8"></th>
                                <th>Name</th>
                                <th>Size</th>
                                <th>Last Modified</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {prefix !== '' && (
                                <tr className="hover">
                                    <td></td>
                                    <td colSpan={4}>
                                        <button
                                            onClick={() => {
                                                const parent = prefixSegments.slice(0, -1).join('/');
                                                setPrefix(parent ? `${parent}/` : '');
                                            }}
                                            className="flex items-center gap-2 text-xs font-medium hover:text-primary"
                                        >
                                            <Folder className="w-4 h-4 text-base-content/60" />
                                            .. (Kembali)
                                        </button>
                                    </td>
                                </tr>
                            )}

                            {filteredFolders.map((folder) => (
                                <tr key={folder.prefix} className="hover">
                                    <td></td>
                                    <td>
                                        <button
                                            onClick={() => setPrefix(folder.prefix)}
                                            className="flex items-center gap-2 font-medium hover:text-primary"
                                        >
                                            <Folder className="w-4 h-4 text-primary shrink-0" />
                                            <span>{folder.name}/</span>
                                        </button>
                                    </td>
                                    <td className="text-xs text-base-content/50">-</td>
                                    <td className="text-xs text-base-content/50">-</td>
                                    <td className="text-right">
                                        <button
                                            onClick={() => setPrefix(folder.prefix)}
                                            className="btn btn-ghost btn-xs"
                                        >
                                            Open
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {filteredObjects.map((obj) => {
                                const previewKind = isPreviewable(obj.name);
                                const downloadUrl = `/api/buckets/${encodeURIComponent(bucketName)}/objects/download?key=${encodeURIComponent(obj.key)}`;

                                return (
                                    <tr key={obj.key} className="hover">
                                        <td>
                                            <input
                                                type="checkbox"
                                                className="checkbox checkbox-xs"
                                                checked={selectedKeys.has(obj.key)}
                                                onChange={() => toggleSelect(obj.key)}
                                            />
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2 min-w-0">
                                                {getFileIcon(obj.name)}
                                                <span className="truncate max-w-md font-mono text-xs">
                                                    {obj.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="text-xs font-mono">
                                            {formatBytes(obj.size)}
                                        </td>
                                        <td className="text-xs text-base-content/70">
                                            {obj.lastModified
                                                ? new Date(obj.lastModified).toLocaleString('id-ID')
                                                : '-'}
                                        </td>
                                        <td className="text-right space-x-1 whitespace-nowrap">
                                            {previewKind && (
                                                <button
                                                    onClick={() => openPreview(obj)}
                                                    className="btn btn-ghost btn-xs btn-square"
                                                    title="Preview"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            <a
                                                href={downloadUrl}
                                                className="btn btn-ghost btn-xs btn-square"
                                                title="Download"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                            </a>
                                            <button
                                                onClick={() => generatePresignUrl(obj.key, 3600)}
                                                className="btn btn-ghost btn-xs btn-square"
                                                title="Presigned URL"
                                            >
                                                <Link2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() =>
                                                    setCopyModal({
                                                        mode: 'rename',
                                                        sourceKey: obj.key,
                                                        targetKey: obj.key,
                                                    })
                                                }
                                                className="btn btn-ghost btn-xs btn-square"
                                                title="Rename / Copy"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteKeys([obj.key])}
                                                className="btn btn-ghost btn-xs btn-square text-error"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}

                            {filteredFolders.length === 0 && filteredObjects.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-10 text-sm text-base-content/60">
                                        Folder ini kosong. Drag & drop file atau klik Upload untuk menambahkan file.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {isTruncated && nextToken && (
                <div className="flex justify-center">
                    <button
                        onClick={() => loadObjects(prefix, nextToken, true)}
                        disabled={loadingMore}
                        className="btn btn-outline btn-sm gap-2"
                    >
                        {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                        Load More
                    </button>
                </div>
            )}

            {/* New Folder Modal */}
            {folderModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-sm">
                        <h3 className="font-bold text-base mb-3">Buat Folder Baru</h3>
                        <form onSubmit={handleCreateFolder} className="space-y-4">
                            <input
                                type="text"
                                required
                                placeholder="nama-folder"
                                className="input input-bordered input-sm w-full font-mono"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                            />
                            <div className="modal-action">
                                <button
                                    type="button"
                                    onClick={() => setFolderModalOpen(false)}
                                    className="btn btn-sm btn-ghost"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingFolder}
                                    className="btn btn-sm btn-primary"
                                >
                                    {creatingFolder && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Buat
                                </button>
                            </div>
                        </form>
                    </div>
                    <div className="modal-backdrop" onClick={() => setFolderModalOpen(false)}></div>
                </div>
            )}

            {/* Rename / Copy Modal */}
            {copyModal && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-md">
                        <h3 className="font-bold text-base mb-3">Rename / Copy Object</h3>
                        <form onSubmit={handleCopyOrRename} className="space-y-3">
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCopyModal({ ...copyModal, mode: 'rename' })}
                                    className={`btn btn-xs ${copyModal.mode === 'rename' ? 'btn-primary' : 'btn-outline'}`}
                                >
                                    Rename / Move
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCopyModal({ ...copyModal, mode: 'copy' })}
                                    className={`btn btn-xs ${copyModal.mode === 'copy' ? 'btn-primary' : 'btn-outline'}`}
                                >
                                    Copy
                                </button>
                            </div>
                            <input
                                type="text"
                                required
                                className="input input-bordered input-sm w-full font-mono"
                                value={copyModal.targetKey}
                                onChange={(e) =>
                                    setCopyModal({ ...copyModal, targetKey: e.target.value })
                                }
                            />
                            <div className="modal-action">
                                <button
                                    type="button"
                                    onClick={() => setCopyModal(null)}
                                    className="btn btn-sm btn-ghost"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={copying}
                                    className="btn btn-sm btn-primary"
                                >
                                    {copying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                    <div className="modal-backdrop" onClick={() => setCopyModal(null)}></div>
                </div>
            )}

            {/* Presigned URL Modal */}
            {presignModal && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-lg">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-base">Presigned URL</h3>
                            <button
                                onClick={() => setPresignModal(null)}
                                className="btn btn-sm btn-circle btn-ghost"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-xs font-mono text-base-content/70 mb-3 truncate">
                            {presignModal.key}
                        </p>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs">Berlaku:</span>
                            <select
                                className="select select-bordered select-xs"
                                value={presignModal.expiresIn}
                                onChange={(e) =>
                                    generatePresignUrl(presignModal.key, Number(e.target.value))
                                }
                            >
                                <option value={300}>5 Menit</option>
                                <option value={3600}>1 Jam</option>
                                <option value={86400}>24 Jam</option>
                                <option value={604800}>7 Hari</option>
                            </select>
                        </div>
                        {presignModal.loading ? (
                            <div className="flex justify-center py-6">
                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <textarea
                                    readOnly
                                    rows={4}
                                    className="textarea textarea-bordered w-full font-mono text-xs"
                                    value={presignModal.url ?? ''}
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => {
                                            if (presignModal.url) {
                                                navigator.clipboard.writeText(presignModal.url);
                                                setPresignModal({ ...presignModal, copied: true });
                                            }
                                        }}
                                        className="btn btn-sm btn-primary gap-1.5"
                                    >
                                        {presignModal.copied ? (
                                            <Check className="w-4 h-4" />
                                        ) : (
                                            <Copy className="w-4 h-4" />
                                        )}
                                        {presignModal.copied ? 'Tersalin!' : 'Salin URL'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="modal-backdrop" onClick={() => setPresignModal(null)}></div>
                </div>
            )}

            {/* Preview Modal */}
            {previewModal && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-4xl">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-sm font-mono truncate">
                                {previewModal.name}
                            </h3>
                            <button
                                onClick={() => setPreviewModal(null)}
                                className="btn btn-sm btn-circle btn-ghost"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        {previewModal.loading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : previewModal.kind === 'image' ? (
                            <div className="flex justify-center bg-base-200 rounded-lg p-4">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={`/api/buckets/${encodeURIComponent(bucketName)}/objects/download?key=${encodeURIComponent(previewModal.key)}&inline=1`}
                                    alt={previewModal.name}
                                    className="max-h-[70vh] object-contain rounded"
                                />
                            </div>
                        ) : previewModal.kind === 'pdf' ? (
                            <iframe
                                src={`/api/buckets/${encodeURIComponent(bucketName)}/objects/download?key=${encodeURIComponent(previewModal.key)}&inline=1`}
                                className="w-full h-[70vh] rounded border border-base-300"
                            />
                        ) : (
                            <pre className="bg-base-200 p-4 rounded-lg text-xs font-mono overflow-auto max-h-[70vh] whitespace-pre-wrap">
                                {previewModal.textContent}
                            </pre>
                        )}
                    </div>
                    <div className="modal-backdrop" onClick={() => setPreviewModal(null)}></div>
                </div>
            )}
        </div>
    );
}
