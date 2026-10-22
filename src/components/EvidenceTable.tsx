"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowUpDown,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Globe,
  Inbox,
  Lock,
  Presentation,
  SearchX,
} from "lucide-react";
import type { DocumentItem } from "@/lib/api";
import {
  categoryStyle,
  formatDateTime,
  formatFileSize,
  matchesQuery,
  relativeTime,
  shortName,
} from "@/lib/uiFormat";
import { Avatar, EmptyState, FilterChip, SearchBox } from "@/components/ListControls";
import DocumentDownloadButton from "@/components/DocumentDownloadButton";

type Visibility = "ALL" | "ALL_TIM" | "TEAM_ONLY";
type SortKey = "newest" | "oldest" | "title";

interface EvidenceTableProps {
  docs: DocumentItem[];
  onPreview: (doc: DocumentItem) => void;
  onUpload?: () => void;
}

function FileIcon({ ext }: { ext: string }) {
  const e = ext.toLowerCase();
  if ([".xlsx", ".xls", ".csv"].includes(e)) return <FileSpreadsheet size={16} className="text-emerald-600" />;
  if ([".pptx", ".ppt"].includes(e)) return <Presentation size={16} className="text-orange-500" />;
  return <FileText size={16} className={e === ".pdf" ? "text-rose-500" : "text-blue-500"} />;
}

function VisibilityBadge({ doc }: { doc: DocumentItem }) {
  return doc.visibility_scope === "ALL_TIM" ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 text-[11px] font-bold whitespace-nowrap">
      <Globe size={11} /> Semua Tim
    </span>
  ) : (
    <span
      className="inline-flex max-w-[180px] items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200 text-[11px] font-bold"
      title={doc.uploaded_by_team_label}
    >
      <Lock size={11} className="flex-shrink-0" />
      <span className="truncate">{doc.uploaded_by_team_label || "Tim terbatas"}</span>
    </span>
  );
}

/** Ringkasan hanya ditampilkan bila menambah informasi (bukan salinan judul). */
function usefulSummary(doc: DocumentItem): string {
  const s = (doc.ai_summary || "").trim();
  return s && s.toLowerCase() !== doc.title.trim().toLowerCase() ? s : "";
}

