"use client";

import React, { useEffect, useState } from "react";
import {
  BookOpen,
  KeyRound,
  Eye,
  EyeOff,
  Save,
  PlugZap,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Gauge,
  RefreshCw,
  ListOrdered,
} from "lucide-react";
import { apiFetch, AISettings, AIQuotaDetail, AIQuotaState } from "@/lib/api";
import CustomSelect from "@/components/CustomSelect";
import RerankSettingsPanel from "@/components/RerankSettingsPanel";

export type DocsTab = "apikey" | "rerank" | "quota";

const PROVIDERS = [
  { id: "builtin", label: "Built-in Agent (Tanpa API Key)", base_url: "", model: "" },
  { id: "openai", label: "OpenAI", base_url: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  {
    id: "gemini",
    label: "Google Gemini (OpenAI-compatible)",
    base_url: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.5-flash",
  },
  { id: "groq", label: "Groq", base_url: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  { id: "custom", label: "Custom (OpenAI-compatible)", base_url: "", model: "" },
];

const SOURCE_LABELS: Record<AISettings["source"], string> = {
  database: "Database (diatur dari menu ini)",
  env: "File .env backend",
  default: "Default sistem",
};

export default function SuperAdminDocs({
  notify,
  tab,
  onTabChange,
}: {
  notify: (msg: string) => void;
  tab: DocsTab;
  onTabChange: (tab: DocsTab) => void;
}) {
  const tabs: { id: DocsTab; label: string; icon: typeof KeyRound }[] = [
    { id: "apikey", label: "API Key", icon: KeyRound },
    { id: "rerank", label: "Reranker", icon: ListOrdered },
    { id: "quota", label: "Kuota AI", icon: Gauge },
  ];
  return (
    <div className="space-y-6">
      {/* Header + Tab View */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
            <BookOpen size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Docs</h2>
            <p className="text-xs text-slate-500">Pengaturan sistem PANDA — khusus Super Admin.</p>
          </div>
        </div>

        <div role="tablist" className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => onTabChange(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                tab === t.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "apikey" && <AISettingsPanel notify={notify} />}
      {tab === "rerank" && <RerankSettingsPanel notify={notify} />}
      {tab === "quota" && <AIQuotaPanel notify={notify} />}
    </div>
  );
}

// ─── Tab "Kuota AI": pemakaian kuota LLM eksternal hari ini & 7 hari terakhir ──────

const QUOTA_STYLES: Record<AIQuotaState, { label: string; badge: string; bar: string }> = {
  OK: { label: "Aman", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", bar: "bg-emerald-500" },
  LOW: { label: "Hampir habis", badge: "bg-amber-50 text-amber-700 border-amber-200", bar: "bg-amber-500" },
  EXHAUSTED: { label: "Habis", badge: "bg-rose-50 text-rose-700 border-rose-200", bar: "bg-rose-500" },
  UNKNOWN: { label: "Batas belum diketahui", badge: "bg-slate-100 text-slate-600 border-slate-200", bar: "bg-blue-500" },
  BUILTIN: { label: "Built-in Agent", badge: "bg-slate-100 text-slate-600 border-slate-200", bar: "bg-slate-300" },
};

const formatQuotaDay = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

function AIQuotaPanel({ notify }: { notify: (msg: string) => void }) {
  const [quota, setQuota] = useState<AIQuotaDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [limitInput, setLimitInput] = useState("0");
  const [saving, setSaving] = useState(false);

  const applyQuota = (q: AIQuotaDetail) => {
    setQuota(q);
    setLimitInput(q.limit_source === "SETTING" ? String(q.limit) : "0");
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ quota: AIQuotaDetail }>("/admin/settings/ai/quota");
      applyQuota(res.quota);
    } catch (err: any) {
      notify(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSaveLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(limitInput);
    if (!Number.isInteger(n) || n < 0) {
      notify("Batas permintaan harian harus angka bulat 0 atau lebih.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch<{ quota: AIQuotaDetail }>("/admin/settings/ai/quota", {
        method: "PUT",
        body: JSON.stringify({ daily_limit: n }),
      });
      applyQuota(res.quota);
      notify(n === 0 ? "Batas kuota mengikuti provider." : `Batas kuota diatur ${n} permintaan per hari.`);
    } catch (err: any) {
      notify(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!quota) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-slate-200/80 shadow-sm flex items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 size={16} className="animate-spin" /> Memuat pemakaian kuota AI...
      </div>
    );
  }

  if (quota.status === "BUILTIN") {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm text-sm text-slate-600">
        <p className="font-black text-slate-900 mb-1">Built-in Agent aktif</p>
        Asisten tidak memakai LLM eksternal, jadi tidak ada kuota yang perlu dipantau. Atur provider & API key di
        tab <span className="font-bold">API Key</span>.
      </div>
    );
  }

  const style = QUOTA_STYLES[quota.status];
  const hasLimit = quota.limit > 0;
  const maxDaily = Math.max(1, quota.limit, ...(quota.daily ?? []).map((d) => d.success));

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 space-y-6">
        {/* Pemakaian hari ini */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-black text-slate-900 text-base">Pemakaian Kuota Hari Ini</h3>
              <p className="text-xs text-slate-500">
                Model <span className="font-mono font-bold">{quota.model}</span> • hari kuota dimulai 07.00 WIB
              </p>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-blue-700 hover:border-blue-300 disabled:opacity-60"
              aria-label="Muat ulang pemakaian kuota"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="flex items-end justify-between gap-4">
            <p className="text-4xl font-black text-slate-900 tabular-nums">
              {hasLimit || quota.status === "EXHAUSTED" ? `${quota.percent}%` : "—"}
            </p>
            <span className={`px-3 py-1 rounded-full border text-xs font-bold ${style.badge}`}>{style.label}</span>
          </div>

          <div
            className="h-3 rounded-full bg-slate-100 overflow-hidden"
            role="progressbar"
            aria-valuenow={quota.percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className={`h-full rounded-full transition-all ${style.bar}`} style={{ width: `${quota.percent}%` }} />
          </div>

          <p className="text-sm text-slate-700">
            {hasLimit ? (
              <>
                <span className="font-bold">{quota.used_today}</span> dari{" "}
                <span className="font-bold">{quota.limit}</span> permintaan terpakai • sisa{" "}
                <span className="font-bold">{quota.remaining}</span>
              </>
            ) : (
              <>
                <span className="font-bold">{quota.used_today}</span> permintaan terpakai hari ini. Isi batas harian di
                samping agar persentase bisa dihitung.
              </>
            )}
          </p>

          {quota.message && (
            <div className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-start gap-2 ${style.badge}`}>
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> {quota.message}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[
              { label: "Berhasil", value: quota.used_today },
              { label: "Gagal", value: quota.failed_today },
              { label: "Token", value: quota.tokens_today.toLocaleString("id-ID") },
              {
                label: quota.exhausted_until ? "Pulih" : "Reset",
                value: new Date(quota.exhausted_until ?? quota.resets_at).toLocaleString("id-ID", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              },
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                <p className="text-slate-500 font-semibold">{s.label}</p>
                <p className="text-slate-900 font-black text-base tabular-nums mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>

          {quota.last_error && quota.last_error_at && (
            <p className="text-[11px] text-slate-500">
              Error terakhir ({new Date(quota.last_error_at).toLocaleString("id-ID")}): {quota.last_error}
            </p>
          )}
        </div>

        {/* Rekap 7 hari */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <h3 className="font-black text-slate-900 text-base mb-4">7 Hari Terakhir</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="py-2 pr-3 font-bold">Hari kuota</th>
                  <th className="py-2 pr-3 font-bold">Pemakaian</th>
                  <th className="py-2 pr-3 font-bold text-right">Berhasil</th>
                  <th className="py-2 pr-3 font-bold text-right">Gagal</th>
                  <th className="py-2 font-bold text-right">Token</th>
                </tr>
              </thead>
              <tbody>
                {(quota.daily ?? []).map((d) => (
                  <tr key={d.day} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 pr-3 font-semibold text-slate-700 whitespace-nowrap">{formatQuotaDay(d.day)}</td>
                    <td className="py-2.5 pr-3 w-1/3">
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${hasLimit && d.success >= quota.limit ? "bg-rose-500" : "bg-blue-500"}`}
                          style={{ width: `${Math.min(100, (d.success / maxDaily) * 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums font-bold text-slate-900">{d.success}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-slate-500">{d.failed}</td>
                    <td className="py-2.5 text-right tabular-nums text-slate-500">{d.tokens.toLocaleString("id-ID")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="lg:col-span-5 space-y-6">
        {/* Batas harian */}
        <form onSubmit={handleSaveLimit} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div>
            <h3 className="font-black text-slate-900 text-base">Batas Permintaan per Hari</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {quota.limit_source === "SETTING"
                ? "Saat ini memakai batas yang Anda atur."
                : quota.limit_source === "PROVIDER"
                ? `Saat ini ${quota.limit} permintaan/hari, dibaca otomatis dari pesan provider saat kuota habis.`
                : "Belum diketahui — akan terbaca otomatis saat provider pertama kali menolak karena kuota habis."}
            </p>
          </div>
          <input
            type="number"
            min={0}
            step={1}
            value={limitInput}
            onChange={(e) => setLimitInput(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
          />
          <p className="text-[11px] text-slate-500">
            Isi 0 agar mengikuti batas dari provider. Peringatan &ldquo;hampir habis&rdquo; muncul di halaman chat saat
            pemakaian mencapai 80%.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan Batas
          </button>
        </form>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm text-xs text-slate-600 leading-relaxed space-y-2">
          <p className="font-bold text-slate-900 flex items-center gap-1.5">
            <Gauge size={15} className="text-blue-600" /> Cara Menghitung
          </p>
          <p>
            Provider tidak menyediakan data sisa kuota, jadi PANDA menghitung sendiri setiap permintaan ke LLM (chat
            &amp; upload lewat asisten) untuk model dan API key yang aktif.
          </p>
          <p>
            Bila API key yang sama juga dipakai aplikasi lain, sisa kuota sebenarnya bisa lebih kecil. Saat provider
            menolak karena kuota habis, status langsung berubah menjadi <span className="font-bold">Habis</span> sampai
            waktu pulih yang disebut provider. Angka resmi tersedia di dashboard provider (Gemini:{" "}
            <a href="https://ai.dev/rate-limit" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline">
              ai.dev/rate-limit
            </a>
            ).
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Tab "API Key": Setting Provider, Base URL, Model & API Key ──────────────────

function AISettingsPanel({ notify }: { notify: (msg: string) => void }) {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [provider, setProvider] = useState("builtin");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [shareDocContent, setShareDocContent] = useState(false);
  const [historyTurns, setHistoryTurns] = useState("10");
  const [thinkingAuto, setThinkingAuto] = useState(true);
  const [thinkingSteps, setThinkingSteps] = useState("12");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    reply?: string;
    latency_ms?: number;
  } | null>(null);

  const applySettings = (s: AISettings) => {
    setSettings(s);
    setProvider(s.provider);
    setBaseUrl(s.base_url);
    setModel(s.model);
    setApiKey("");
    setShareDocContent(!!s.share_doc_content);
    setHistoryTurns(String(s.chat_history_turns ?? 10));
    const steps = s.thinking_max_steps ?? 0;
    setThinkingAuto(steps === 0);
    setThinkingSteps(String(steps === 0 ? 12 : steps));
  };

  const maxHistoryTurns = settings?.max_chat_history_turns ?? 30;
  const historyTurnsValue = Math.min(maxHistoryTurns, Math.max(0, Math.floor(Number(historyTurns) || 0)));
  const minThinkingSteps = settings?.min_thinking_max_steps ?? 2;
  const maxThinkingSteps = settings?.max_thinking_max_steps ?? 40;
  const thinkingStepsValue = Math.min(
    maxThinkingSteps,
    Math.max(minThinkingSteps, Math.floor(Number(thinkingSteps) || minThinkingSteps))
  );

  useEffect(() => {
    apiFetch<{ settings: AISettings }>("/admin/settings/ai")
      .then((res) => applySettings(res.settings))
      .catch((err) => notify(err.message));
  }, []);

  const isBuiltin = provider === "builtin";

  const handleProviderChange = (id: string) => {
    setProvider(id);
    setTestResult(null);
    const preset = PROVIDERS.find((p) => p.id === id);
    if (preset && preset.base_url) {
      setBaseUrl(preset.base_url);
      setModel(preset.model);
    }
  };

  const formPayload = () => ({
    provider,
    base_url: baseUrl,
    model,
    share_doc_content: shareDocContent,
    chat_history_turns: historyTurnsValue,
    thinking_max_steps: thinkingAuto ? 0 : thinkingStepsValue,
    ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch<{ settings: AISettings }>("/admin/settings/ai", {
        method: "PUT",
        body: JSON.stringify(formPayload()),
      });
      applySettings(res.settings);
      notify("Pengaturan asisten disimpan dan langsung aktif.");
    } catch (err: any) {
      notify(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearKey = async () => {
    if (!window.confirm("Hapus API key tersimpan? Asisten akan kembali memakai mesin bawaan.")) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ settings: AISettings }>("/admin/settings/ai", {
        method: "PUT",
        body: JSON.stringify({ provider, base_url: baseUrl, model, clear_api_key: true }),
      });
      applySettings(res.settings);
      setTestResult(null);
      notify("API key dihapus. Asisten memakai mesin bawaan.");
    } catch (err: any) {
      notify(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiFetch<{ ok: boolean; message: string; reply?: string; latency_ms?: number }>(
        "/admin/settings/ai/test",
        { method: "POST", body: JSON.stringify(formPayload()) }
      );
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  if (!settings) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-slate-200/80 shadow-sm flex items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 size={16} className="animate-spin" /> Memuat setting AI...
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      <form onSubmit={handleSave} className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
        <div>
          <h3 className="font-black text-slate-900 text-base">Konfigurasi LLM asisten</h3>
          <p className="text-xs text-slate-500">
            Endpoint OpenAI-compatible (<code className="font-mono">/chat/completions</code>). Perubahan langsung
            berlaku tanpa restart backend.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Provider</label>
          <CustomSelect
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold bg-slate-50 text-slate-900"
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </CustomSelect>
        </div>

        {isBuiltin ? (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 leading-relaxed">
            <p className="font-bold mb-0.5">Built-in Go Smart Document Agent</p>
            Pencarian & ringkasan dokumen diproses langsung oleh backend tanpa API key eksternal, tetap mengikuti
            isolasi tim.
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Base URL</label>
              <input
                type="url"
                required
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Model</label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4o-mini"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">API Key</label>
          <div className="relative">
            <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
              placeholder={
                settings.has_api_key
                  ? `Tersimpan: ${settings.api_key_masked} — isi untuk mengganti`
                  : "Tempel API key di sini"
              }
              className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              title={showKey ? "Sembunyikan" : "Tampilkan"}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            {settings.has_api_key
              ? "Kosongkan untuk tetap memakai key yang tersimpan."
              : isBuiltin
              ? "Tidak diperlukan untuk Built-in Agent."
              : "Wajib diisi agar LLM eksternal aktif; tanpa key sistem otomatis memakai Built-in Agent."}
          </p>
        </div>

        {/* Kebijakan data: satu saklar untuk semua pengiriman isi dokumen ke LLM eksternal (default mati) */}
        {!isBuiltin && (
          <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={shareDocContent}
              onChange={(e) => setShareDocContent(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-blue-600 flex-shrink-0"
            />
            <span className="text-xs text-slate-700 leading-relaxed">
              <span className="font-bold text-slate-900 block">
                Izinkan isi dokumen dikirim ke LLM eksternal (analisis upload &amp; chat asisten)
              </span>
              Bila mati (default), isi dokumen tetap di server: LLM hanya menerima nama file, pesan user, metadata, dan
              ringkasan dari pengunggah, sehingga jawaban chat tidak memuat rincian isi file.
              Bila aktif, ±3.000 karakter awal isi file dikirim saat analisis upload, dan kutipan isi dokumen dari hasil
              tool (±3.500 karakter per panggilan tool) dikirim pada pertanyaan chat — termasuk ke reranker bila aktif.
              Pastikan sesuai kebijakan keamanan data perusahaan.
            </span>
          </label>
        )}

        {/* Memori percakapan: berapa tanya-jawab terakhir yang dibaca AI saat menjawab */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
          <label htmlFor="chat-history-turns" className="block text-xs font-bold text-slate-900 mb-1">
            Riwayat percakapan yang dibaca AI
          </label>
          <div className="flex items-center gap-2.5">
            <input
              id="chat-history-turns"
              type="number"
              min={0}
              max={maxHistoryTurns}
              step={1}
              value={historyTurns}
              onChange={(e) => setHistoryTurns(e.target.value)}
              onBlur={() => setHistoryTurns(String(historyTurnsValue))}
              className="w-24 px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono bg-white"
            />
            <span className="text-xs text-slate-600">tanya-jawab terakhir (0–{maxHistoryTurns})</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
            AI membaca sejumlah tanya-jawab terakhir di percakapan yang sama, sehingga bisa memahami pertanyaan seperti
            “tadi saya tanya apa?” atau “dokumen tersebut”. Isi 0 agar AI tidak membaca percakapan sebelumnya. Makin besar
            angkanya, makin banyak token yang terpakai per pertanyaan; setiap jawaban lama dipotong ±2.000 karakter.
            {!shareDocContent &&
              " Selama isi dokumen tidak diizinkan dikirim, jawaban lama yang memuat kutipan isi dokumen hanya dikirim sebagai judul dokumennya."}
          </p>
        </div>

        {/* Mode Thinking: otomatis (AI berhenti sendiri) atau batas keputusan agen (tiap keputusan = 1 panggilan LLM) */}
        <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/60 space-y-2.5">
          <p className="text-xs font-bold text-blue-950">Langkah penelusuran mode Thinking</p>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={thinkingAuto}
              onChange={(e) => setThinkingAuto(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-blue-600 flex-shrink-0"
            />
            <span className="text-xs text-slate-700 leading-relaxed">
              <span className="font-bold text-slate-900 block">Otomatis — AI berhenti sendiri saat bukti cukup (disarankan)</span>
              Tidak ada batas jumlah langkah: AI terus mencari dengan kueri berbeda dan membaca bagian dokumen sampai
              setiap bagian pertanyaan punya bukti. Rem pengaman tetap aktif: berhenti bila 3 langkah berturut-turut tidak
              menemukan hal baru, setelah 4 menit penelusuran, pada plafon darurat {maxThinkingSteps} langkah, atau saat
              kuota habis. User juga bisa menekan Stop kapan saja.
            </span>
          </label>
          {!thinkingAuto && (
            <div className="flex items-center gap-2.5 pl-7">
              <input
                id="thinking-max-steps"
                type="number"
                min={minThinkingSteps}
                max={maxThinkingSteps}
                step={1}
                value={thinkingSteps}
                onChange={(e) => setThinkingSteps(e.target.value)}
                onBlur={() => setThinkingSteps(String(thinkingStepsValue))}
                className="w-24 px-3 py-2 rounded-xl border border-blue-200 text-sm font-mono bg-white"
              />
              <span className="text-xs text-slate-600">
                keputusan agen maksimal ({minThinkingSteps}–{maxThinkingSteps}) — hingga {thinkingStepsValue + 1} panggilan LLM
                per pertanyaan
              </span>
            </div>
          )}
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Setiap putaran agen (memanggil satu atau beberapa tool, atau menyusun jawaban) memakai 1 panggilan LLM, sehingga
            pertanyaan Thinking lebih cepat menghabiskan kuota harian. Mode standar dibatasi 4 putaran / 8 tool call; Thinking
            hingga 30 tool call. Hasil tool lama diringkas otomatis agar token per putaran tetap hemat. Model menentukan
            tool dan kapan menjawab. Model yang tidak mendukung tool calling atau gagal merespons menampilkan error;
            mode builtin hanya dipakai saat provider Built-in dipilih.
          </p>
        </div>

        {testResult && (
          <div
            className={`p-4 rounded-2xl border text-xs leading-relaxed ${
              testResult.ok
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <p className="font-bold flex items-center gap-1.5 mb-1">
              {testResult.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {testResult.ok ? "Koneksi berhasil" : "Koneksi gagal"}
              {testResult.latency_ms !== undefined && (
                <span className="font-semibold opacity-70">• {testResult.latency_ms} ms</span>
              )}
            </p>
            <p className="break-words whitespace-pre-wrap font-mono text-[11px]">{testResult.message}</p>
            {testResult.reply && <p className="mt-1.5">Balasan model: “{testResult.reply}”</p>}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan Setting
          </button>
          {!isBuiltin && (
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-700 disabled:opacity-60 text-slate-700 text-xs font-bold flex items-center gap-1.5"
            >
              {testing ? <Loader2 size={14} className="animate-spin" /> : <PlugZap size={14} />} Tes Koneksi
            </button>
          )}
          {settings.has_api_key && (
            <button
              type="button"
              onClick={handleClearKey}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5 sm:ml-auto"
            >
              <Trash2 size={14} /> Hapus API Key
            </button>
          )}
        </div>
      </form>

      {/* Status Engine Aktif */}
      <div className="lg:col-span-5 space-y-4">
        <div className="rounded-3xl bg-blue-900 p-6 text-white shadow-xl">
          <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Engine Aktif Saat Ini</span>
          <p className="text-lg font-black mt-1 leading-snug">{settings.engine_mode}</p>
          <div className="mt-4 space-y-2 text-xs text-blue-100">
            <p>
              <span className="text-blue-300">Provider:</span>{" "}
              <span className="font-bold text-white">
                {PROVIDERS.find((p) => p.id === settings.provider)?.label || settings.provider}
              </span>
            </p>
            <p>
              <span className="text-blue-300">API key:</span>{" "}
              <span className="font-mono font-bold text-white">
                {settings.has_api_key ? settings.api_key_masked : "Belum diisi"}
              </span>
            </p>
            <p>
              <span className="text-blue-300">Isi dokumen ke LLM (upload &amp; chat):</span>{" "}
              <span className="font-bold text-white">
                {settings.share_doc_content ? "Diizinkan" : "Tidak dikirim"}
              </span>
            </p>
            <p>
              <span className="text-blue-300">Riwayat percakapan dibaca AI:</span>{" "}
              <span className="font-bold text-white">
                {settings.chat_history_turns > 0
                  ? `${settings.chat_history_turns} tanya-jawab terakhir`
                  : "Tidak dibaca"}
              </span>
            </p>
            <p>
              <span className="text-blue-300">Batas langkah Thinking:</span>{" "}
              <span className="font-bold text-white">
                {settings.thinking_max_steps > 0
                  ? `${settings.thinking_max_steps} keputusan agen`
                  : "Otomatis (AI berhenti sendiri)"}
              </span>
            </p>
            <p>
              <span className="text-blue-300">Sumber konfigurasi:</span>{" "}
              <span className="font-bold text-white">{SOURCE_LABELS[settings.source]}</span>
            </p>
            {settings.updated_at && (
              <p>
                <span className="text-blue-300">Terakhir diubah:</span>{" "}
                <span className="font-bold text-white">
                  {new Date(settings.updated_at).toLocaleString("id-ID")} (Badge {settings.updated_by_badge})
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm text-xs text-slate-600 leading-relaxed space-y-2">
          <p className="font-bold text-slate-900 flex items-center gap-1.5">
            <ShieldCheck size={15} className="text-blue-600" /> Keamanan API Key
          </p>
          <p>Key disimpan terenkripsi (AES-GCM) di database dan tidak pernah dikirim utuh ke browser.</p>
          <p>
            Bila model terkonfigurasi gagal merespons, kegagalannya ditampilkan tanpa jawaban pengganti builtin.
            Pilih provider Built-in secara eksplisit untuk pencarian tanpa model.
          </p>
        </div>
      </div>
    </div>
  );
}
