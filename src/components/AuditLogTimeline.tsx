"use client";

import React, { useMemo, useState } from "react";
import {
  FolderPlus,
  GitBranch,
  History,
  Layers,
  SearchX,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserCog,
} from "lucide-react";
import type { UploadAuditLog } from "@/lib/api";
import { dayKey, dayLabel, formatDateTime, formatTime, matchesQuery, relativeTime, shortName } from "@/lib/uiFormat";
import { EmptyState, FilterChip, SearchBox } from "@/components/ListControls";

type Group = "ai" | "upload" | "structure" | "admin";

interface ActionMeta {
  label: string;
  group: Group;
  icon: React.ElementType;
  tone: string; // warna ikon & badge
}

const ACTIONS: Record<string, ActionMeta> = {
  AI_SEARCH: { label: "Pencarian AI", group: "ai", icon: Sparkles, tone: "bg-violet-100 text-violet-700" },
  UPLOAD_EVIDENCE: { label: "Upload evidence", group: "upload", icon: Upload, tone: "bg-blue-100 text-blue-700" },
  UPLOAD_APP_DOC: { label: "Upload dokumen aplikasi", group: "upload", icon: Upload, tone: "bg-blue-100 text-blue-700" },
  UPLOAD_VIA_AI: { label: "Upload via Agentic AI", group: "upload", icon: Upload, tone: "bg-sky-100 text-sky-700" },
  CREATE_FOLDER: { label: "Buat folder", group: "structure", icon: FolderPlus, tone: "bg-emerald-100 text-emerald-700" },
  CREATE_APPLICATION: { label: "Daftarkan aplikasi", group: "structure", icon: Layers, tone: "bg-emerald-100 text-emerald-700" },
  CREATE_SECTION: { label: "Tambah section versi", group: "structure", icon: GitBranch, tone: "bg-emerald-100 text-emerald-700" },
  UPDATE_AI_SETTINGS: { label: "Ubah setting AI", group: "admin", icon: Settings2, tone: "bg-amber-100 text-amber-700" },
};

const GROUPS: { id: Group | "ALL"; label: string }[] = [
  { id: "ALL", label: "Semua" },
  { id: "ai", label: "Pencarian AI" },
  { id: "upload", label: "Upload" },
  { id: "structure", label: "Folder & Aplikasi" },
  { id: "admin", label: "Admin & Akses" },
];

const PAGE_SIZE = 40;

