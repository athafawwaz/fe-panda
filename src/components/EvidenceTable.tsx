"use client";

import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Download, Eye, Globe, Inbox, Lock } from "lucide-react";
import type { DocumentItem } from "@/lib/api";
import { formatDateTime, formatFileSize, matchesQuery, relativeTime, shortName } from "@/lib/uiFormat";
import { EmptyState, FilterChip, SearchBox } from "@/components/ListControls";
import DocumentDownloadButton from "@/components/DocumentDownloadButton";

type Visibility = "ALL" | "ALL_TIM" | "TEAM_ONLY";
type SortKey = "uploaded_at" | "title" | "uploaded_by_name" | "file_size_bytes";

interface EvidenceTableProps {
  docs: DocumentItem[];
  onPreview: (doc: DocumentItem) => void;
  onUpload?: () => void;
}

function Access({ doc }: { doc: DocumentItem }) {
  return doc.visibility_scope === "ALL_TIM" ? (
    <span className="access-tag"><Globe size={12} aria-hidden /> Semua tim</span>
  ) : (
    <span className="access-tag is-restricted" title={doc.uploaded_by_team_label}>
      <Lock size={12} aria-hidden /> {doc.uploaded_by_team_label || "Tim terbatas"}
    </span>
  );
}

/** Evidence lintas tim: tabel padat dengan pencarian, filter, urutan per kolom, dan jejak unggahan lengkap. */
export default function EvidenceTable({ docs, onPreview, onUpload }: EvidenceTableProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [visibility, setVisibility] = useState<Visibility>("ALL");
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: "uploaded_at", asc: false });

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
        matchesQuery(query, d.title, d.standardized_name, d.ai_summary, d.uploaded_by_name, d.uploaded_by_badge, d.uploaded_by_team_label, d.audit_tags)
    );
    const dir = sort.asc ? 1 : -1;
    return list.sort((a, b) => {
      const x = a[sort.key], y = b[sort.key];
      return dir * (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "id"));
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
      <section className="data-panel">
        <EmptyState
          icon={<Inbox size={24} />}
          title="Belum ada evidence"
          description="Evidence yang diunggah dapat dicari oleh tim sesuai visibilitasnya."
          action={onUpload && <button className="btn-primary" onClick={onUpload}>Unggah evidence pertama</button>}
        />
      </section>
    );
  }

  const SortHead = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => {
    const active = sort.key === k;
    return (
      <th scope="col" className={className} aria-sort={active ? (sort.asc ? "ascending" : "descending") : "none"}>
        <button className="sort-head" onClick={() => setSort({ key: k, asc: active ? !sort.asc : k === "title" || k === "uploaded_by_name" })}>
          {children}
          {active && (sort.asc ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />)}
        </button>
      </th>
    );
  };

  const actions = (doc: DocumentItem) => (
    <div className="row-actions">
      <button className="icon-btn" onClick={() => onPreview(doc)} aria-label={`Lihat ${doc.title}`} title="Lihat">
        <Eye size={16} />
      </button>
      <DocumentDownloadButton docId={doc.id} filename={doc.standardized_name} className="icon-btn" title={`Unduh (${formatFileSize(doc.file_size_bytes)})`}>
        <Download size={16} />
      </DocumentDownloadButton>
    </div>
  );

  return (
    <section className="data-panel" aria-label="Daftar evidence">
      <div className="data-toolbar">
        <SearchBox value={query} onChange={setQuery} placeholder="Cari judul, nama file, pengunggah, badge, atau tag" className="data-search" />
        <div className="segmented" role="group" aria-label="Visibilitas">
          {([["ALL", "Semua"], ["ALL_TIM", "Semua tim"], ["TEAM_ONLY", "Terbatas"]] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={visibility === id} onClick={() => setVisibility(id)}>{label}</button>
          ))}
        </div>
      </div>
      {categories.length > 1 && (
        <div className="data-chips" role="group" aria-label="Kategori">
          <FilterChip active={category === "ALL"} onClick={() => setCategory("ALL")} label="Semua kategori" count={docs.length} />
          {categories.map(([cat, n]) => (
            <FilterChip key={cat} active={category === cat} onClick={() => setCategory(cat)} label={cat} count={n} />
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="data-empty">
          Tidak ada evidence yang cocok. <button className="link-btn" onClick={resetFilters}>Hapus filter</button>
        </p>
      ) : (
        <>
          <table className="data-table is-wide">
            <thead>
              <tr>
                <SortHead k="title">Dokumen</SortHead>
                <th scope="col">Akses</th>
                <SortHead k="uploaded_by_name">Diunggah oleh</SortHead>
                <SortHead k="uploaded_at">Tanggal</SortHead>
                <SortHead k="file_size_bytes" className="cell-num">Ukuran</SortHead>
                <th scope="col"><span className="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <span className="row-meta"><span className="code-tag">{doc.doc_category}</span>{doc.version_label}</span>
                    <button className="row-title" onClick={() => onPreview(doc)}>{doc.title}</button>
                    <span className="row-sub mono" title={doc.original_filename}>{doc.standardized_name}</span>
                  </td>
                  <td><Access doc={doc} /></td>
                  <td>
                    {shortName(doc.uploaded_by_name)}
                    <span className="row-sub">Badge {doc.uploaded_by_badge}</span>
                  </td>
                  <td title={relativeTime(doc.uploaded_at)} className="nowrap">{formatDateTime(doc.uploaded_at)}</td>
                  <td className="cell-num">{formatFileSize(doc.file_size_bytes)}</td>
                  <td className="cell-end">{actions(doc)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="data-cards">
            {visible.map((doc) => (
              <li key={doc.id}>
                <span className="row-meta"><span className="code-tag">{doc.doc_category}</span>{doc.version_label}<Access doc={doc} /></span>
                <button className="row-title" onClick={() => onPreview(doc)}>{doc.title}</button>
                <span className="row-sub">{shortName(doc.uploaded_by_name)} · {formatDateTime(doc.uploaded_at)} · {formatFileSize(doc.file_size_bytes)}</span>
                {actions(doc)}
              </li>
            ))}
          </ul>
        </>
      )}

      <footer className="data-foot">
        <span>{visible.length} dari {docs.length} dokumen</span>
        {filtered && <button className="link-btn" onClick={resetFilters}>Hapus filter</button>}
      </footer>
    </section>
  );
}
