"use client";

import React, { useMemo, useState } from "react";
import { ChevronRight, FolderKanban, FolderPlus, Layers, SearchX, Users } from "lucide-react";
import type { AppFolder } from "@/lib/api";
import { matchesQuery, relativeTime } from "@/lib/uiFormat";
import { EmptyState, SearchBox, StatPill } from "@/components/ListControls";

interface FolderGridProps {
  folders: AppFolder[];
  isAdmin: boolean;
  onOpen: (folder: AppFolder) => void;
  onCreate: () => void;
}

function teamLabel(f: AppFolder): string {
  return [f.assigned_team?.team_name, f.assigned_branch?.branch_name].filter(Boolean).join(" • ") || "Belum di-assign";
}

/** Daftar folder tim (level 1 menu Aplikasi & Versioning): ringkasan, pencarian, dan kartu folder. */
export default function FolderGrid({ folders, isAdmin, onOpen, onCreate }: FolderGridProps) {
  const [query, setQuery] = useState("");

  const stats = useMemo(() => {
    const apps = folders.reduce((n, f) => n + (f.applications?.length ?? 0), 0);
    const teams = new Set(folders.map((f) => f.assigned_team_id).filter(Boolean)).size;
    return { apps, teams };
  }, [folders]);

  const visible = useMemo(
    () =>
      folders.filter((f) =>
        matchesQuery(
          query,
          f.folder_name,
          f.description,
          teamLabel(f),
          ...(f.applications ?? []).flatMap((a) => [a.app_name, a.app_code])
        )
      ),
    [folders, query]
  );

  if (folders.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm">
        <EmptyState
          icon={<FolderKanban size={26} />}
          title="Belum ada folder tim"
          description={
            isAdmin
              ? "Buat folder pertama lalu assign ke tim/branch agar tim bisa mendaftarkan aplikasi & dokumen SDLC-nya."
              : "Admin belum membuat folder untuk tim Anda."
          }
          action={
            isAdmin && (
              <button
                onClick={onCreate}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2"
              >
                <FolderPlus size={15} /> Buat Folder Pertama
              </button>
            )
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="grid grid-cols-3 gap-3 lg:flex-1">
          <StatPill icon={<FolderKanban size={17} />} value={folders.length} label="Folder tim" />
          <StatPill icon={<Layers size={17} />} value={stats.apps} label="Aplikasi terdaftar" />
          <StatPill icon={<Users size={17} />} value={stats.teams} label="Tim pemilik" />
        </div>
        <SearchBox
          value={query}
          onChange={setQuery}
          placeholder="Cari folder, tim, atau aplikasi…"
          className="lg:w-80"
        />
      </div>

      {visible.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80">
          <EmptyState
            icon={<SearchX size={26} />}
            title="Tidak ada folder yang cocok"
            description={`Tidak ada folder, tim, atau aplikasi yang cocok dengan "${query}".`}
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {visible.map((folder) => {
            const apps = folder.applications ?? [];
            return (
              <button
                type="button"
                key={folder.id}
                onClick={() => onOpen(folder)}
                className="group text-left bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-blue-400 transition-all overflow-hidden flex flex-col focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20"
              >
                <div className="h-1.5 bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500 opacity-80 group-hover:opacity-100" />
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start gap-3.5">
                    <span className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-600/25">
                      <FolderKanban size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-slate-900 leading-snug group-hover:text-blue-700 line-clamp-2">
                        {folder.folder_name}
                      </h3>
                      <span
                        className="mt-1 inline-flex max-w-full items-center gap-1 text-[11px] font-semibold text-blue-700"
                        title={teamLabel(folder)}
                      >
                        <Users size={11} className="flex-shrink-0" />
                        <span className="truncate">{teamLabel(folder)}</span>
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed mt-3 line-clamp-2 min-h-[2.5rem]">
                    {folder.description || "Folder repositori aplikasi tim."}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-3 min-h-[1.5rem]">
                    {apps.slice(0, 3).map((a) => (
                      <span
                        key={a.id}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold font-mono"
                        title={a.app_name}
                      >
                        {a.app_code}
                      </span>
                    ))}
                    {apps.length > 3 && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold">
                        +{apps.length - 3}
                      </span>
                    )}
                    {apps.length === 0 && <span className="text-[11px] text-slate-400 italic">Belum ada aplikasi</span>}
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      <strong className="text-slate-800">{apps.length}</strong> aplikasi
                      {folder.created_at && <span className="text-slate-400"> · dibuat {relativeTime(folder.created_at)}</span>}
                    </span>
                    <span className="text-blue-600 font-bold flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
                      Buka <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}

          {isAdmin && !query && (
            <button
              type="button"
              onClick={onCreate}
              className="rounded-3xl border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/40 text-slate-500 hover:text-blue-700 transition-colors flex flex-col items-center justify-center gap-2 p-8 min-h-[220px]"
            >
              <span className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center">
                <FolderPlus size={20} />
              </span>
              <span className="text-sm font-bold">Buat folder baru</span>
              <span className="text-[11px] text-slate-400">Assign ke tim / branch tertentu</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
