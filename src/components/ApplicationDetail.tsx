"use client";

import React from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Folder,
  GitBranch,
  Layers,
  Plus,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import { Avatar, EmptyState } from "@/components/ListControls";
import { categoryStyle, formatDateTime, shortName } from "@/lib/uiFormat";
import type { AppChangeSection, AppFolder, ApplicationItem, DocumentItem } from "@/lib/api";

/** Dokumen inti yang diharapkan ada di setiap section (panduan tampilan, bukan aturan wajib server). */
const CORE_INITIAL = ["PRD", "FSD", "UAT", "BAST"];
const CORE_CHANGE = ["PRD", "UAT", "BAST"];

const STATUS_STYLE: Record<string, string> = {
  PRODUCTION: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DEVELOPMENT: "bg-amber-50 text-amber-700 border-amber-200",
  RETIRED: "bg-slate-100 text-slate-600 border-slate-200",
};

interface Props {
  app: ApplicationItem;
  folder: AppFolder | null;
  activeSectionId: string;
  onSelectSection: (id: string) => void;
  onBackToFolders: () => void;
  onBackToFolder: () => void;
  onAddSection: () => void;
  onUpload: (category: string) => void;
  onPreview: (doc: DocumentItem) => void;
  downloadUrl: (id: string) => string;
}

