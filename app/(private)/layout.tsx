import type { Metadata } from 'next';
import { Database, PanelLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/app/lib/session';
import { LogoutButton } from './_components/logout-button';
import { SidebarNav } from './_components/sidebar-nav';
import { ThemeToggle } from './_components/theme-toggle';

export const metadata: Metadata = {
    title: 'S3 Manager — Object Storage Console',
    description: 'Manage S3-compatible object storage with Bun',
};

export default async function PrivateLayout({ children }: LayoutProps<'/'>) {
    const session = await getSession();
    if (!session) {
        redirect('/');
    }

    return (
        <div className="drawer lg:drawer-open min-h-screen bg-base-200/40">
            <input id="my-drawer-4" type="checkbox" className="drawer-toggle inline" />
            <div className="drawer-content flex flex-col min-w-0">
                {/* Sticky Top Navbar */}
                <nav className="navbar sticky top-0 z-20 w-full bg-base-100/85 backdrop-blur border-b border-base-200 px-3 sm:px-5 justify-between min-h-14">
                    <div className="flex items-center gap-2">
                        <label
                            htmlFor="my-drawer-4"
                            aria-label="open sidebar"
                            className="btn btn-square btn-ghost btn-sm drawer-button"
                        >
                            <PanelLeft className="w-4 h-4" />
                        </label>
                        <span className="text-sm font-semibold tracking-tight lg:hidden">
                            S3 Manager
                        </span>
                        <span className="hidden sm:inline-flex badge badge-ghost badge-sm font-mono text-[11px]">
                            Bun S3 Connector
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <ThemeToggle />
                        <LogoutButton />
                    </div>
                </nav>

                {/* Main Content */}
                <main className="flex-1 w-full max-w-7xl mx-auto">{children}</main>
            </div>

            <div className="drawer-side z-30 is-drawer-close:overflow-visible">
                <label
                    htmlFor="my-drawer-4"
                    aria-label="close sidebar"
                    className="drawer-overlay"
                ></label>
                <aside className="flex min-h-full flex-col bg-base-100 border-r border-base-200 is-drawer-close:w-16 is-drawer-open:w-64 transition-all">
                    {/* Brand Header */}
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 px-4 h-14 border-b border-base-200 shrink-0"
                    >
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary text-primary-content flex items-center justify-center shrink-0 shadow-sm">
                            <Database className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 is-drawer-close:hidden">
                            <div className="font-bold text-sm leading-tight truncate">
                                S3 Manager
                            </div>
                            <div className="text-[11px] text-base-content/60 truncate">
                                Storage Console
                            </div>
                        </div>
                    </Link>

                    <div className="flex-1">
                        <SidebarNav />
                    </div>

                    <div className="p-3 border-t border-base-200 text-[11px] text-base-content/50 is-drawer-close:hidden">
                        S3-Compatible • Biznet Gio Ready
                    </div>
                </aside>
            </div>
        </div>
    );
}
