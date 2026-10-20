"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  UserCheck,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { apiFetch, saveAuthSession, UserProfile } from "@/lib/api";
import { triggerPageLoader } from "@/components/PageTransitionLoader";

export default function LoginPage() {
  const router = useRouter();
  const [badgeNumber, setBadgeNumber] = useState("2411249");
  const [password, setPassword] = useState("Panda");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string; user: UserProfile }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            badge_number: badgeNumber.trim(),
            password: password.trim(),
          }),
        }
      );
      saveAuthSession(res.token, res.user);
      triggerPageLoader({
        targetPath: "/dashboard",
        customTitle: `Selamat Datang, ${res.user.full_name}`,
      });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Gagal login. Pastikan Backend Go berjalan.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1122] relative flex items-center justify-center p-4 overflow-hidden">
      {/* Ambient Corporate Blue Orbs */}
      <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-blue-600/25 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/15 rounded-full blur-[130px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-12 bg-slate-900/70 backdrop-blur-2xl border border-white/15 rounded-[2.5rem] shadow-2xl overflow-hidden">
        {/* Left Branding Panel */}
        <div className="lg:col-span-6 p-8 sm:p-12 bg-gradient-to-br from-blue-900/60 via-slate-900/80 to-slate-950 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-white/10">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-bold text-blue-300 hover:text-white mb-8 transition-colors"
            >
              <ArrowLeft size={15} /> Kembali ke Landing Page
            </Link>

            <div className="flex items-center gap-3 mb-6">
              <img
                src="/assets/pusri.png"
                alt="PT Pusri Palembang"
                className="h-10 w-auto object-contain"
              />
              <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-cyan-300 text-xs font-bold">
                PANDA v1.3
              </span>
            </div>

            <h1 className="text-3xl font-black text-white leading-tight mb-3">
              Pusat Administrasi Dokumen Audit TI
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Autentikasi berbasis <strong>Nomor Badge Pegawai</strong> dengan
              segmentasi akses otomatis untuk Admin dan masing-masing Tim/Branch TI.
            </p>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-6 p-8 sm:p-12 bg-white text-slate-900 flex flex-col justify-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-6">
            <ShieldCheck size={28} />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
            Masuk ke Portal PANDA
          </h2>
          <p className="text-slate-500 text-sm mb-7">
            Masukkan Nomor Badge Pegawai Anda dan password bypass{" "}
            <code className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">
              Panda
            </code>
          </p>

          {error && (
            <div className="mb-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Nomor Badge Pegawai
              </label>
              <div className="relative">
                <UserCheck
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  required
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  placeholder="Contoh: 2411249"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none font-bold text-slate-900 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Password Bypass
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ketik: Panda"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none font-bold text-slate-900 transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Default Admin Pertama: Badge <strong>2411249</strong> | Password:{" "}
                <strong>Panda</strong>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm shadow-xl shadow-blue-600/25 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
            >
              {loading ? (
                "Memverifikasi Badge..."
              ) : (
                <>
                  Masuk ke Dashboard Utama <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
