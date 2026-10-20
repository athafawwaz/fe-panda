"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  ShieldCheck,
  Layers,
  CheckCircle2,
  Cpu,
  FolderKanban,
  Zap,
  MousePointerClick,
} from "lucide-react";

const MIN_LOADING_MS = 2200;

export interface LoaderTriggerDetail {
  targetPath?: string;
  customTitle?: string;
}

export function triggerPageLoader(detail?: LoaderTriggerDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<LoaderTriggerDetail>("panda:start-loader", {
      detail: detail || {},
    })
  );
}

interface RouteConfig {
  badge: string;
  title: string;
  subtitle: string;
  steps: { label: string; icon: React.ElementType }[];
}

function getRouteConfig(path: string, customTitle?: string): RouteConfig {
  if (path.startsWith("/dashboard")) {
    return {
      badge: "PANDA GOVERNANCE WORKSPACE",
      title: customTitle || "Menyiapkan Ruang Kerja Dashboard",
      subtitle:
        "Menyinkronkan repositori dokumen SDLC, Evidence lintas tim, & PANDA Cortex AI",
      steps: [
        { label: "Memverifikasi sesi & otorisasi Badge Pegawai", icon: ShieldCheck },
        { label: "Memuat isolasi Folder Tim, Aplikasi & Versioning", icon: FolderKanban },
        { label: "Mengaktifkan indeks PANDA Cortex Agentic AI", icon: Cpu },
      ],
    };
  }

  if (path.startsWith("/login")) {
    return {
      badge: "PORTAL AUTENTIKASI BADGE",
      title: customTitle || "Menyiapkan Gerbang Login PANDA",
      subtitle:
        "Memuat modul keamanan autentikasi Nomor Badge Pegawai PT Pusri Palembang",
      steps: [
        { label: "Menginisialisasi koneksi aman ke server PANDA", icon: ShieldCheck },
        { label: "Memuat kebijakan akses Role & Segmen Tim TI", icon: Layers },
        { label: "Menyiapkan formulir autentikasi pengguna", icon: Sparkles },
      ],
    };
  }

  return {
    badge: "PT PUPUK SRIWIDJAJA PALEMBANG",
    title: customTitle || "Memuat Portal Utama PANDA",
    subtitle:
      "Pusat Administrasi Dokumen Audit TI Terintegrasi Agentic AI",
    steps: [
      { label: "Menghubungkan ke repositori dokumen audit terpusat", icon: Layers },
      { label: "Menyinkronkan metrik kepatuhan & statistik real-time", icon: ShieldCheck },
      { label: "Menyiapkan antarmuka interaktif PANDA", icon: Sparkles },
    ],
  };
}

const INTERACTIVE_TIPS = [
  {
    tag: "Tips Agentic AI",
    text: "Gunakan tombol 📎 di menu PANDA Agentic AI untuk mengunggah dokumen dengan rekomendasi tujuan & kategori otomatis.",
  },
  {
    tag: "Tab View Versioning",
    text: "Setiap perubahan aplikasi (v1.1, v2.0) memiliki tab section sendiri tanpa menimpa dokumen pembuatan awal (v1.0).",
  },
  {
    tag: "Pencarian Instan",
    text: "Cukup ketik pertanyaan natural seperti 'Cari UAT SIMSKBDN' untuk melihat ringkasan & tombol unduh langsung.",
  },
  {
    tag: "Isolasi Tim & Branch",
    text: "Dokumen terlindungi sesuai hak akses Tim & Branch masing-masing, ditambah dukungan Evidence All Tim.",
  },
];

function isLandingAndLoginTransition(fromPath: string, toPath: string): boolean {
  const cleanFrom = fromPath.split("?")[0].replace(/\/+$/, "") || "/";
  const cleanTo = toPath.split("?")[0].replace(/\/+$/, "") || "/";
  return (
    (cleanFrom === "/" && cleanTo === "/login") ||
    (cleanFrom === "/login" && cleanTo === "/")
  );
}

