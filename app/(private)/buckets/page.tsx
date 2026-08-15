'use client';

import { useState } from 'react';
import {
    Folder,
    Plus,
    Search,
    MoreVertical,
    Globe,
    Lock,
    Trash2,
    LayoutGrid,
    List,
    SlidersHorizontal,
    HardDrive,
    Database,
    ChevronRight,
} from 'lucide-react';

const mockBuckets = [
    {
        id: '1',
        name: 'production-assets-v2',
        region: 'ap-southeast-1',
        access: 'Public',
        size: '142.5 GB',
        objects: 12450,
        createdAt: '2025-10-12',
    },
    {
        id: '2',
        name: 'user-backups-db',
        region: 'us-east-1',
        access: 'Private',
        size: '1.2 TB',
        objects: 450,
        createdAt: '2024-03-01',
    },
    {
        id: '3',
        name: 'media-uploads-raw',
        region: 'eu-central-1',
        access: 'Public',
        size: '64.1 GB',
        objects: 8900,
        createdAt: '2026-01-15',
    },
    {
        id: '4',
        name: 'logs-archive-2025',
        region: 'ap-southeast-1',
        access: 'Private',
        size: '320.8 GB',
        objects: 54100,
        createdAt: '2025-05-20',
    },
    {
        id: '5',
        name: 'staging-app-static',
        region: 'us-west-2',
        access: 'Private',
        size: '1.4 GB',
        objects: 120,
        createdAt: '2026-02-10',
    },
];

export default function Bucket() {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    const filteredBuckets = mockBuckets.filter(
        (b) =>
            b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.region.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
            {/* Admin Breadcrumbs & Header */}
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-base-content/60">
                    <span>Dashboard</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span>Storage</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className="text-base-content font-medium">S3 Buckets</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Bucket Storage</h1>
                        <p className="text-sm text-base-content/70">
                            Kelola dan pantau seluruh bucket Amazon S3 di region aktif.
                        </p>
                    </div>
                    <button className="btn btn-primary btn-sm sm:btn-md gap-2">
                        <Plus className="w-4 h-4" />
                        Create Bucket
                    </button>
                </div>
            </div>

            {/* Admin Quick Metrics */}
            <div className="stats stats-vertical sm:stats-horizontal shadow-sm w-full bg-base-100 border border-base-200">
                <div className="stat">
                    <div className="stat-figure text-primary">
                        <Folder className="w-7 h-7" />
                    </div>
                    <div className="stat-title text-xs">Total Buckets</div>
                    <div className="stat-value text-2xl">{mockBuckets.length}</div>
                    <div className="stat-desc">5 Active Regions</div>
                </div>
                <div className="stat">
                    <div className="stat-figure text-secondary">
                        <HardDrive className="w-7 h-7" />
                    </div>
                    <div className="stat-title text-xs">Total Capacity Used</div>
                    <div className="stat-value text-2xl">1.72 TB</div>
                    <div className="stat-desc">+12% dari bulan lalu</div>
                </div>
                <div className="stat">
                    <div className="stat-figure text-accent">
                        <Database className="w-7 h-7" />
                    </div>
                    <div className="stat-title text-xs">Total Stored Objects</div>
                    <div className="stat-value text-2xl">76,020</div>
                    <div className="stat-desc">across all buckets</div>
                </div>
            </div>

            {/* Control Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-base-100 p-3 rounded-lg border border-base-200 shadow-sm">
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                    <input
                        type="text"
                        placeholder="Cari nama bucket atau region..."
                        className="input input-bordered w-full pl-9 input-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
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

            {/* Content Grid / Table */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                    {filteredBuckets.map((bucket) => (
                        <div
                            key={bucket.id}
                            className="card bg-base-100 border border-base-200 shadow-sm hover:border-base-300 transition-all"
                        >
                            <div className="card-body p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                                            <Folder className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3
                                                className="font-semibold text-sm truncate"
                                                title={bucket.name}
                                            >
                                                {bucket.name}
                                            </h3>
                                            <span className="text-xs text-base-content/60 font-mono">
                                                {bucket.region}
                                            </span>
                                        </div>
                                    </div>

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
                                                <a>
                                                    <SlidersHorizontal className="w-3.5 h-3.5" />{' '}
                                                    Bucket Settings
                                                </a>
                                            </li>
                                            <li className="text-error">
                                                <a>
                                                    <Trash2 className="w-3.5 h-3.5" /> Delete Bucket
                                                </a>
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span
                                        className={`badge badge-sm ${bucket.access === 'Public' ? 'badge-warning' : 'badge-ghost'} gap-1 text-[11px]`}
                                    >
                                        {bucket.access === 'Public' ? (
                                            <Globe className="w-3 h-3" />
                                        ) : (
                                            <Lock className="w-3 h-3" />
                                        )}
                                        {bucket.access}
                                    </span>
                                </div>

                                <div className="divider my-0"></div>

                                <div className="grid grid-cols-2 text-xs text-base-content/70 pt-1">
                                    <div>
                                        <p className="font-semibold text-base-content">
                                            {bucket.size}
                                        </p>
                                        <p className="text-[11px]">Size</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-base-content">
                                            {bucket.objects.toLocaleString('en-US')}
                                        </p>
                                        <p className="text-[11px]">Objects</p>
                                    </div>
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
                                <th>Access</th>
                                <th>Size</th>
                                <th>Objects</th>
                                <th>Created Date</th>
                                <th className="text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredBuckets.map((bucket) => (
                                <tr key={bucket.id} className="hover">
                                    <td className="font-medium flex items-center gap-2">
                                        <Folder className="w-4 h-4 text-primary shrink-0" />
                                        <span className="truncate max-w-50">{bucket.name}</span>
                                    </td>
                                    <td className="font-mono text-xs">{bucket.region}</td>
                                    <td>
                                        <span
                                            className={`badge badge-sm ${bucket.access === 'Public' ? 'badge-warning' : 'badge-ghost'} gap-1 text-[11px]`}
                                        >
                                            {bucket.access === 'Public' ? (
                                                <Globe className="w-3 h-3" />
                                            ) : (
                                                <Lock className="w-3 h-3" />
                                            )}
                                            {bucket.access}
                                        </span>
                                    </td>
                                    <td className="text-xs">{bucket.size}</td>
                                    <td className="text-xs font-mono">
                                        {bucket.objects.toLocaleString('en-US')}
                                    </td>
                                    <td className="text-xs">{bucket.createdAt}</td>
                                    <td className="text-right">
                                        <button className="btn btn-ghost btn-xs">Manage</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
