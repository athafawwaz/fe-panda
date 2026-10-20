"use client";

import React, { useMemo, useState } from "react";
import { Pencil, Trash2, UserCog, UserPlus, Users, SearchX } from "lucide-react";
import { Avatar, EmptyState, FilterChip, SearchBox } from "@/components/ListControls";
import { matchesQuery } from "@/lib/uiFormat";
import { ROLE_LABELS, isAdminRole, type UserProfile, type UserRole } from "@/lib/api";

type RoleFilter = "ALL" | UserRole;

const ROLE_PILL: Record<UserRole, string> = {
  SUPER_ADMIN: "bg-gradient-to-r from-indigo-600 to-blue-600 text-white",
  ADMIN: "bg-blue-600 text-white",
  PEGAWAI_TI: "bg-slate-100 text-slate-700",
};

interface Props {
  users: UserProfile[];
  isSuperAdmin: boolean;
  editingUserId: string | null;
  protectedBadge: string;
  currentUserId?: string;
  onAdd: () => void;
  onEdit: (u: UserProfile) => void;
  onDelete: (u: UserProfile) => void;
  onImpersonate: (u: UserProfile) => void;
}

export default function MasterUserTable({
  users,
  isSuperAdmin,
  editingUserId,
  protectedBadge,
  currentUserId,
  onAdd,
  onEdit,
  onDelete,
  onImpersonate,
}: Props) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<RoleFilter>("ALL");

  const counts = useMemo(() => {
    const c: Record<RoleFilter, number> = { ALL: users.length, SUPER_ADMIN: 0, ADMIN: 0, PEGAWAI_TI: 0 };
    users.forEach((u) => c[u.role]++);
    return c;
  }, [users]);

  const visible = useMemo(
    () =>
      users.filter(
        (u) =>
          (role === "ALL" || u.role === role) &&
          matchesQuery(query, u.badge_number, u.full_name, u.email, u.team?.team_name, u.branch?.branch_name)
      ),
    [users, role, query]
  );

  const segment = (u: UserProfile) =>
    isAdminRole(u.role) ? (
      <span className="text-emerald-700">Semua Tim (Full Access)</span>
    ) : (
      <span className="text-slate-600">
        {u.team?.team_name || "-"}
        {u.branch ? ` • ${u.branch.branch_name}` : ""}
      </span>
    );

  const actions = (u: UserProfile) => {
    const canManage = u.role !== "SUPER_ADMIN" || isSuperAdmin;
    const canDelete = canManage && u.badge_number !== protectedBadge && u.id !== currentUserId;
    return (
      <div className="flex items-center justify-end gap-1">
        {isSuperAdmin && u.role === "PEGAWAI_TI" && u.team_id && (
          <button
            onClick={() => onImpersonate(u)}
            className="h-8 w-8 rounded-lg text-amber-600 hover:bg-amber-50 flex items-center justify-center"
            title="Lihat sebagai segmen pegawai ini (impersonate)"
          >
            <UserCog size={15} />
          </button>
        )}
        {canManage && (
          <button
            onClick={() => onEdit(u)}
            className="h-8 w-8 rounded-lg text-blue-600 hover:bg-blue-50 flex items-center justify-center"
            title="Edit akses & segmen"
          >
            <Pencil size={15} />
          </button>
        )}
        {canDelete && (
          <button
            onClick={() => onDelete(u)}
            className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50 flex items-center justify-center"
            title="Hapus akses"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    );
  };

  const rolePill = (u: UserProfile) => (
    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black whitespace-nowrap ${ROLE_PILL[u.role]}`}>
      {ROLE_LABELS[u.role] || u.role}
    </span>
  );

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-slate-900 text-base">Daftar Pengguna</h3>
            <p className="text-[11px] text-slate-500">
              {isSuperAdmin
                ? "Pensil untuk mengubah akses, ikon orang untuk melihat tampilan segmen pegawai."
                : "Pensil untuk mengubah role & segmen pegawai."}
            </p>
          </div>
        </div>
        <SearchBox value={query} onChange={setQuery} placeholder="Cari badge, nama, email, tim, atau branch…" />
        <div className="flex flex-wrap gap-2">
          {(["ALL", "SUPER_ADMIN", "ADMIN", "PEGAWAI_TI"] as RoleFilter[])
            .filter((r) => r === "ALL" || counts[r] > 0)
            .map((r) => (
              <FilterChip
                key={r}
                active={role === r}
                onClick={() => setRole(r)}
                label={r === "ALL" ? "Semua" : ROLE_LABELS[r]}
                count={counts[r]}
              />
            ))}
        </div>
      </div>

      {users.length === 0 ? (
        <EmptyState
          icon={<Users size={26} />}
          title="Belum ada pengguna"
          description="Daftarkan badge pegawai beserta role, tim, dan branch-nya."
          action={
            <button
              onClick={onAdd}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-2"
            >
              <UserPlus size={15} /> Tambah Pengguna
            </button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<SearchX size={26} />}
          title="Tidak ada pengguna yang cocok"
          description="Ubah kata kunci atau filter role."
        />
      ) : (
        <>
          {/* Layar lebar: tabel */}
          <table className="hidden md:table w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                <th className="py-3 pl-5 pr-3">Pegawai</th>
                <th className="py-3 px-3">Badge</th>
                <th className="py-3 px-3">Role & Segmen</th>
                <th className="py-3 pl-3 pr-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {visible.map((u) => (
                <tr key={u.id} className={editingUserId === u.id ? "bg-blue-50/70" : "hover:bg-slate-50/70"}>
                  <td className="py-3.5 pl-5 pr-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={u.full_name} seed={u.badge_number} />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{u.full_name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 font-black text-blue-700 whitespace-nowrap tabular-nums">
                    {u.badge_number}
                  </td>
                  <td className="py-3.5 px-3">
                    {rolePill(u)}
                    <p className="mt-1.5 text-[11px] font-semibold leading-snug">{segment(u)}</p>
                  </td>
                  <td className="py-3.5 pl-3 pr-5">{actions(u)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Layar sempit: kartu */}
          <ul className="md:hidden divide-y divide-slate-100">
            {visible.map((u) => (
              <li key={u.id} className={`p-4 flex gap-3 ${editingUserId === u.id ? "bg-blue-50/70" : ""}`}>
                <Avatar name={u.full_name} seed={u.badge_number} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{u.full_name}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        <span className="font-black text-blue-700">{u.badge_number}</span> · {u.email}
                      </p>
                    </div>
                    {actions(u)}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                    {rolePill(u)}
                    {segment(u)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