export default function PageTransitionLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [targetPath, setTargetPath] = useState<string>(pathname || "/");
  const [customTitle, setCustomTitle] = useState<string | undefined>(undefined);

  // Interactive states
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [tipIndex, setTipIndex] = useState(0);
  const [boostCount, setBoostCount] = useState(0);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const startTimeRef = useRef<number>(Date.now());
  const rafRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPathnameRef = useRef<string>(pathname);
  const activeRunIdRef = useRef<number>(0);

  const startLoadingCycle = useCallback(
    (nextPath: string, titleOverride?: string) => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      const runId = ++activeRunIdRef.current;
      const now = Date.now();
      startTimeRef.current = now;

      setTargetPath(nextPath);
      setCustomTitle(titleOverride);
      setExiting(false);
      setVisible(true);
      setProgress(0);

      const animateProgress = () => {
        if (activeRunIdRef.current !== runId) return;
        const elapsed = Date.now() - startTimeRef.current;
        const ratio = Math.min(1, elapsed / MIN_LOADING_MS);
        // Smooth cubic ease-out curve from 0 to 100
        const eased = 1 - Math.pow(1 - ratio, 2.6);
        const currentPct = Math.min(100, Math.round(eased * 100));
        setProgress(currentPct);

        if (ratio < 1) {
          rafRef.current = requestAnimationFrame(animateProgress);
        } else {
          setProgress(100);
          setExiting(true);
          exitTimeoutRef.current = setTimeout(() => {
            if (activeRunIdRef.current === runId) {
              setVisible(false);
              setExiting(false);
              setBoostCount(0);
            }
          }, 420);
        }
      };

      rafRef.current = requestAnimationFrame(animateProgress);
    },
    []
  );

  // 1. Trigger on initial mount / page refresh
  useEffect(() => {
    setTargetPath(window.location.pathname || pathname || "/");
    startLoadingCycle(window.location.pathname || pathname || "/");
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    };
  }, [startLoadingCycle]);

  // 2. Trigger when Next.js pathname changes
  useEffect(() => {
    if (pathname && pathname !== lastPathnameRef.current) {
      const prevPath = lastPathnameRef.current;
      lastPathnameRef.current = pathname;

      // Skip loading animation between landing page ("/") and login page ("/login") both ways
      if (isLandingAndLoginTransition(prevPath, pathname)) {
        if (visible) {
          if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
          if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          setVisible(false);
          setExiting(false);
        }
        return;
      }

      // If a loader cycle was just started within the last 600ms (e.g. via link click or login trigger),
      // keep the existing cycle running smoothly while updating its target path.
      const elapsedSinceStart = Date.now() - startTimeRef.current;
      if (visible && !exiting && elapsedSinceStart < 600) {
        setTargetPath(pathname);
      } else {
        startLoadingCycle(pathname);
      }
    }
  }, [pathname, visible, exiting, startLoadingCycle]);

  // 3. Listen for custom event (`triggerPageLoader`) and internal link clicks between pages
  useEffect(() => {
    const onCustomStart = (e: Event) => {
      const detail = (e as CustomEvent<LoaderTriggerDetail>).detail;
      const target = detail?.targetPath || pathname || "/";
      if (isLandingAndLoginTransition(window.location.pathname, target)) {
        return;
      }
      startLoadingCycle(target, detail?.customTitle);
    };

    const onDocumentClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:") || anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        // Skip API download links
        if (url.pathname.startsWith("/api/")) return;
        // Skip loading between landing page and login page both ways
        if (isLandingAndLoginTransition(window.location.pathname, url.pathname)) {
          return;
        }
        if (url.pathname !== window.location.pathname) {
          startLoadingCycle(url.pathname);
        }
      } catch {
        // Ignore malformed URLs
      }
    };

    window.addEventListener("panda:start-loader", onCustomStart);
    document.addEventListener("click", onDocumentClick, true);
    return () => {
      window.removeEventListener("panda:start-loader", onCustomStart);
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, [pathname, startLoadingCycle]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 28;
    const y = (e.clientY / window.innerHeight - 0.5) * 28;
    setMousePos({ x, y });
  };

  const handleInteractiveBoost = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now() + Math.random();
    setRipples((prev) => [...prev.slice(-4), { id, x, y }]);
    setBoostCount((c) => c + 1);
    setTipIndex((prev) => (prev + 1) % INTERACTIVE_TIPS.length);
  };

  if (!visible) return null;

  const config = getRouteConfig(targetPath, customTitle);
  const currentTip = INTERACTIVE_TIPS[tipIndex];
  const activeStepIndex =
    progress < 36 ? 0 : progress < 74 ? 1 : 2;

  return (
    <div
      onMouseMove={handleMouseMove}
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 overflow-hidden bg-[#070d1d] select-none transition-all duration-400 ${
        exiting ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* Interactive Parallax Background Grid & Ambient Orbs */}
      <div
        className="absolute inset-0 pointer-events-none transition-transform duration-200 ease-out"
        style={{
          transform: `translate3d(${mousePos.x * -0.6}px, ${mousePos.y * -0.6}px, 0)`,
        }}
      >
        <div className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] bg-blue-600/25 rounded-full blur-[130px] animate-pulse" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/20 rounded-full blur-[130px]" />
        <div className="absolute top-[30%] right-[20%] w-72 h-72 bg-indigo-600/15 rounded-full blur-[100px]" />
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.06]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="panda-loader-grid"
              width="44"
              height="44"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 44 0 L 0 0 0 44"
                fill="none"
                stroke="white"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#panda-loader-grid)" />
        </svg>
      </div>

      {/* Main 3D Interactive Glass Card */}
      <div
        style={{
          transform: `perspective(1100px) rotateY(${mousePos.x * 0.18}deg) rotateX(${
            mousePos.y * -0.18
          }deg)`,
        }}
        className="relative z-10 w-full max-w-lg rounded-[2.5rem] bg-slate-900/75 backdrop-blur-2xl border border-white/15 p-7 sm:p-9 shadow-2xl shadow-blue-950/60 transition-transform duration-150 ease-out"
      >
        {/* Top Header: Pusri Brand & Status Pill */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/pusri.png"
              alt="PT Pusri Palembang"
              className="h-8 w-auto object-contain"
            />
            <span className="px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-cyan-300 text-[10px] font-extrabold uppercase tracking-wider">
              {config.badge}
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold tabular-nums">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            {progress}%
          </span>
        </div>

        {/* Center Interactive Living 3D Orb */}
        <div className="flex flex-col items-center justify-center my-4">
          <div
            onClick={handleInteractiveBoost}
            title="Klik untuk interaksi & lihat tips berikutnya"
            className="relative w-32 h-32 flex items-center justify-center cursor-pointer group"
          >
            {/* Outer SVG Circular Progress Ring */}
            <svg
              className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
              viewBox="0 0 120 120"
            >
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="3"
              />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="url(#loaderRingGrad)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={339.29}
                strokeDashoffset={339.29 - (339.29 * progress) / 100}
                className="transition-all duration-75"
              />
              <defs>
                <linearGradient id="loaderRingGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>
            </svg>

            {/* Click Ripple Waves */}
            {ripples.map((r) => (
              <span
                key={r.id}
                style={{ left: r.x, top: r.y }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-cyan-300/70 animate-ping pointer-events-none"
              />
            ))}

            {/* 3D Living Orb Core */}
            <div
              className={`w-20 h-20 living-orb-core transition-transform duration-300 group-hover:scale-110 group-active:scale-95 ${
                boostCount > 0 ? "ring-4 ring-cyan-400/40" : ""
              }`}
            >
              <div
                className={`living-orb-plasma ${
                  boostCount > 0 ? "living-orb-plasma-fast" : ""
                }`}
              />
              <div className="living-orb-gloss" />
            </div>
          </div>

          <button
            type="button"
            onClick={handleInteractiveBoost}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-cyan-300 transition-colors"
          >
            <MousePointerClick size={12} />
            {boostCount > 0
              ? `Pulse Aktif (${boostCount}x) • Klik untuk ganti info`
              : "Interaktif: Klik Orb untuk Pulse & Info"}
          </button>
        </div>

        {/* Title & Subtitle */}
        <div className="text-center mb-5">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {config.title}
          </h2>
          <p className="text-xs text-slate-300/85 mt-1 leading-relaxed">
            {config.subtitle}
          </p>
        </div>

        {/* Animated Gradient Progress Bar */}
        <div className="mb-5">
          <div className="h-2.5 w-full rounded-full bg-slate-800/90 border border-white/10 overflow-hidden p-0.5">
            <div
              style={{ width: `${progress}%` }}
              className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400 shadow-[0_0_16px_rgba(56,189,248,0.65)] transition-all duration-75"
            />
          </div>
        </div>

        {/* Dynamic 3-Stage Telemetry Checklist */}
        <div className="space-y-2 mb-5">
          {config.steps.map((step, idx) => {
            const StepIcon = step.icon;
            const isDone = idx < activeStepIndex || progress === 100;
            const isCurrent = idx === activeStepIndex && progress < 100;
            return (
              <div
                key={step.label}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl border text-xs transition-all duration-300 ${
                  isDone
                    ? "bg-emerald-500/10 border-emerald-400/25 text-emerald-200"
                    : isCurrent
                    ? "bg-blue-500/15 border-blue-400/35 text-white shadow-sm"
                    : "bg-white/[0.03] border-white/5 text-slate-500"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isDone
                      ? "bg-emerald-500 text-slate-950"
                      : isCurrent
                      ? "bg-blue-600 text-white animate-pulse"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {isDone ? <CheckCircle2 size={14} /> : <StepIcon size={13} />}
                </div>
                <span className="font-bold flex-1 truncate">{step.label}</span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider">
                  {isDone ? "Selesai" : isCurrent ? "Memproses..." : "Menunggu"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Interactive Tip / Insight Card */}
        <div
          onClick={handleInteractiveBoost}
          className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-cyan-300">
              <Zap size={11} /> {currentTip.tag}
            </span>
            <div className="flex items-center gap-1">
              {INTERACTIVE_TIPS.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === tipIndex ? "w-4 bg-cyan-400" : "w-1.5 bg-white/20"
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {currentTip.text}
          </p>
        </div>
      </div>
    </div>
  );
}