export default function ApplicationDetail({
  app,
  folder,
  activeSectionId,
  onSelectSection,
  onBackToFolders,
  onBackToFolder,
  onAddSection,
  onUpload,
  onPreview,
  downloadUrl,
}: Props) {
  const sections = app.sections || [];
  const active: AppChangeSection | undefined = sections.find((s) => s.id === activeSectionId) || sections[0];
  const docs = active?.documents || [];
  const totalDocs = sections.reduce((n, s) => n + (s.documents?.length || 0), 0);
  const core = active?.is_initial_release ? CORE_INITIAL : CORE_CHANGE;
  const present = new Set(docs.map((d) => d.doc_category));
  const coreDone = core.filter((c) => present.has(c)).length;
  const teamLabel = folder?.assigned_team
    ? `${folder.assigned_team.team_name}${folder.assigned_branch ? ` • ${folder.assigned_branch.branch_name}` : ""}`
    : "-";

  const docActions = (doc: DocumentItem) => (
    <div className="flex items-center justify-end gap-1.5">
      <button
        onClick={() => onPreview(doc)}
        className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
        title="Lihat dokumen"
      >
        <Eye size={14} /> Lihat
      </button>
      <a
        href={downloadUrl(doc.id)}
        className="h-8 w-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors"
        title="Unduh dokumen"
      >
        <Download size={14} />
      </a>
    </div>
  );

  const categoryPill = (cat: string) => (
    <span className={`inline-block px-2.5 py-1 rounded-lg ring-1 text-[10px] font-black ${categoryStyle(cat)}`}>{cat}</span>
  );

  return (
    <div className="space-y-6">
      {/* Header aplikasi */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <nav className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-400 mb-4" aria-label="Breadcrumb">
          <button onClick={onBackToFolders} className="flex items-center gap-1.5 text-blue-600 hover:underline">
            <Folder size={13} /> Semua Folder Tim
          </button>
          {folder && (
            <>
              <ChevronRight size={13} />
              <button onClick={onBackToFolder} className="text-blue-600 hover:underline">
                {folder.folder_name}
              </button>
            </>
          )}
          <ChevronRight size={13} />
          <span className="text-slate-700">{app.app_name}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <button
              onClick={onBackToFolder}
              className="mt-1 h-9 w-9 rounded-xl border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 flex items-center justify-center flex-shrink-0"
              title={`Kembali ke ${folder?.folder_name || "folder"}`}
            >
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-lg bg-blue-600 text-white text-[11px] font-black">{app.app_code}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${
                    STATUS_STYLE[app.status] || STATUS_STYLE.RETIRED
                  }`}
                >
                  {app.status}
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 leading-tight">{app.app_name}</h2>
              {app.description && <p className="text-xs text-slate-500 mt-1 max-w-2xl">{app.description}</p>}
            </div>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {[
            { icon: <Users size={15} />, label: "Tim pemilik", value: teamLabel },
            { icon: <Layers size={15} />, label: "Jumlah versi", value: `${sections.length} section` },
            { icon: <FileText size={15} />, label: "Total dokumen", value: `${totalDocs} dokumen` },
            { icon: <UserRound size={15} />, label: "Didaftarkan oleh", value: shortName(app.created_by_name) },
          ].map((m) => (
            <div key={m.label} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/60 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-white text-blue-600 border border-slate-200/80 flex items-center justify-center flex-shrink-0">
                {m.icon}
              </span>
              <div className="min-w-0">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{m.label}</dt>
                <dd className="font-bold text-slate-800 leading-snug break-words line-clamp-2" title={m.value}>
                  {m.value}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </div>

      {/* Riwayat versi */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 pb-4">
          <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
            <GitBranch size={16} className="text-blue-600" /> Riwayat Versi
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Setiap perubahan aplikasi punya section sendiri. Dokumen versi awal tidak pernah tertimpa.
          </p>
        </div>

        <div className="px-5 pb-1 flex gap-2 overflow-x-auto" role="tablist">
          {sections.map((sec) => {
            const isActive = sec.id === active?.id;
            return (
              <button
                key={sec.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelectSection(sec.id)}
                className={`flex-shrink-0 max-w-[16rem] px-4 py-2.5 rounded-2xl border text-left transition-all ${
                  isActive
                    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/25"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-xs font-black">{sec.version_label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums ${
                      isActive ? "bg-white/20 text-white" : "bg-white text-slate-500 border border-slate-200"
                    }`}
                  >
                    {sec.documents?.length || 0} dok
                  </span>
                </span>
                <span className={`block text-[11px] truncate mt-0.5 ${isActive ? "text-blue-100" : "text-slate-500"}`}>
                  {sec.section_title}
                </span>
              </button>
            );
          })}
          <button
            onClick={onAddSection}
            className="flex-shrink-0 px-4 py-2.5 rounded-2xl border border-dashed border-blue-300 text-blue-700 hover:bg-blue-50 text-xs font-bold flex items-center gap-1.5"
          >
            <Plus size={14} /> Versi Baru
          </button>
        </div>

        {active && (
          <div className="m-5 mt-4 p-4 rounded-2xl bg-blue-50/60 border border-blue-100 grid md:grid-cols-[minmax(0,1fr)_auto] gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-bold text-slate-900 text-sm">
                  {active.version_label} · {active.section_title}
                </h4>
                {active.is_initial_release && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Rilis awal
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1">{active.change_description || "Tidak ada deskripsi perubahan."}</p>
            </div>
            <dl className="flex flex-wrap md:flex-col gap-x-6 gap-y-1.5 text-[11px] text-slate-500 md:text-right">
              <div className="flex md:justify-end items-center gap-1.5">
                <CalendarDays size={12} className="text-slate-400" />
                <dt>Rilis</dt>
                <dd className="font-bold text-slate-700">{active.release_date || "-"}</dd>
              </div>
              <div className="flex md:justify-end items-center gap-1.5">
                <UserRound size={12} className="text-slate-400" />
                <dt className="sr-only">Dibuat oleh</dt>
                <dd>
                  <span className="font-bold text-slate-700">{shortName(active.created_by_name)}</span> · {active.created_by_badge}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      {/* Dokumen section aktif */}
      {active && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Dokumen <span className="text-blue-600">{active.version_label}</span>
                </h3>
                <p className="text-[11px] text-slate-500">PRD, FSD, UAT, BAST, dan dokumen pendukung pada versi ini.</p>
              </div>
              {docs.length > 0 && (
                <button
                  onClick={() => onUpload(core.find((c) => !present.has(c)) || "LAINNYA")}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
                >
                  <Upload size={14} /> Upload Dokumen
                </button>
              )}
            </div>

            {/* Checklist dokumen inti */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 mr-1">
                Dokumen inti <span className="tabular-nums text-slate-800">{coreDone}/{core.length}</span>
              </span>
              {core.map((cat) =>
                present.has(cat) ? (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold"
                  >
                    <Check size={12} /> {cat}
                  </span>
                ) : (
                  <button
                    key={cat}
                    onClick={() => onUpload(cat)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 text-[11px] font-bold"
                    title={`Upload ${cat} ke ${active.version_label}`}
                  >
                    <Plus size={12} /> {cat}
                  </button>
                )
              )}
            </div>
          </div>

          {docs.length === 0 ? (
            <EmptyState
              icon={<FileText size={26} />}
              title={`Belum ada dokumen di ${active.version_label}`}
              description="Unggah dokumen kelengkapan untuk versi ini, atau klik kategori di atas untuk langsung memilih jenisnya."
              action={
                <button
                  onClick={() => onUpload(core[0])}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-2"
                >
                  <Upload size={14} /> Upload Dokumen Pertama
                </button>
              }
            />
          ) : (
            <>
              <table className="hidden md:table w-full text-left">
                <thead>
                  <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    <th className="py-3 pl-5 pr-3">Dokumen</th>
                    <th className="py-3 px-3 hidden lg:table-cell">Ringkasan</th>
                    <th className="py-3 px-3">Diunggah</th>
                    <th className="py-3 pl-3 pr-5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {docs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/70 align-top">
                      <td className="py-3.5 pl-5 pr-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {categoryPill(doc.doc_category)}
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900">{doc.title}</p>
                            <p className="text-[11px] font-mono text-slate-400 break-all">{doc.standardized_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 hidden lg:table-cell max-w-xs">
                        <p className="text-slate-600 line-clamp-2">{doc.ai_summary}</p>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={doc.uploaded_by_name} seed={doc.uploaded_by_badge} size="sm" />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate">{doc.uploaded_by_name}</p>
                            <p className="text-[11px] text-slate-400 whitespace-nowrap">{formatDateTime(doc.uploaded_at)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 pl-3 pr-5">{docActions(doc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <ul className="md:hidden divide-y divide-slate-100">
                {docs.map((doc) => (
                  <li key={doc.id} className="p-4 space-y-2">
                    <div className="flex items-start gap-2.5">
                      {categoryPill(doc.doc_category)}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 text-sm">{doc.title}</p>
                        <p className="text-[11px] font-mono text-slate-400 break-all">{doc.standardized_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-500 min-w-0 truncate">
                        <span className="font-bold text-slate-700">{doc.uploaded_by_name}</span> · {formatDateTime(doc.uploaded_at)}
                      </p>
                      {docActions(doc)}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
