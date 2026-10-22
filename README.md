# PANDA — Frontend

Portal dokumen audit TI: dashboard, folder aplikasi, evidence, audit log, upload berbantuan AI, dan chat pencarian dokumen. Dibangun dengan Next.js 15, React 19, TypeScript, dan Tailwind CSS.

Backend pendamping: [be-panda](https://github.com/athafawwaz/be-panda). Database yang dipakai backend adalah PostgreSQL; frontend tidak mengakses database secara langsung.

> PoC: login bersama masih dipertahankan. Jangan ekspos deployment ini ke internet sebelum autentikasi dan dependency diaudit. Next.js `15.1.6` pada lockfile saat ini mendapat peringatan keamanan dari npm dan belum di-upgrade.

## Setup lokal

Gunakan Node.js 22 LTS dan npm. Dari root frontend:

```bash
npm ci
cp .env.example .env.local
npm run dev -- -H 127.0.0.1
```

Buka `http://127.0.0.1:3000`. Dev server mendukung hot reload. Flag host di atas membatasi akses ke localhost; script `npm run dev` tanpa flag tersebut mendengarkan `0.0.0.0`.

Jalankan backend di port `8080`; petunjuk Docker PostgreSQL, migrasi, dan seed ada di README backend. Akun awal default PoC: badge `2411249`, password `Panda`. Akun tersebut baru tersedia setelah backend berhasil menjalankan seed.

## Konfigurasi API

```dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:8080/api/v1
```

- Di browser, URL localhost/127.0.0.1 diarahkan melalui `/api/v1` pada origin frontend.
- Proxy di `next.config.mjs` meneruskan request ke `http://127.0.0.1:8080/api/v1`. Mengubah URL lokal dalam env saja tidak mengubah target proxy.
- Untuk backend remote, gunakan URL HTTPS lengkap yang dapat diakses browser, termasuk `/api/v1`, tanpa trailing slash. Pastikan CORS backend sesuai.
- `NEXT_PUBLIC_*` bersifat publik; jangan menyimpan password database, JWT secret, atau API key AI di frontend.
- Restart dev server setelah perubahan env. Untuk deployment, build ulang.

## Menjalankan lewat tool `proc`

Panggilan ini untuk agent yang menyediakan `proc`, bukan perintah shell:

```json
{
  "action": "start",
  "command": "npm run dev -- -H 127.0.0.1",
  "cwd": "/path/to/frontend",
  "name": "PANDA frontend hot reload"
}
```

Gunakan handle `proc-*` hasilnya pada `action: "logs"` atau `action: "stop"`.

## Verifikasi dan build

```bash
./node_modules/.bin/tsc --noEmit
node --test tests/*.test.mjs
npm run build
npm run start -- -H 127.0.0.1
```

Tes Node menjalankan source TypeScript yang ditranspilasi. Tes unduhan memeriksa Bearer/impersonation dan blob URL. Tes race mensimulasikan request/SSE tertunda untuk remount upload, pergantian sesi, New Chat, unmount, dan Stop. State/hooks React pada tes race memakai stand-in, sehingga tetap perlu uji browser nyata.

## Alur dan keamanan

- Token login dan pilihan impersonation disimpan di localStorage. Ini belum merupakan strategi sesi produksi yang diperkeras terhadap XSS.
- Preview/download menggunakan fetch ber-Bearer dan header impersonation, bukan token di URL. Blob URL dibersihkan setelah digunakan.
- Perpindahan chat membatalkan request lama dan mengabaikan respons yang sudah tidak relevan.
- Kartu upload yang dibuka ulang menunggu request analisis yang sama. Cache hanya bertahan selama halaman/browser belum di-refresh.
- Aturan role dan isolasi tim tetap wajib ditegakkan backend; menyembunyikan tombol bukan kontrol keamanan.

## Troubleshooting

| Gejala | Langkah |
| --- | --- |
| `next: not found` | Jalankan `npm ci` dari root frontend. |
| Login menampilkan `500` dan log proxy `ECONNREFUSED` | Backend belum dapat diakses di `127.0.0.1:8080`; cek DB, konfigurasi, migrasi, dan proses backend. |
| Login `401` / `403` | Periksa badge, password PoC, status akun, dan seed backend. |
| Dokumen `401` / `404` | Token kedaluwarsa atau dokumen di luar scope; link dokumen bukan URL publik. |
| Preview Office tidak tampil | Iframe mengandalkan viewer browser; unduh file dan buka dengan aplikasi yang mendukung. |
| Port `3000` sudah dipakai | Hentikan proses dev lama atau pilih port lain lewat opsi Next.js. |

## Struktur

```text
src/app/             Halaman, layout, dan workspace dashboard
src/components/      UI dokumen, upload, tabel, dan pengaturan
src/lib/api.ts       Tipe API, autentikasi, SSE, dan unduhan
public/              Aset statis
tests/               Tes regresi Node tanpa framework tambahan
```
