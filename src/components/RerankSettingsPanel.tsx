"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  ListOrdered,
  Loader2,
  PlugZap,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { apiFetch, RerankSettings, RerankTestResult } from "@/lib/api";
import CustomSelect from "@/components/CustomSelect";

const SOURCE_LABELS: Record<RerankSettings["source"], string> = {
  database: "Database (diatur dari menu ini)",
  env: "File .env backend",
  default: "Default sistem",
};

// Panel Super Admin → Docs → Reranker: model cross-encoder SaaS yang menilai ulang hasil tool search_documents.
export default function RerankSettingsPanel({ notify }: { notify: (msg: string) => void }) {
  const [settings, setSettings] = useState<RerankSettings | null>(null);
  const [provider, setProvider] = useState("none");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [candidates, setCandidates] = useState("30");
  const [topN, setTopN] = useState("8");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<RerankTestResult | null>(null);

  const apply = (s: RerankSettings) => {
    setSettings(s);
    setProvider(s.provider || "none");
    setBaseUrl(s.base_url);
    setModel(s.model);
    setApiKey("");
    setCandidates(String(s.candidates));
    setTopN(String(s.top_n));
  };

  useEffect(() => {
    apiFetch<{ settings: RerankSettings }>("/admin/settings/rerank")
      .then((res) => apply(res.settings))
      .catch((err) => notify(err.message));
  }, []);

  if (!settings) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-slate-200/80 shadow-sm flex items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 size={16} className="animate-spin" /> Memuat setting reranker...
      </div>
    );
  }

  const off = provider === "none";
  const clampInt = (v: string, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.floor(Number(v) || lo)));
  const candidatesValue = clampInt(candidates, settings.min_candidates, settings.max_candidates);
  const topNValue = clampInt(topN, 1, settings.max_top_n);

  const handleProviderChange = (id: string) => {
    setProvider(id);
    setTestResult(null);
    const preset = settings.presets.find((p) => p.id === id);
    if (preset && preset.base_url) {
      setBaseUrl(preset.base_url);
      setModel(preset.model);
    }
  };

  const formPayload = () => ({
    provider,
    base_url: baseUrl,
    model,
    candidates: candidatesValue,
    top_n: topNValue,
    ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch<{ settings: RerankSettings }>("/admin/settings/rerank", {
        method: "PUT",
        body: JSON.stringify(formPayload()),
      });
      apply(res.settings);
      notify(res.settings.enabled ? "Reranker aktif & langsung dipakai di pencarian." : "Setting reranker disimpan.");
    } catch (err: any) {
      notify(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearKey = async () => {
    if (!window.confirm("Hapus API key reranker? Pencarian kembali memakai penilaian ulang heuristik.")) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ settings: RerankSettings }>("/admin/settings/rerank", {
        method: "PUT",
        body: JSON.stringify({ provider, base_url: baseUrl, model, clear_api_key: true }),
      });
      apply(res.settings);
      setTestResult(null);
      notify("API key reranker dihapus.");
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
      setTestResult(
        await apiFetch<RerankTestResult>("/admin/settings/rerank/test", { method: "POST", body: JSON.stringify(formPayload()) })
      );
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      <form onSubmit={handleSave} className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
        <div>
          <h3 className="font-black text-slate-900 text-base">Reranker Pencarian Agentic AI</h3>
          <p className="text-xs text-slate-500">
            Model cross-encoder yang menilai ulang kandidat hasil tool <code className="font-mono">search_documents</code>.
            Endpoint <code className="font-mono">POST /rerank</code> kompatibel Cohere, Jina, atau Voyage. Perubahan langsung berlaku.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Provider</label>
          <CustomSelect
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold bg-slate-50 text-slate-900"
          >
            <option value="none">Nonaktif — penilaian ulang heuristik</option>
            {settings.presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </CustomSelect>
        </div>

        {off ? (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
            <p className="font-bold text-slate-800 mb-0.5">Heuristik bawaan</p>
            Temuan diurutkan dengan gabungan RRF, BM25, cakupan & kedekatan kata kunci, metadata dokumen, dan versi terbaru.
            Tidak ada data yang dikirim ke layanan luar.
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <label className="block text-xs font-bold text-slate-700 mb-1">Base URL</label>
                <input
                  type="url"
                  required
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.cohere.com/v2"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-xs font-bold text-slate-700 mb-1">Model</label>
                <input
                  type="text"
                  required
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="rerank-v3.5"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">API Key</label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  autoComplete="off"
                  placeholder={settings.has_api_key ? `Tersimpan: ${settings.api_key_masked} — isi untuk mengganti` : "Tempel API key reranker"}
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
                {settings.has_api_key ? "Kosongkan untuk tetap memakai key yang tersimpan." : "Disimpan terenkripsi, sama seperti API key LLM."}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                <label htmlFor="rerank-candidates" className="block text-xs font-bold text-slate-900 mb-1">
                  Kandidat dinilai ulang
                </label>
                <input
                  id="rerank-candidates"
                  type="number"
                  min={settings.min_candidates}
                  max={settings.max_candidates}
                  value={candidates}
                  onChange={(e) => setCandidates(e.target.value)}
                  onBlur={() => setCandidates(String(candidatesValue))}
                  className="w-24 px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono bg-white"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {settings.min_candidates}–{settings.max_candidates} potongan per pencarian. Makin banyak, makin lengkap tetapi lebih lambat.
                </p>
              </div>
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                <label htmlFor="rerank-topn" className="block text-xs font-bold text-slate-900 mb-1">
                  Temuan dikirim ke LLM
                </label>
                <input
                  id="rerank-topn"
                  type="number"
                  min={1}
                  max={settings.max_top_n}
                  value={topN}
                  onChange={(e) => setTopN(e.target.value)}
                  onBlur={() => setTopN(String(topNValue))}
                  className="w-24 px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono bg-white"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">1–{settings.max_top_n} temuan teratas per pencarian (model bisa meminta lebih sedikit).</p>
              </div>
            </div>

            {settings.content_shared ? (
              <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 text-xs text-amber-900 leading-relaxed flex gap-2.5">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <span>
                  <span className="font-bold block">Isi potongan dokumen dikirim ke provider reranker</span>
                  Saklar “isi dokumen boleh dikirim” di tab API Key sedang aktif, sehingga judul, metadata, dan hingga ±1.500 karakter
                  isi setiap kandidat dikirim ke layanan SaaS ini. Untuk produksi, pertimbangkan endpoint self-hosted (Custom).
                </span>
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-900 leading-relaxed flex gap-2.5">
                <ShieldCheck size={16} className="flex-shrink-0 mt-0.5" />
                <span>
                  <span className="font-bold block">Isi file tetap di server</span>
                  Saklar isi dokumen sedang mati: reranker hanya menerima judul, kategori, aplikasi, versi, dan ringkasan pengunggah.
                  Kualitas penilaian lebih rendah dibanding saat isi potongan ikut dikirim.
                </span>
              </div>
            )}
          </>
        )}

        {testResult && (
          <div
            className={`p-4 rounded-2xl border text-xs leading-relaxed ${
              testResult.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <p className="font-bold flex items-center gap-1.5 mb-1">
              {testResult.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {testResult.ok ? "Reranker merespons" : "Reranker gagal"}
              {testResult.latency_ms !== undefined && <span className="font-semibold opacity-70">• {testResult.latency_ms} ms</span>}
            </p>
            <p>{testResult.message}</p>
            {testResult.ranking && testResult.ranking.length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                <p className="text-[11px] opacity-80">
                  Kueri contoh: <strong>“{testResult.query}”</strong> — urutan teks contoh (bukan isi dokumen):
                </p>
                <ol className="space-y-1">
                  {testResult.ranking.map((r, i) => (
                    <li key={r.text} className="flex items-center gap-2 rounded-lg bg-white/70 px-2 py-1 text-slate-700">
                      <span className="w-4 text-right font-bold text-slate-500">{i + 1}</span>
                      <span className="flex-1 min-w-0 truncate">{r.text}</span>
                      <span className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden" title={`Skor ${r.score.toFixed(3)}`}>
                        <span className="block h-full rounded-full bg-violet-500" style={{ width: `${Math.max(4, Math.min(100, r.score * 100))}%` }} />
                      </span>
                      <span className="w-12 text-right font-mono text-[10px] text-slate-500">{r.score.toFixed(3)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold shadow-lg shadow-blue-600/25 flex items-center gap-1.5"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan Setting
          </button>
          {!off && (
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60 text-xs font-bold flex items-center gap-1.5"
            >
              {testing ? <Loader2 size={14} className="animate-spin" /> : <PlugZap size={14} />} Tes Reranker
            </button>
          )}
          {settings.has_api_key && (
            <button
              type="button"
              onClick={handleClearKey}
              disabled={saving}
              className="px-4 py-3 rounded-2xl text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5"
            >
              <Trash2 size={14} /> Hapus Key
            </button>
          )}
        </div>
      </form>

      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Status</p>
          <div className="flex items-center gap-2.5">
            <span
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                settings.enabled ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              <ListOrdered size={17} />
            </span>
            <div className="min-w-0">
              <p className="font-black text-slate-900 text-sm truncate">
                {settings.enabled ? `${settings.provider}:${settings.model}` : "Heuristik bawaan"}
              </p>
              <p className="text-[11px] text-slate-500">
                {settings.enabled
                  ? `${settings.candidates} kandidat → ${settings.top_n} temuan per pencarian`
                  : settings.provider !== "none"
                    ? "Provider dipilih tetapi belum lengkap (base URL, model, atau API key)"
                    : "Reranker model nonaktif"}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Sumber: {SOURCE_LABELS[settings.source]}
            {settings.updated_by_badge ? ` · diubah oleh ${settings.updated_by_badge}` : ""}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm text-xs text-slate-600 leading-relaxed space-y-2.5">
          <p className="font-black text-slate-900 text-sm">Cara kerja</p>
          <ol className="list-decimal pl-4 space-y-1.5">
            <li>
              AI memanggil tool <code className="font-mono">search_documents</code>; backend mengambil hingga{" "}
              {settings.candidates} kandidat dari indeks kata & metadata, hanya dari dokumen dalam cakupan akses user.
            </li>
            <li>Kandidat dinilai ulang oleh model reranker (header judul/kategori/aplikasi/versi + isi atau ringkasan).</li>
            <li>Skor akhir = 0,75 skor model + 0,25 heuristik (versi terbaru & metadata tetap berpengaruh).</li>
            <li>{settings.top_n} temuan teratas dikirim ke LLM. Detailnya tampil di log langkah AI.</li>
          </ol>
          <p className="text-[11px] text-slate-500">
            Bila reranker gagal atau melewati 8 detik, pencarian tetap jalan dengan heuristik dan alasannya dicatat di log.
            Pemakaian tercatat di tab Kuota AI sebagai provider <code className="font-mono">rerank:*</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
