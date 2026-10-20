"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { avatarTone, initials } from "@/lib/uiFormat";

export function SearchBox({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-shadow [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          title="Hapus pencarian"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

export function FilterChip({
  active,
  onClick,
  label,
  count,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
        active
          ? "bg-slate-900 text-white shadow-sm"
          : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span className={`tabular-nums text-[10px] ${active ? "text-slate-300" : "text-slate-400"}`}>{count}</span>
      )}
    </button>
  );
}

export function Avatar({ name, seed, size = "md" }: { name: string; seed?: string; size?: "sm" | "md" }) {
  const dims = size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";
  return (
    <span
      className={`${dims} rounded-full bg-gradient-to-br ${avatarTone(seed ?? name)} text-white font-black flex items-center justify-center flex-shrink-0 shadow-sm`}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-14">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">{icon}</div>
      <p className="font-bold text-slate-800">{title}</p>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StatPill({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-slate-200/80">
      <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">{icon}</span>
      <span>
        <span className="block text-lg font-black text-slate-900 leading-none tabular-nums">{value}</span>
        <span className="block text-[11px] text-slate-500 mt-1">{label}</span>
      </span>
    </div>
  );
}
