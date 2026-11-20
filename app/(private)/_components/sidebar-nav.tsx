'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Database, LayoutDashboard, Plug, Settings } from 'lucide-react';

const NAV_ITEMS = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/buckets', label: 'Buckets', icon: Database },
    { href: '/connections', label: 'Connections', icon: Plug },
    { href: '/settings', label: 'Settings', icon: Settings },
];

export function SidebarNav() {
    const pathname = usePathname();

    return (
        <ul className="menu w-full gap-1 px-2 py-3">
            {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                    <li key={item.href}>
                        <Link
                            href={item.href}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors is-drawer-close:tooltip is-drawer-close:tooltip-right ${
                                isActive
                                    ? 'bg-primary text-primary-content shadow-sm'
                                    : 'text-base-content/80 hover:bg-base-300/60 hover:text-base-content'
                            }`}
                            data-tip={item.label}
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="is-drawer-close:hidden">{item.label}</span>
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
}