/** Tabel Evidence lintas tim: pencarian, filter kategori & visibilitas, urutan, dan tampilan kartu di layar sempit. */
export default function EvidenceTable({ docs, onPreview, onUpload }: EvidenceTableProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [visibility, setVisibility] = useState<Visibility>("ALL");
  const [sort, setSort] = useState<SortKey>("newest");

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    docs.forEach((d) => counts.set(d.doc_category, (counts.get(d.doc_category) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [docs]);

  const visible = useMemo(() => {
    const list = docs.filter(
      (d) =>
        (category === "ALL" || d.doc_category === category) &&
        (visibility === "ALL" || d.visibility_scope === visibility) &&
        matchesQuery(query, d.title, d.standardized_name, d.ai_summary, d.uploaded_by_name, d.uploaded_by_team_label, d.audit_tags)
    );
    return list.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title, "id");
      const diff = new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
      return sort === "newest" ? diff : -diff;
    });
  }, [docs, query, category, visibility, sort]);

  const filtered = query !== "" || category !== "ALL" || visibility !== "ALL";
  const resetFilters = () => {
    setQuery("");
    setCategory("ALL");
    setVisibility("ALL");
  };

  if (docs.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm">
        <EmptyState
          icon={<Inbox size={26} />}
          title="Belum ada dokumen evidence"
          description="Dokumen yang diunggah ke menu Evidence menjadi bahan pencarian Agentic AI untuk seluruh tim sesuai visibilitasnya."
          action={
            onUpload && (
              <button
                onClick={onUpload}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                Upload Evidence Pertama
              </button>
            )
          }
        />
      </div>
    );
  }

  const actions = (doc: DocumentItem) => (
    <div className="flex items-center justify-end gap-1.5">
      <button
        onClick={() => onPreview(doc)}
        className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
        title="Lihat dokumen"
      >
        <Eye size={14} /> Lihat
      </button>
      <DocumentDownloadButton
        docId={doc.id}
        filename={doc.standardized_name}
        className="h-8 w-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors"
        title={`Unduh (${formatFileSize(doc.file_size_bytes)})`}
      >
        <Download size={14} />
      </DocumentDownloadButton>
    </div>
  );

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Cari judul, nama file, pengunggah, atau ringkasan…"
            className="md:flex-1"
          />
          <div className="flex items-center gap-2">
            <div className="inline-flex p-1 rounded-xl bg-slate-100 text-xs font-bold">
              {(
                [
                  ["ALL", "Semua"],
                  ["ALL_TIM", "Semua Tim"],
                  ["TEAM_ONLY", "Terbatas"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setVisibility(id)}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    visibility === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="relative">
              <span className="sr-only">Urutkan</span>
              <ArrowUpDown size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="appearance-none pl-7 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="title">Judul A–Z</option>
              </select>
            </label>
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          <FilterChip active={category === "ALL"} onClick={() => setCategory("ALL")} label="Semua kategori" count={docs.length} />
          {categories.map(([cat, n]) => (
            <FilterChip key={cat} active={category === cat} onClick={() => setCategory(cat)} label={cat} count={n} />
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<SearchX size={26} />}
          title="Tidak ada dokumen yang cocok"
          description="Coba kata kunci lain atau hapus filter yang aktif."
          action={
            filtered && (
              <button onClick={resetFilters} className="text-xs font-bold text-blue-600 hover:underline">
                Hapus semua filter
              </button>
            )
          }
        />
      ) : (
        <>
          {/* Tabel (layar lebar) */}
          <table className="hidden md:table w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <th className="py-3 pl-5 pr-3">Dokumen</th>
                <th className="py-3 px-3">Visibilitas</th>
                <th className="py-3 px-3">Diunggah oleh</th>
                <th className="py-3 pl-3 pr-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((doc) => {
                const summary = usefulSummary(doc);
                return (
                  <tr key={doc.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-4 pl-5 pr-3 max-w-xl">
                      <div className="flex items-start gap-3">
                        <span className="w-9 h-9 rounded-xl bg-slate-50 ring-1 ring-slate-200 flex items-center justify-center flex-shrink-0">
                          <FileIcon ext={doc.file_extension} />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ring-1 ${categoryStyle(doc.doc_category)}`}>
                              {doc.doc_category}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">{doc.version_label}</span>
                          </div>
                          <button
                            onClick={() => onPreview(doc)}
                            className="mt-1 block text-left font-bold text-slate-900 hover:text-blue-700 leading-snug"
                          >
                            {doc.title}
                          </button>
                          <p className="text-[11px] font-mono text-slate-400 truncate" title={doc.standardized_name}>
                            {doc.standardized_name}
                          </p>
                          {summary && <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{summary}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <VisibilityBadge doc={doc} />
                    </td>
                    <td className="py-4 px-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={doc.uploaded_by_name} seed={doc.uploaded_by_badge} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate max-w-[180px]" title={doc.uploaded_by_name}>
                            {shortName(doc.uploaded_by_name)}
                          </p>
                          <p className="text-[11px] text-slate-500" title={formatDateTime(doc.uploaded_at)}>
                            {relativeTime(doc.uploaded_at)} · #{doc.uploaded_by_badge}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pl-3 pr-5">{actions(doc)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Kartu (layar sempit) */}
          <ul className="md:hidden divide-y divide-slate-100">
            {visible.map((doc) => (
              <li key={doc.id} className="p-4 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ring-1 ${categoryStyle(doc.doc_category)}`}>
                    {doc.doc_category}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{doc.version_label}</span>
                  <span className="ml-auto">
                    <VisibilityBadge doc={doc} />
                  </span>
                </div>
                <div>
                  <p className="font-bold text-slate-900">{doc.title}</p>
                  <p className="text-[11px] font-mono text-slate-400 truncate">{doc.standardized_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Avatar name={doc.uploaded_by_name} seed={doc.uploaded_by_badge} size="sm" />
                  <p className="text-[11px] text-slate-500 flex-1 min-w-0 truncate">
                    <strong className="text-slate-700">{shortName(doc.uploaded_by_name)}</strong> · {relativeTime(doc.uploaded_at)}
                  </p>
                  {actions(doc)}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 text-[11px] text-slate-500 flex items-center justify-between">
        <span>
          Menampilkan <strong className="text-slate-700">{visible.length}</strong> dari {docs.length} dokumen
        </span>
        {filtered && (
          <button onClick={resetFilters} className="font-bold text-blue-600 hover:underline">
            Reset filter
          </button>
        )}
      </div>
    </div>
  );
}