function actionMeta(type: string): ActionMeta {
  if (ACTIONS[type]) return ACTIONS[type];
  const label = type.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  if (type.startsWith("DELETE")) return { label, group: "admin", icon: Trash2, tone: "bg-rose-100 text-rose-700" };
  if (type.includes("USER") || type.includes("ACCESS")) return { label, group: "admin", icon: UserCog, tone: "bg-amber-100 text-amber-700" };
  return { label, group: "admin", icon: ShieldCheck, tone: "bg-slate-100 text-slate-700" };
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Detail tanpa pengulangan nama & badge pelaksana di awal kalimat (sudah tampil di baris judul). */
function stripActor(detail: string, userName: string): string {
  return detail
    .replace(new RegExp(`^${escapeRegExp(userName)}\\s*(\\(Badge [^)]*\\))?\\s*`), "")
    .replace(/^\w/, (c) => c.toUpperCase());
}

/** Pencarian AI: ambil teks pertanyaan & jumlah dokumen dari detail log. */
function parseAISearch(detail: string): { query: string; found: string; extra: string } | null {
  const m = detail.match(/mencari di Agentic AI: "([\s\S]*)" \((\d+) dokumen ditemukan\)([\s\S]*)$/);
  return m ? { query: m[1], found: m[2], extra: m[3].trim() } : null;
}

/** Log aktivitas (audit trail) sebagai timeline per hari dengan filter jenis aksi & pencarian. */
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

  const days = useMemo(() => {
    const out: { key: string; label: string; items: UploadAuditLog[] }[] = [];
    visible.slice(0, limit).forEach((l) => {
      const key = dayKey(l.action_timestamp);
      const last = out[out.length - 1];
      if (last?.key === key) last.items.push(l);
      else out.push({ key, label: dayLabel(l.action_timestamp), items: [l] });
    });
    return out;
  }, [visible, limit]);

  const people = useMemo(() => new Set(logs.map((l) => l.badge_number)).size, [logs]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-slate-100">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold mb-2">
              <History size={13} /> Audit Trail
            </span>
            <h2 className="text-2xl font-black text-slate-900">Log Aktivitas</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Siapa melakukan apa dan kapan: upload dokumen, pencarian AI, serta perubahan folder, aplikasi, dan akses.
            </p>
          </div>
          <div className="flex gap-2 text-center">
            <div className="px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200/80">
              <p className="text-lg font-black text-slate-900 tabular-nums leading-none">{logs.length}</p>
              <p className="text-[10px] text-slate-500 mt-1">aktivitas terbaru</p>
            </div>
            <div className="px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200/80">
              <p className="text-lg font-black text-slate-900 tabular-nums leading-none">{people}</p>
              <p className="text-[10px] text-slate-500 mt-1">pengguna</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col lg:flex-row lg:items-center gap-3">
          <SearchBox
            value={query}
            onChange={(v) => {
              setQuery(v);
              setLimit(PAGE_SIZE);
            }}
            placeholder="Cari nama, badge, aplikasi, atau isi aktivitas…"
            className="lg:w-96"
          />
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            {GROUPS.map((g) => (
              <FilterChip
                key={g.id}
                active={group === g.id}
                onClick={() => {
                  setGroup(g.id);
                  setLimit(PAGE_SIZE);
                }}
                label={g.label}
                count={counts[g.id] ?? 0}
              />
            ))}
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={logs.length === 0 ? <History size={26} /> : <SearchX size={26} />}
          title={logs.length === 0 ? "Belum ada aktivitas" : "Tidak ada aktivitas yang cocok"}
          description={logs.length === 0 ? "Aktivitas upload, pencarian AI, dan perubahan data akan tercatat di sini." : "Coba kata kunci atau filter lain."}
        />
      ) : (
        <div className="px-5 sm:px-6 pb-6">
          {days.map((day) => (
            <section key={day.key}>
              <h3 className="sticky top-0 z-10 bg-white/95 backdrop-blur py-3 text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                {day.label}
                <span className="h-px flex-1 bg-slate-100" />
                <span className="font-bold normal-case tracking-normal">{day.items.length} aktivitas</span>
              </h3>
              <ol className="relative">
                {day.items.map((lg, i) => {
                  const meta = actionMeta(lg.action_type);
                  const Icon = meta.icon;
                  const detail = stripActor(lg.detail_description, lg.user_name);
                  const search = lg.action_type === "AI_SEARCH" ? parseAISearch(detail) : null;
                  const location = [lg.app_name || lg.folder_name, lg.section_version, lg.document_title].filter(Boolean).join(" › ");
                  return (
                    <li key={lg.id} className="relative flex gap-3.5 pb-5 last:pb-1">
                      {i < day.items.length - 1 && <span className="absolute left-[17px] top-10 bottom-0 w-px bg-slate-100" />}
                      <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${meta.tone}`}>
                        <Icon size={15} />
                      </span>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="font-bold text-sm text-slate-900">{shortName(lg.user_name)}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${meta.tone}`}>{meta.label}</span>
                          <span
                            className="ml-auto text-[11px] text-slate-400 tabular-nums whitespace-nowrap"
                            title={`${formatDateTime(lg.action_timestamp)} (${relativeTime(lg.action_timestamp)})`}
                          >
                            {formatTime(lg.action_timestamp)}
                          </span>
                        </div>

                        {search ? (
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <span className="px-3 py-1.5 rounded-xl rounded-tl-sm bg-violet-50 text-sm text-slate-800 border border-violet-100 max-w-full break-words">
                              “{search.query}”
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                              → {search.found} dokumen ditemukan
                            </span>
                            {search.extra && <span className="text-[11px] text-slate-400">{search.extra}</span>}
                          </div>
                        ) : (
                          <p className="mt-1 text-sm text-slate-600 leading-relaxed break-words">{detail}</p>
                        )}

                        <p className="mt-1.5 text-[11px] text-slate-400 flex flex-wrap gap-x-2">
                          <span>#{lg.badge_number}</span>
                          {lg.team_and_branch_label && <span>· {lg.team_and_branch_label}</span>}
                          {location && <span className="text-slate-500">· {location}</span>}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}

          {visible.length > limit && (
            <div className="pt-2 text-center">
              <button
                onClick={() => setLimit((n) => n + PAGE_SIZE)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
              >
                Tampilkan {Math.min(PAGE_SIZE, visible.length - limit)} aktivitas lagi
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
