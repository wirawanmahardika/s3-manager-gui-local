# S3 Manager

Aplikasi web untuk mengelola **S3-compatible Object Storage** (siap pakai untuk **Biznet Gio NEO Object Storage**, MinIO, Cloudflare R2, AWS S3, dll.) menggunakan **Bun** sebagai runtime dan S3 connector.

## Fitur Utama

- **Multi-Connection S3 & Preset Biznet Gio**: Simpan beberapa profil koneksi S3 (dengan enkripsi `AES-256-GCM` untuk `secretAccessKey` di SQLite), uji koneksi (*Test Connection*), dan ganti koneksi aktif kapan saja.
- **Bucket Management**: List bucket, buat bucket baru (Private / Public Read), hapus bucket, serta kelola konfigurasi bucket (**ACL**, **Object Versioning**, **CORS Rules**, dan **Bucket Policy**).
- **File Explorer (`Bun.S3Client`)**:
  - Navigasi folder/prefix dengan breadcrumb dan pagination (*Load More*).
  - Upload multi-file (termasuk drag-and-drop) dan buat folder baru.
  - Download & preview langsung di browser (gambar, PDF, teks/JSON/kode).
  - Generate **Presigned URL** (5 menit – 7 hari).
  - Copy, rename/move, dan hapus objek (single/bulk).
- **Bookmarks & Dashboard**: Simpan jalan pintas folder favorit dan pantau riwayat aktivitas transfer terbaru.
- **Proteksi Akses & Tema**: Login berbasis session JWT + SQLite, serta toggle **Light / Dark Mode**.
- **Always-On dengan Docker**: Berjalan terus di background (`restart: unless-stopped`) dengan database SQLite persisten.

## Stack Teknologi

- **Runtime & S3 Connector**: [Bun](https://bun.sh/) (`Bun.S3Client` untuk operasi objek & `@aws-sdk/client-s3` untuk manajemen bucket)
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database**: SQLite (`bun:sqlite`) + Drizzle ORM
- **UI**: Tailwind CSS v4 + DaisyUI v5 + Lucide Icons

## Konfigurasi Environment

Buat atau sesuaikan file `.env.local` di root project:

```env
USERNAME=admin
PASSWORD=password_anda
DB_FILE_NAME=storage/local.db
SESSION_SECRET=random_secret_string_yang_panjang
# Opsional: kunci terpisah untuk enkripsi secretAccessKey (default memakai SESSION_SECRET)
# ENCRYPTION_KEY=random_encryption_key
```

## Menjalankan dengan Docker (Always-On)

1. Build dan jalankan container di background:
   ```bash
   docker compose up -d --build
   ```
2. Akses melalui browser di:
   ```
   http://localhost:3000
   ```
3. Perintah berguna lainnya:
   ```bash
   # Cek status container
   docker compose ps

   # Lihat log aplikasi
   docker compose logs -f s3manager

   # Hentikan container
   docker compose down
   ```

Database SQLite disimpan di folder `./storage/local.db` melalui volume Docker (`./storage:/app/storage`), sehingga data koneksi dan pengaturan tetap aman saat container di-restart atau di-rebuild.

## Menjalankan di Mode Development

```bash
bun install
bun run dev
```

## Menghubungkan Biznet Gio NEO Object Storage

1. Login ke aplikasi di `http://localhost:3000`.
2. Buka menu **Connections** → klik **Add Connection**.
3. Gunakan preset **Biznet Gio (WJV-1)** (`https://nos.wjv-1.neo.id`) atau **Biznet Gio (JKT-1)** (`https://nos.jkt-1.neo.id`) dengan region `idn` dan `Force Path Style` aktif.
4. Masukkan **Access Key ID** dan **Secret Access Key**, klik **Test Connection**, lalu **Simpan**.
