"use client";

import React, { useMemo, useState } from "react";
import { ChevronRight, FolderKanban } from "lucide-react";
import type { AppFolder } from "@/lib/api";
import { formatDateTime, matchesQuery, relativeTime } from "@/lib/uiFormat";
import { EmptyState, SearchBox } from "@/components/ListControls";

interface FolderGridProps {
  folders: AppFolder[];
  isAdmin: boolean;
  onOpen: (folder: AppFolder) => void;
  onCreate: () => void;
}

function teamLabel(f: AppFolder): string {
  return [f.assigned_team?.team_name, f.assigned_branch?.branch_name].filter(Boolean).join(" · ") || "Belum ditetapkan";
}

/** Folder tim (level 1 Dokumen aplikasi) sebagai tabel padat: satu baris per folder, bisa dicari. */
export default function FolderGrid({ folders, isAdmin, onOpen, onCreate }: FolderGridProps) {
  const [query, setQuery] = useState("");

  const visible = useMemo(
    () =>
      folders.filter((f) =>
        matchesQuery(query, f.folder_name, f.description, teamLabel(f), ...(f.applications ?? []).flatMap((a) => [a.app_name, a.app_code]))
      ),
    [folders, query]
  );

  if (folders.length === 0) {
    return (
      <section className="data-panel">
        <EmptyState
          icon={<FolderKanban size={24} />}
          title="Belum ada folder tim"
          description={isAdmin ? "Buat folder lalu tetapkan ke tim agar tim bisa mendaftarkan aplikasi dan dokumennya." : "Admin belum membuat folder untuk tim Anda."}
          action={isAdmin && <button className="btn-primary" onClick={onCreate}>Buat folder pertama</button>}
        />
      </section>
    );
  }

  return (
    <section className="data-panel" aria-label="Folder tim">
      <div className="data-toolbar">
        <SearchBox value={query} onChange={setQuery} placeholder="Cari folder, tim, atau kode aplikasi" className="data-search" />
      </div>
      {visible.length === 0 ? (
        <p className="data-empty">Tidak ada folder yang cocok dengan &ldquo;{query}&rdquo;.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Folder</th>
              <th scope="col">Tim</th>
              <th scope="col">Aplikasi</th>
              <th scope="col">Dibuat</th>
              <th scope="col"><span className="sr-only">Buka</span></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((folder) => {
              const apps = folder.applications ?? [];
              return (
                <tr key={folder.id} className="is-link" onClick={() => onOpen(folder)}>
                  <td>
                    <button className="row-title" onClick={(e) => { e.stopPropagation(); onOpen(folder); }}>{folder.folder_name}</button>
                    {folder.description && <span className="row-sub">{folder.description}</span>}
                  </td>
                  <td>{teamLabel(folder)}</td>
                  <td>
                    <span className="num">{apps.length}</span>
                    {apps.length > 0 && <span className="row-sub" title={apps.map((a) => a.app_name).join(", ")}>{apps.slice(0, 3).map((a) => a.app_code).join(", ")}{apps.length > 3 ? ` +${apps.length - 3}` : ""}</span>}
                  </td>
                  <td title={folder.created_at ? formatDateTime(folder.created_at) : undefined}>{folder.created_at ? relativeTime(folder.created_at) : "–"}</td>
                  <td className="cell-end"><ChevronRight size={16} aria-hidden /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <footer className="data-foot">{visible.length} dari {folders.length} folder</footer>
    </section>
  );
}
