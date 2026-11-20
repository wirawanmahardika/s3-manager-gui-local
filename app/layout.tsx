import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'S3 Manager — Object Storage Console',
    description: 'Manage S3-compatible object storage (Biznet Gio, MinIO, R2, AWS S3) with Bun',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
    return (
        <html
            lang="id"
            suppressHydrationWarning
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        >
            <body className="min-h-full flex flex-col bg-base-200/40 text-base-content">
                {children}
            </body>
        </html>
    );
}
