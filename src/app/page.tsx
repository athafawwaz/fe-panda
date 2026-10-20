"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  FileText,
  Shield,
  CheckCircle2,
  ArrowRight,
  Menu,
  X,
  TrendingUp,
  Users,
  Lock,
  Sparkles,
  FolderKanban,
  Layers,
  Database,
  LayoutDashboard,
  Cpu,
  History,
  Search,
} from "lucide-react";
import { API_BASE_URL, getAuthSession } from "@/lib/api";

const NAV_ITEMS = [
  { label: "Tentang", id: "tentang" },
  { label: "Cara Kerja", id: "alur-proses" },
  { label: "Asisten AI", id: "fitur" },
  { label: "Cara Masuk", id: "akses" },
];

function useCountUp(value: number, duration = 1000): number {
  const [display, setDisplay] = useState(0);
  const currentRef = useRef(0);

  useEffect(() => {
    const from = currentRef.current;
    if (from === value) return;
    let frame = 0;
    let start: number | null = null;
    const step = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / duration);
      const next = Math.round(from + (value - from) * (1 - Math.pow(1 - t, 3)));
      currentRef.current = next;
      setDisplay(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return display;
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [stats, setStats] = useState({
    total_apps: 0,
    total_app_docs: 0,
    total_evidence: 0,
    total_ai_indexed: 0,
    compliance_rate: 96,
  });

  // Scroll & Intersection Observer for On-Scroll Reveal Animations
  useEffect(() => {
    const session = getAuthSession();
    setIsLoggedIn(Boolean(session.user));

    fetch(`${API_BASE_URL}/public/stats`)
      .then((r) => r.json())
      .then((res) => {
        if (res?.data) setStats(res.data);
      })
      .catch(() => {});

    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 20);
      setScrollY(y);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100", "translate-y-0", "blur-0");
            entry.target.classList.remove("opacity-0", "translate-y-10", "blur-sm");
          }
        });
      },
      { threshold: 0.12 }
    );

    document.querySelectorAll(".scroll-reveal").forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const { innerWidth, innerHeight } = window;
    const x = (e.clientX / innerWidth - 0.5) * 24;
    const y = (e.clientY / innerHeight - 0.5) * 24;
    setMousePos({ x, y });
  };

  const scrollToId = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 76;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const countApps = useCountUp(stats.total_apps);
  const countAppDocs = useCountUp(stats.total_app_docs);
  const countEvidence = useCountUp(stats.total_evidence);
  const countIndexed = useCountUp(stats.total_ai_indexed);

  return (
    <div
      onMouseMove={handleMouseMove}
      className="font-sans antialiased text-slate-900 bg-white selection:bg-blue-600 selection:text-white overflow-x-hidden"
    >
      {/* ─── NAVBAR DENGAN CROSSFADE LOGO PT PUSRI (REFERENSI SIMSKBDN) ─── */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-white/85 backdrop-blur-xl shadow-sm border-b border-slate-200/60 py-2.5"
            : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="cursor-pointer group"
            >
              <div className="relative w-40 h-10 transition-transform duration-300 group-hover:scale-105">
                <img
                  src="/assets/pusri.png"
                  alt="PT Pupuk Sriwidjaja Palembang"
                  className={`absolute inset-0 w-full h-full object-contain object-left transition-opacity duration-500 ${
                    scrolled ? "opacity-0" : "opacity-100"
                  }`}
                />
                <img
                  src="/assets/logo-pusri-horizontal-dark.png"
                  alt="PT Pupuk Sriwidjaja Palembang"
                  className={`absolute inset-y-[2px] left-0 w-[calc(100%-8px)] h-[calc(100%-4px)] object-contain object-left transition-opacity duration-500 ${
                    scrolled ? "opacity-100" : "opacity-0"
                  }`}
                />
              </div>
            </div>

            {/* Desktop Nav Capsule */}
            <div
              className={`hidden md:flex items-center gap-7 px-6 py-2.5 rounded-full border transition-all duration-500 ${
                scrolled
                  ? "bg-slate-100/80 border-slate-200/70"
                  : "bg-white/5 backdrop-blur-md border-white/10"
              }`}
            >
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => scrollToId(e, item.id)}
                  className={`text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 ${
                    scrolled
                      ? "text-slate-600 hover:text-blue-600"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </div>

            {/* CTA Login / Dashboard */}
            <div className="flex items-center gap-3">
              <Link
                href={isLoggedIn ? "/dashboard" : "/login"}
                className={`hidden sm:inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 ${
                  scrolled
                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25"
                    : "bg-white text-blue-950 hover:bg-blue-50 shadow-xl shadow-black/20"
                }`}
              >
                {isLoggedIn ? (
                  <>
                    <LayoutDashboard size={16} />
                    Buka Dashboard
                  </>
                ) : (
                  <>
                    Masuk ke Sistem
                    <ArrowRight size={16} />
                  </>
                )}
              </Link>
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className={`md:hidden p-2 rounded-xl ${
                  scrolled ? "text-slate-700" : "text-white"
                }`}
              >
                {mobileOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-b border-slate-100 px-4 pt-3 pb-6 space-y-2 shadow-2xl">
            {NAV_ITEMS.map((m) => (
              <a
                key={m.id}
                href={`#${m.id}`}
                onClick={(e) => scrollToId(e, m.id)}
                className="block px-4 py-2.5 text-sm font-bold text-slate-700 rounded-xl hover:bg-blue-50 hover:text-blue-600"
              >
                {m.label}
              </a>
            ))}
            <Link
              href={isLoggedIn ? "/dashboard" : "/login"}
              className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg"
            >
              {isLoggedIn ? "Buka Dashboard PANDA" : "Masuk ke Sistem"}
              <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </nav>

      {/* ─── HERO SECTION DENGAN MULTI-LAYER PARALLAX ─── */}
      <section className="relative min-h-[100svh] flex items-center overflow-hidden bg-[#0a1122]">
        {/* Layer 0: Deep Parallax Grid & Ambient Glows */}
        <div
          className="absolute inset-0 pointer-events-none transition-transform duration-200 ease-out"
          style={{
            transform: `translate3d(${mousePos.x * -0.4}px, ${scrollY * 0.25 + mousePos.y * -0.4}px, 0)`,
          }}
        >
          <div className="absolute top-[-12%] left-[-8%] w-[55%] h-[55%] bg-blue-600/25 rounded-full blur-[130px] animate-pulse" />
          <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/15 rounded-full blur-[130px]" />
          <svg className="absolute inset-0 w-full h-full opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="panda-grid" width="44" height="44" patternUnits="userSpaceOnUse">
                <path d="M 44 0 L 0 0 0 44" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#panda-grid)" />
          </svg>
        </div>

        {/* Layer 1: Foreground Content & Live Repository Glass Card */}
        <div
          className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 w-full z-10"
          style={{
            transform: `translate3d(0, ${scrollY * -0.06}px, 0)`,
          }}
        >
          <div className="grid lg:grid-cols-12 gap-14 lg:gap-10 items-center">
            <div className="lg:col-span-7 text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.08] mb-6 tracking-tight">
                Pusat Administrasi{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-sky-200">
                  Dokumen Audit (PANDA)
                </span>{" "}
                Terintegrasi AI
              </h1>

              <p className="text-lg sm:text-xl text-slate-300/90 leading-relaxed mb-9 max-w-2xl font-normal mx-auto lg:mx-0">
                Satu tempat untuk <strong>menyimpan</strong>, <strong>merapikan</strong>, dan{" "}
                <strong>menemukan kembali</strong> dokumen audit TI — mulai dari PRD, UAT, dan
                BAST aplikasi hingga bukti audit dari Tim Digitalisasi, Layanan TI,
                Infrastruktur TI, dan Tata Kelola TI. Butuh dokumen? Cukup tanyakan ke{" "}
                <strong>asisten AI</strong>.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href={isLoggedIn ? "/dashboard" : "/login"}
                  className="group relative inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-gradient-to-r from-blue-600 to-sky-500 text-white rounded-2xl font-bold text-base transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/40"
                >
                  <span>{isLoggedIn ? "Buka Dashboard PANDA" : "Masuk ke Sistem"}</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#tentang"
                  onClick={(e) => scrollToId(e, "tentang")}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/5 border border-white/15 text-white hover:bg-white/10 backdrop-blur-md rounded-2xl font-semibold transition-all duration-300 hover:-translate-y-1"
                >
                  Pelajari Selengkapnya
                </a>
              </div>
            </div>

            {/* Right Column: Live Repository & AI Status Glass Card with 3D Parallax Tilt */}
            <div
              className="lg:col-span-5 relative transition-transform duration-200 ease-out"
              style={{
                transform: `perspective(1000px) rotateY(${mousePos.x * 0.25}deg) rotateX(${mousePos.y * -0.25}deg)`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-cyan-400 blur-3xl opacity-25 rounded-[3rem]" />
              <div className="relative bg-slate-900/60 backdrop-blur-2xl border border-white/15 rounded-3xl p-7 sm:p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full living-orb-core flex-shrink-0" />
                    <div>
                      <p className="text-white text-sm font-bold tracking-wide">
                        Isi PANDA Saat Ini
                      </p>
                      <p className="text-slate-400 text-xs">
                        Diperbarui otomatis setiap ada dokumen baru
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold rounded-full flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                </div>

                <div className="space-y-3.5">
                  {[
                    {
                      icon: FolderKanban,
                      label: "Aplikasi Terdaftar",
                      val: countApps,
                      suffix: " Aplikasi",
                      color: "text-blue-400",
                      bg: "bg-blue-500/15 border-blue-400/25",
                    },
                    {
                      icon: Layers,
                      label: "Dokumen Aplikasi (PRD, UAT, BAST)",
                      val: countAppDocs,
                      suffix: " Dokumen",
                      color: "text-cyan-400",
                      bg: "bg-cyan-500/15 border-cyan-400/25",
                    },
                    {
                      icon: Shield,
                      label: "Bukti Audit (Evidence) Seluruh Tim",
                      val: countEvidence,
                      suffix: " Dokumen",
                      color: "text-indigo-300",
                      bg: "bg-indigo-500/15 border-indigo-400/25",
                    },
                    {
                      icon: Sparkles,
                      label: "Dokumen yang Bisa Dicari lewat AI",
                      val: countIndexed,
                      suffix: " Dokumen",
                      color: "text-emerald-400",
                      bg: "bg-emerald-500/15 border-emerald-400/25",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-4 p-3.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 rounded-2xl transition-all duration-300"
                    >
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center border ${item.bg}`}
                      >
                        <item.icon size={22} className={item.color} />
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                          {item.label}
                        </p>
                        <p className="text-white font-black text-2xl tabular-nums">
                          {item.val}
                          <span className="text-xs font-semibold text-slate-400 ml-1">
                            {item.suffix}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION TENTANG & 3 PILAR UTAMA RENDAL TI (ON-SCROLL REVEAL) ─── */}
      <section id="tentang" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-14 items-center">
            <div className="lg:col-span-5 scroll-reveal opacity-0 translate-y-10 blur-sm transition-all duration-700">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-xs font-bold tracking-widest mb-5 border border-blue-100">
                <Shield size={14} /> KENAPA PANDA?
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-5 leading-tight">
                Tidak Ada Lagi Dokumen Audit yang Tercecer
              </h2>
              <p className="text-slate-600 text-base leading-relaxed mb-6">
                Selama ini dokumen aplikasi dan bukti audit TI tersimpan di banyak tempat,
                sering tersimpan berulang kali, dan lokasinya hanya diketahui orang tertentu.
                PANDA merapikannya lewat tiga hal utama:
              </p>

              <div className="space-y-4">
                {[
                  {
                    title: "1. Semua Dokumen di Satu Tempat",
                    desc: "Dokumen aplikasi (PRD, UAT, BAST) dan bukti audit seluruh tim TI tersimpan di satu sistem, tidak lagi tersebar di folder pribadi.",
                  },
                  {
                    title: "2. Tersusun Rapi & Seragam",
                    desc: "Dokumen dikelompokkan per tim dengan penamaan yang seragam. Setiap perubahan aplikasi punya bagiannya sendiri tanpa menimpa dokumen awal.",
                  },
                  {
                    title: "3. Sekali Simpan, Bisa Dipakai Berulang",
                    desc: "Dokumen yang sama bisa dipakai untuk berbagai kegiatan audit dan cepat ditemukan lewat asisten AI, sesuai hak akses tim masing-masing.",
                  },
                ].map((p) => (
                  <div
                    key={p.title}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-blue-300 transition-colors"
                  >
                    <h4 className="font-bold text-slate-900 text-sm mb-1">{p.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-6 scroll-reveal opacity-0 translate-y-10 blur-sm transition-all duration-700 delay-150">
              {[
                {
                  icon: FolderKanban,
                  title: "Folder untuk Setiap Tim",
                  desc: "Admin menyiapkan folder untuk tiap tim — Digitalisasi (Produksi, Non Produksi, Data), Layanan TI, Infrastruktur TI, dan Tata Kelola TI — agar dokumen langsung tersimpan di tempat yang tepat.",
                  badge: "Terpusat",
                },
                {
                  icon: History,
                  title: "Riwayat Versi Aplikasi",
                  desc: "Saat aplikasi diperbarui (misalnya v1.1 atau v2.0), tim cukup menambah versi baru lalu mengunggah dokumennya. Dokumen versi awal (v1.0) tetap tersimpan utuh.",
                  badge: "Tertata",
                },
                {
                  icon: Database,
                  title: "Bukti Audit dari Seluruh Tim",
                  desc: "Setiap tim TI bisa mengunggah bukti audit seperti laporan SLA, uji DRC, pentest, atau SOP. Dokumen ini juga menjadi bahan pengetahuan bagi asisten AI.",
                  badge: "Bisa Dipakai Ulang",
                },
                {
                  icon: Sparkles,
                  title: "Tanya AI, Langsung Unduh",
                  desc: "Ketik dokumen yang dicari, baca ringkasannya, lalu klik Lihat atau Unduh — tanpa perlu membuka folder satu per satu.",
                  badge: "Dibantu AI",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-lg shadow-blue-900/5 hover:shadow-xl hover:-translate-y-2 hover:border-blue-400 transition-all duration-300 group"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-13 h-13 p-3.5 rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <card.icon size={24} />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                      {card.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg mb-2">{card.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION ALUR PROSES (SCROLL-REVEAL TIMELINE) ─── */}
      <section id="alur-proses" className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 scroll-reveal opacity-0 translate-y-10 blur-sm transition-all duration-700">
            <span className="inline-block px-4 py-1.5 bg-blue-100 text-blue-800 text-xs font-bold tracking-widest uppercase rounded-full mb-3">
              Cara Kerja
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
              Cara Kerja PANDA dalam 4 Langkah
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Mulai dari pendaftaran pengguna oleh Admin sampai menemukan dokumen dengan bantuan AI.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                role: "Admin",
                title: "Daftarkan Pengguna & Siapkan Folder",
                desc: "Admin mendaftarkan pegawai beserta timnya, lalu menyiapkan folder aplikasi untuk masing-masing tim.",
              },
              {
                step: "02",
                role: "Tim Pemilik Aplikasi",
                title: "Unggah Dokumen Aplikasi",
                desc: "Tim mengunggah PRD, UAT, dan BAST ke versi aplikasi yang sesuai — versi awal (v1.0) maupun versi perubahan (v1.1, dst.).",
              },
              {
                step: "03",
                role: "Seluruh Tim TI",
                title: "Unggah Bukti Audit",
                desc: "Setiap tim TI mengunggah dokumen bukti audit. Sistem otomatis mencatat siapa yang mengunggah dan kapan.",
              },
              {
                step: "04",
                role: "Seluruh Pengguna",
                title: "Cari & Unduh lewat AI",
                desc: "Cukup ketik dokumen yang dicari, baca ringkasannya, lalu klik Lihat atau Unduh.",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="scroll-reveal opacity-0 translate-y-10 blur-sm transition-all duration-700 bg-white rounded-3xl p-7 border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1.5 relative"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center mb-5 shadow-md shadow-blue-600/25">
                  {s.step}
                </div>
                <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg mb-2">
                  {s.role}
                </span>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{s.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECTION FITUR UNGGULAN & AGENTIC AI PREVIEW ─── */}
      <section id="fitur" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#0f172a] rounded-[2.5rem] p-8 sm:p-14 text-white shadow-2xl relative overflow-hidden scroll-reveal opacity-0 translate-y-10 blur-sm transition-all duration-700">
            <div className="grid lg:grid-cols-12 gap-10 items-center relative z-10">
              <div className="lg:col-span-7">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-5">
                  <Sparkles size={14} /> Asisten AI PANDA
                </span>
                <h2 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
                  Cari Dokumen Audit Cukup dengan Bertanya, Lengkap dengan Ringkasan & Tombol Unduh
                </h2>
                <p className="text-blue-100/90 text-base leading-relaxed mb-6">
                  <strong>Dokumen tetap aman:</strong> setiap pegawai hanya bisa mencari dokumen
                  milik timnya sendiri dan dokumen yang dibagikan untuk semua tim. Admin dapat
                  melihat dokumen dari seluruh tim TI PT Pusri.
                </p>
                <div className="grid sm:grid-cols-2 gap-4 mb-8">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <p className="font-bold text-sm text-cyan-300 mb-1">
                      🔍 Ringkasan Dokumen Otomatis
                    </p>
                    <p className="text-xs text-slate-300">
                      AI merangkum isi PRD, hasil uji UAT, BAST, laporan SLA, hingga hasil uji DRC dalam hitungan detik.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <p className="font-bold text-sm text-cyan-300 mb-1">
                      ⚡ Lihat & Unduh Langsung
                    </p>
                    <p className="text-xs text-slate-300">
                      Di bawah setiap jawaban AI muncul kartu dokumen yang bisa langsung dibuka atau diunduh.
                    </p>
                  </div>
                </div>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-blue-950 rounded-xl font-bold text-sm hover:bg-blue-50 transition-all shadow-lg"
                >
                  Coba Asisten AI Sekarang <ArrowRight size={16} />
                </Link>
              </div>

              <div className="lg:col-span-5 flex flex-col items-center justify-center text-center bg-slate-950/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
                <div className="w-28 h-28 living-orb-core mb-6">
                  <div className="living-orb-plasma" />
                  <div className="living-orb-gloss" />
                </div>
                <p className="text-lg font-bold text-white mb-1">
                  &ldquo;Carikan dokumen UAT SIMSKBDN versi awal&rdquo;
                </p>
                <p className="text-xs text-cyan-300 mb-4">
                  Contoh pertanyaan ke asisten AI
                </p>
                <div className="w-full text-left bg-white/10 border border-white/15 rounded-2xl p-4 text-xs text-slate-200 space-y-2">
                  <p className="font-bold text-white">
                    📄 SIMSKBDN_UAT_v1.0_20260214.pdf
                  </p>
                  <p className="text-slate-300">
                    Hasil: 28 skenario uji, semuanya lolos. Diunggah oleh Tim Digitalisasi • Non Produksi.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION PROSEDUR AKSES BADGE PEGAWAI ─── */}
      <section id="akses" className="py-20 bg-slate-900 text-white border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-black mb-3">Masuk dengan Nomor Badge Pegawai</h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto mb-8">
            Gunakan Nomor Badge Pegawai Anda yang sudah didaftarkan oleh Admin. Belum punya
            akses? Hubungi Tim Tata Kelola TI.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-blue-600/30"
          >
            <Lock size={18} /> Masuk ke Portal PANDA
          </Link>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-slate-950 text-slate-400 py-8 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/assets/pusri.png" alt="PT Pusri" className="h-8 w-auto object-contain" />
            <div className="text-xs">
              <p className="font-bold text-white">PT Pupuk Sriwidjaja Palembang</p>
              <p className="text-slate-500">PANDA — Pusat Administrasi Dokumen Audit TI</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Tata Kelola TI — PT Pusri Palembang.
          </p>
        </div>
      </footer>
    </div>
  );
}
