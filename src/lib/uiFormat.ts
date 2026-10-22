// Helper tampilan bersama: waktu, avatar inisial, warna kategori dokumen.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "baru saja", "5 menit lalu", "3 jam lalu", "kemarin", "4 hari lalu", lalu tanggal. */
export function relativeTime(iso: string, now = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "-";
  if (diff < MINUTE) return "baru saja";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} menit lalu`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} jam lalu`;
  if (diff < 2 * DAY) return "kemarin";
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

/** "19 Okt 2026, 22.18 WIB" — dipakai sebagai tooltip waktu persis. */
export function formatDateTime(iso: string): string {
  return `${new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })} WIB`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

/** Judul grup per hari: "Hari ini", "Kemarin", atau "Senin, 12 Okt 2026". */
export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(now) - start(d)) / DAY);
  if (days === 0) return "Hari ini";
  if (days === 1) return "Kemarin";
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
}

export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Inisial nama tanpa keterangan dalam kurung: "Atha Fawwaz (Super Admin)" → "AF". */
export function initials(name: string): string {
  const words = name.replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "?") + (words[1]?.[0] ?? "")).toUpperCase();
}

/** Nama tanpa keterangan dalam kurung, untuk ditampilkan satu baris. */
export function shortName(name: string): string {
  return name.replace(/\s*\(.*?\)\s*/g, " ").trim() || name;
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return "-";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB`;
}

/** Pencocokan pencarian sederhana: semua kata harus ada di salah satu teks (tidak peka huruf besar). */
export function matchesQuery(query: string, ...fields: (string | undefined | null)[]): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fields.filter(Boolean).join(" ").toLowerCase();
  return words.every((w) => haystack.includes(w));
}

const APP_STATUS: Record<string, string> = { PRODUCTION: "Produksi", DEVELOPMENT: "Pengembangan", RETIRED: "Tidak aktif" };
/** Label status aplikasi untuk pengguna; nilai yang tidak dikenal ditampilkan apa adanya. */
export function appStatusLabel(status: string): string {
  return APP_STATUS[status] ?? status;
}
