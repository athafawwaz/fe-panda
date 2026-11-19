"use client";

import React, { useMemo, useState } from "react";
import { Download, History } from "lucide-react";
import type { UploadAuditLog } from "@/lib/api";
import { formatDateTime, matchesQuery, shortName } from "@/lib/uiFormat";
import { toCsv } from "@/lib/csv";
import { EmptyState, FilterChip, SearchBox } from "@/components/ListControls";

type Group = "search" | "upload" | "structure" | "admin";

const ACTIONS: Record<string, { label: string; group: Group }> = {
  AI_SEARCH: { label: "Pencarian", group: "search" },
  UPLOAD_EVIDENCE: { label: "Unggah evidence", group: "upload" },
  UPLOAD_APP_DOC: { label: "Unggah dokumen aplikasi", group: "upload" },
  UPLOAD_VIA_AI: { label: "Unggah lewat asisten", group: "upload" },
  CREATE_FOLDER: { label: "Buat folder", group: "structure" },
  CREATE_APPLICATION: { label: "Daftarkan aplikasi", group: "structure" },
  CREATE_SECTION: { label: "Tambah versi", group: "structure" },
  UPDATE_AI_SETTINGS: { label: "Ubah pengaturan asisten", group: "admin" },
};

const GROUPS: { id: Group | "ALL"; label: string }[] = [
  { id: "ALL", label: "Semua" },
  { id: "upload", label: "Unggahan" },
  { id: "structure", label: "Folder & aplikasi" },
  { id: "admin", label: "Admin & akses" },
  { id: "search", label: "Pencarian" },
];

const PAGE_SIZE = 50;

export function actionMeta(type: string) {
  if (ACTIONS[type]) return ACTIONS[type];
  const label = type.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  return { label, group: "admin" as Group };
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Detail tanpa nama & badge pelaksana di awal kalimat (sudah ada di kolom sendiri). */
function stripActor(detail: string, userName: string): string {
  return detail.replace(new RegExp(`^${escapeRegExp(userName)}\\s*(\\(Badge [^)]*\\))?\\s*`), "").replace(/^\w/, (c) => c.toUpperCase());
}


/** Log aktivitas sebagai tabel audit: waktu persis, pelaku, aksi, objek, dan ekspor CSV dari data yang sedang difilter. */
export default function AuditLogTimeline({ logs }: { logs: UploadAuditLog[] }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<Group | "ALL">("ALL");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: logs.length };
    logs.forEach((l) => {
      const g = actionMeta(l.action_type).group;
      c[g] = (c[g] ?? 0) + 1;
    });
    return c;
  }, [logs]);

  const visible = useMemo(
    () =>
      logs.filter(
        (l) =>
          (group === "ALL" || actionMeta(l.action_type).group === group) &&
          matchesQuery(query, l.user_name, l.badge_number, l.detail_description, l.app_name, l.folder_name, l.document_title, l.team_and_branch_label)
      ),
    [logs, query, group]
  );

  const exportCsv = () => {
    const rows = [
      ["Waktu (ISO 8601)", "Badge", "Nama", "Tim", "Aksi", "Objek", "Detail"],
      ...visible.map((l) => [
        l.action_timestamp,
        l.badge_number,
        l.user_name,
        l.team_and_branch_label || "",
        actionMeta(l.action_type).label,
        [l.app_name || l.folder_name, l.section_version, l.document_title].filter(Boolean).join(" / "),
        l.detail_description,
      ]),
    ];
    const url = URL.createObjectURL(new Blob(["\ufeff" + toCsv(rows)], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `panda-log-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-stack">
      <header className="page-head">
        <div>
          <h1>Log aktivitas</h1>
          <p>Jejak siapa melakukan apa dan kapan. Gunakan sebagai lampiran bukti audit.</p>
        </div>
        <button className="btn-secondary" onClick={exportCsv} disabled={visible.length === 0}>
          <Download size={16} aria-hidden /> Ekspor CSV
        </button>
      </header>

      <section className="data-panel" aria-label="Daftar aktivitas">
        <div className="data-toolbar">
          <SearchBox value={query} onChange={(v) => { setQuery(v); setLimit(PAGE_SIZE); }} placeholder="Cari nama, badge, aplikasi, atau isi aktivitas" className="data-search" />
        </div>
        <div className="data-chips" role="group" aria-label="Jenis aktivitas">
          {GROUPS.map((g) => (
            <FilterChip key={g.id} active={group === g.id} onClick={() => { setGroup(g.id); setLimit(PAGE_SIZE); }} label={g.label} count={counts[g.id] ?? 0} />
          ))}
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={<History size={24} />}
            title={logs.length === 0 ? "Belum ada aktivitas" : "Tidak ada aktivitas yang cocok"}
            description={logs.length === 0 ? "Unggahan, pencarian, dan perubahan data tercatat di sini." : "Coba kata kunci atau filter lain."}
          />
        ) : (
          <table className="data-table is-top">
            <thead>
              <tr>
                <th scope="col">Waktu</th>
                <th scope="col">Pelaku</th>
                <th scope="col">Aksi</th>
                <th scope="col">Detail</th>
              </tr>
            </thead>
            <tbody>
              {visible.slice(0, limit).map((lg) => {
                const location = [lg.app_name || lg.folder_name, lg.section_version, lg.document_title].filter(Boolean).join(" / ");
                return (
                  <tr key={lg.id}>
                    <td className="nowrap"><time dateTime={lg.action_timestamp}>{formatDateTime(lg.action_timestamp)}</time></td>
                    <td>
                      {shortName(lg.user_name)}
                      <span className="row-sub">Badge {lg.badge_number}{lg.team_and_branch_label ? ` · ${lg.team_and_branch_label}` : ""}</span>
                    </td>
                    <td className="nowrap">{actionMeta(lg.action_type).label}</td>
                    <td>
                      <span className="log-detail">{stripActor(lg.detail_description, lg.user_name)}</span>
                      {location && <span className="row-sub">{location}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <footer className="data-foot">
          <span>{Math.min(limit, visible.length)} dari {visible.length} aktivitas</span>
          {visible.length > limit && <button className="link-btn" onClick={() => setLimit((n) => n + PAGE_SIZE)}>Tampilkan {Math.min(PAGE_SIZE, visible.length - limit)} lagi</button>}
        </footer>
      </section>
    </div>
  );
}
