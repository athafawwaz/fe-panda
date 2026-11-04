"use client";

import React from "react";
import { Check, ChevronRight, Download, Eye, Plus, Upload } from "lucide-react";
import { EmptyState } from "@/components/ListControls";
import { appStatusLabel, formatDateTime, formatFileSize, shortName } from "@/lib/uiFormat";
import { REQUIRED_CHANGE, REQUIRED_INITIAL } from "@/lib/readiness";
import DocumentDownloadButton from "@/components/DocumentDownloadButton";
import type { AppChangeSection, AppFolder, ApplicationItem, DocumentItem } from "@/lib/api";

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
}

/** Detail aplikasi: versi sebagai tab, daftar periksa dokumen wajib, dan tabel dokumen dengan jejak unggahan. */
export default function ApplicationDetail({ app, folder, activeSectionId, onSelectSection, onBackToFolders, onBackToFolder, onAddSection, onUpload, onPreview }: Props) {
  const sections = app.sections || [];
  const active: AppChangeSection | undefined = sections.find((s) => s.id === activeSectionId) || sections[0];
  const docs = active?.documents || [];
  const required = active?.is_initial_release ? REQUIRED_INITIAL : REQUIRED_CHANGE;
  const present = new Set(docs.map((d) => d.doc_category));
  const missing = required.filter((c) => !present.has(c));
  const team = [folder?.assigned_team?.team_name, folder?.assigned_branch?.branch_name].filter(Boolean).join(" · ") || "–";

  return (
    <div className="page-stack">
      <header className="page-head">
        <div>
          <nav aria-label="Lokasi" className="page-crumbs">
            <button onClick={onBackToFolders}>Dokumen aplikasi</button>
            {folder && (
              <>
                <ChevronRight size={13} aria-hidden />
                <button onClick={onBackToFolder}>{folder.folder_name}</button>
              </>
            )}
            <ChevronRight size={13} aria-hidden />
            <span aria-current="page">{app.app_code}</span>
          </nav>
          <h1>{app.app_name}</h1>
          {app.description && <p>{app.description}</p>}
        </div>
      </header>

      <dl className="fact-row">
        <div><dt>Kode</dt><dd>{app.app_code}</dd></div>
        <div><dt>Status</dt><dd>{appStatusLabel(app.status)}</dd></div>
        <div><dt>Tim pemilik</dt><dd>{team}</dd></div>
        <div><dt>Didaftarkan oleh</dt><dd title={`Badge ${app.created_by_badge}`}>{shortName(app.created_by_name)}</dd></div>
      </dl>

      <section className="data-panel" aria-label="Versi aplikasi">
        <div className="version-tabs" role="tablist" aria-label="Versi">
          {sections.map((sec) => {
            const gaps = (sec.is_initial_release ? REQUIRED_INITIAL : REQUIRED_CHANGE).filter((c) => !(sec.documents ?? []).some((d) => d.doc_category === c)).length;
            return (
              <button key={sec.id} role="tab" aria-selected={sec.id === active?.id} onClick={() => onSelectSection(sec.id)} title={sec.section_title}>
                <strong>{sec.version_label}</strong>
                <span className={gaps ? "dot is-missing" : "dot is-ok"} aria-label={gaps ? `${gaps} dokumen wajib belum ada` : "Lengkap"} />
              </button>
            );
          })}
          <button className="version-add" onClick={onAddSection}><Plus size={14} /> Versi baru</button>
        </div>

        {active && (
          <div className="version-head">
            <div>
              <h2>{active.version_label} · {active.section_title}</h2>
              <p>{active.change_description || "Tidak ada deskripsi perubahan."}</p>
              <p className="row-sub">
                {active.is_initial_release ? "Rilis awal" : "Perubahan"} · rilis {active.release_date || "–"} · dibuat {shortName(active.created_by_name)} (badge {active.created_by_badge})
              </p>
            </div>
            <button className="btn-primary" onClick={() => onUpload(missing[0] || "LAINNYA")}><Upload size={16} /> Unggah dokumen</button>
          </div>
        )}

        {active && (
          <div className="checklist" aria-label="Dokumen wajib">
            <span className="checklist-label">
              Dokumen wajib {required.length - missing.length}/{required.length}
              {missing.length === 0 && <span className="ok-text"> · siap audit</span>}
            </span>
            {required.map((cat) =>
              present.has(cat) ? (
                <span key={cat} className="check-tag is-ok"><Check size={12} aria-hidden /> {cat}</span>
              ) : (
                <button key={cat} className="check-tag is-missing" onClick={() => onUpload(cat)} title={`Unggah ${cat} untuk ${active.version_label}`}>
                  <Plus size={12} aria-hidden /> {cat}
                </button>
              )
            )}
          </div>
        )}

        {active && docs.length === 0 && (
          <EmptyState title={`Belum ada dokumen di ${active.version_label}`} description="Pilih kategori di atas untuk mengunggah dokumen wajib." icon={<Upload size={24} />} />
        )}

        {docs.length > 0 && (
          <>
            <table className="data-table is-wide">
              <thead>
                <tr>
                  <th scope="col">Dokumen</th>
                  <th scope="col">Diunggah oleh</th>
                  <th scope="col">Tanggal</th>
                  <th scope="col" className="cell-num">Ukuran</th>
                  <th scope="col"><span className="sr-only">Aksi</span></th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <span className="row-meta"><span className="code-tag">{doc.doc_category}</span></span>
                      <button className="row-title" onClick={() => onPreview(doc)}>{doc.title}</button>
                      <span className="row-sub mono" title={doc.original_filename}>{doc.standardized_name}</span>
                    </td>
                    <td>{shortName(doc.uploaded_by_name)}<span className="row-sub">Badge {doc.uploaded_by_badge}</span></td>
                    <td className="nowrap">{formatDateTime(doc.uploaded_at)}</td>
                    <td className="cell-num">{formatFileSize(doc.file_size_bytes)}</td>
                    <td className="cell-end">
                      <div className="row-actions">
                        <button className="icon-btn" onClick={() => onPreview(doc)} aria-label={`Lihat ${doc.title}`} title="Lihat"><Eye size={16} /></button>
                        <DocumentDownloadButton docId={doc.id} filename={doc.standardized_name} className="icon-btn" title="Unduh"><Download size={16} /></DocumentDownloadButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="data-cards">
              {docs.map((doc) => (
                <li key={doc.id}>
                  <span className="row-meta"><span className="code-tag">{doc.doc_category}</span></span>
                  <button className="row-title" onClick={() => onPreview(doc)}>{doc.title}</button>
                  <span className="row-sub">{shortName(doc.uploaded_by_name)} · {formatDateTime(doc.uploaded_at)}</span>
                  <div className="row-actions">
                    <button className="icon-btn" onClick={() => onPreview(doc)} aria-label={`Lihat ${doc.title}`}><Eye size={16} /></button>
                    <DocumentDownloadButton docId={doc.id} filename={doc.standardized_name} className="icon-btn" title="Unduh"><Download size={16} /></DocumentDownloadButton>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
