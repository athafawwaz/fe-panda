"use client";

import React, { useEffect, useState } from "react";
import {
  FileText,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Eye,
  Download,
  X,
  FolderKanban,
  Lock,
} from "lucide-react";
import {
  apiFetch,
  AIUploadAnalysis,
  AIUploadConfirmResult,
  AIRankedOption,
  MasterTeam,
} from "@/lib/api";
import CustomSelect from "@/components/CustomSelect";
import DocumentDownloadButton from "@/components/DocumentDownloadButton";

// Kartu upload via Agentic AI: AI hanya menyajikan PILIHAN berperingkat + alasannya.
// Tidak ada pilihan yang terpilih otomatis; tujuan, kategori, dan judul wajib ditentukan user.

const CATEGORY_LABELS: Record<string, string> = {
  PRD: "PRD (Product Requirements)",
  UAT: "UAT (User Acceptance Test)",
  BAST: "BAST (Berita Acara Serah Terima)",
  FSD: "FSD / Arsitektur Teknis",
  SOP: "SOP / Kebijakan TI",
  SLA: "Laporan SLA & Insiden",
  DRC: "Laporan Uji DRC & Backup",
  PENTEST: "Laporan VAPT / Pentest",
  LAINNYA: "Dokumen Lainnya",
};

type CardStatus = "analyzing" | "ready" | "saving" | "saved" | "cancelled" | "error";

interface CardForm {
  destKey: string;
  category: string;
  title: string;
  version: string;
  tags: string;
  summary: string;
  validUntil: string;
  visibility: "" | "ALL_TIM" | "TEAM_ONLY";
  teamId: string;
  branchId: string;
  ackDuplicate: boolean;
}

interface CardState {
  status: CardStatus;
  analysis?: AIUploadAnalysis;
  result?: AIUploadConfirmResult;
  error?: string;
  form: CardForm;
}

const emptyForm: CardForm = {
  destKey: "",
  category: "",
  title: "",
  version: "",
  tags: "",
  summary: "",
  validUntil: "",
  visibility: "",
  teamId: "",
  branchId: "",
  ackDuplicate: false,
};

// Disimpan di level modul agar status kartu bertahan saat user berpindah menu (komponen di-mount ulang)
// dan file tidak dianalisis dua kali.
const cardCache = new Map<string, CardState>();
// Analisis yang sedang berjalan: komponen yang di-mount ulang ikut menunggu promise yang sama.
const analyzing = new Map<string, Promise<void>>();

const formatSize = (bytes: number) =>
  bytes >= 1 << 20 ? `${(bytes / (1 << 20)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export default function AIUploadCard({
  entryId,
  file,
  message,
  teams,
  onSaved,
  onPreview,
}: {
  entryId: string;
  file: File;
  message: string;
  teams: MasterTeam[];
  onSaved: (result: AIUploadConfirmResult) => void;
  onPreview: (doc: { id: string; title: string; stdName: string; uploader: string; time: string }) => void;
}) {
  const [state, setStateRaw] = useState<CardState>(
    () => cardCache.get(entryId) ?? { status: "analyzing", form: emptyForm }
  );
  const setState = (updater: (prev: CardState) => CardState) =>
    setStateRaw((prev) => {
      const next = updater(prev);
      cardCache.set(entryId, next);
      return next;
    });
  const setForm = (patch: Partial<CardForm>) =>
    setState((prev) => ({ ...prev, form: { ...prev.form, ...patch } }));

  useEffect(() => {
    const cached = cardCache.get(entryId);
    if (cached) {
      setStateRaw(cached);
      return;
    }
    let pending = analyzing.get(entryId);
    if (!pending) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("message", message);
      // Hasil ditulis ke cache modul (bukan lewat setState komponen) agar tetap tersimpan walau komponen
      // yang memulai analisis sudah unmount.
      pending = apiFetch<AIUploadAnalysis>("/ai/upload/analyze", { method: "POST", body: fd })
        .then((analysis): CardState => ({ status: "ready", analysis, form: emptyForm }))
        .catch((err): CardState => ({ status: "error", error: err.message, form: emptyForm }))
        .then((next) => {
          cardCache.set(entryId, next);
          analyzing.delete(entryId);
        });
      analyzing.set(entryId, pending);
    }
    let active = true;
    pending.then(() => active && setStateRaw(cardCache.get(entryId)!));
    return () => {
      active = false;
    };
  }, [entryId]);

  const { status, analysis, form, result } = state;

  if (status === "analyzing") {
    return (
      <div className="bg-white rounded-3xl rounded-tl-md px-5 py-4 border border-blue-200 shadow-sm flex items-center gap-3">
        <Loader2 size={16} className="animate-spin text-blue-600" />
        <span className="text-xs font-bold text-slate-600">
          PANDA AI sedang membaca <span className="text-blue-700">{file.name}</span> & menyiapkan pilihan
          tujuan...
        </span>
      </div>
    );
  }

  if (status === "error" || !analysis) {
    return (
      <div className="bg-rose-50 rounded-3xl rounded-tl-md p-5 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold mb-0.5">File tidak dapat diproses</p>
          <p>{state.error || "Terjadi kesalahan."}</p>
        </div>
      </div>
    );
  }

  const sugg = analysis.suggestion;
  const dest = analysis.candidates.find((c) => c.key === form.destKey);
  const isEvidence = dest?.kind === "EVIDENCE";
  const needsVisibility = analysis.is_admin && isEvidence;
  const teamBranches = teams.find((t) => t.id === form.teamId)?.branches || [];
  const destRank = sugg.destinations.findIndex((d) => d.value === form.destKey);
  const catRank = sugg.categories.findIndex((c) => c.value === form.category);

  const missing: string[] = [];
  if (!form.destKey) missing.push("tujuan");
  if (!form.category) missing.push("kategori");
  if (!form.title.trim()) missing.push("judul");
  if (needsVisibility && !form.visibility) missing.push("visibilitas");
  if (needsVisibility && form.visibility === "TEAM_ONLY" && !form.teamId) missing.push("tim tujuan");
  if (analysis.duplicate && !form.ackDuplicate) missing.push("konfirmasi duplikat");

  const handleConfirm = async () => {
    setState((prev) => ({ ...prev, status: "saving", error: undefined }));
    try {
      const res = await apiFetch<AIUploadConfirmResult>("/ai/upload/confirm", {
        method: "POST",
        body: JSON.stringify({
          staging_id: analysis.staging_id,
          destination_key: form.destKey,
          category: form.category,
          title: form.title,
          version_label: isEvidence ? form.version : "",
          audit_tags: form.tags,
          valid_until: form.validUntil,
          summary: form.summary,
          visibility_scope: needsVisibility ? form.visibility : "",
          target_team_id: needsVisibility && form.visibility === "TEAM_ONLY" ? form.teamId : "",
          target_branch_id: needsVisibility && form.visibility === "TEAM_ONLY" ? form.branchId : "",
        }),
      });
      setState((prev) => ({ ...prev, status: "saved", result: res }));
      onSaved(res);
    } catch (err: any) {
      setState((prev) => ({ ...prev, status: "ready", error: err.message }));
    }
  };

  const handleCancel = async () => {
    try {
      await apiFetch(`/ai/upload/${analysis.staging_id}`, { method: "DELETE" });
    } catch {
      // Sesi sudah tidak ada (mis. kedaluwarsa) — tetap tandai batal; janitor backend membersihkan file
    }
    setState((prev) => ({ ...prev, status: "cancelled" }));
  };

  // ── Status akhir ──
  if (status === "cancelled") {
    return (
      <div className="bg-slate-50 rounded-3xl rounded-tl-md px-5 py-4 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
        <X size={14} /> Upload <strong className="text-slate-700">{analysis.file.name}</strong> dibatalkan. File
        sementara sudah dihapus dan tidak tersimpan di repositori.
      </div>
    );
  }

  if (status === "saved" && result) {
    const doc = result.document;
    return (
      <div className="bg-emerald-50 rounded-3xl rounded-tl-md p-5 border border-emerald-200 space-y-3">
        <p className="text-sm font-bold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 size={17} /> Dokumen tersimpan
        </p>
        <div className="text-xs text-emerald-900 space-y-1">
          <p>
            <strong>[{doc.doc_category}] {doc.title}</strong> ({doc.version_label})
          </p>
          <p className="font-mono text-emerald-800">{doc.standardized_name}</p>
          <p>Lokasi: {dest?.label || "-"}</p>
          <p>Akses dokumen: {result.location}</p>
          {result.content_index?.note && <p className="text-emerald-700">ℹ️ {result.content_index.note}</p>}
          {result.content_index?.source === "FILE" && (
            <p className="text-emerald-700">
              ✓ Isi file dibaca & diindeks untuk pencarian Agentic AI ({result.content_index.chunks} potongan).
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() =>
              onPreview({
                id: doc.id,
                title: doc.title,
                stdName: doc.standardized_name,
                uploader: `${doc.uploaded_by_name} (Badge ${doc.uploaded_by_badge})`,
                time: new Date(doc.uploaded_at).toLocaleString("id-ID"),
              })
            }
            className="px-4 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100"
          >
            <Eye size={14} /> Klik Lihat
          </button>
          <DocumentDownloadButton
            docId={doc.id}
            filename={doc.standardized_name}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Download size={14} /> Download
          </DocumentDownloadButton>
        </div>
      </div>
    );
  }

  // ── Form pilihan ──
  const sourceBadge = (o: AIRankedOption) => (
    <span
      className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
        o.source === "LLM" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      {o.source === "LLM" ? "LLM" : "Built-in"}
    </span>
  );

  const otherCategories = analysis.categories.filter((c) => !sugg.categories.some((s) => s.value === c));
  const appCandidates = analysis.candidates.filter((c) => c.kind === "APPLICATION");
  const folderGroups = Array.from(new Set(appCandidates.map((c) => c.folder_name || "-")));

  return (
    <div className="bg-white rounded-3xl rounded-tl-md border border-blue-200 shadow-sm overflow-hidden">
      {/* Info file */}
      <div className="px-5 py-4 bg-blue-50/60 border-b border-blue-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
            <FileText size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{analysis.file.name}</p>
            <p className="text-[11px] text-slate-500">
              {formatSize(analysis.file.size_bytes)} • SHA-256 {analysis.file.sha256.slice(0, 12)}…
            </p>
          </div>
        </div>
        <span
          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
            sugg.content_shared_with_llm
              ? "bg-amber-50 text-amber-800 border-amber-200"
              : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}
        >
          <Lock size={11} />
          {sugg.content_shared_with_llm
            ? "Cuplikan isi dikirim ke LLM eksternal"
            : "Isi dokumen tidak dikirim ke LLM eksternal"}
        </span>
      </div>

      <div className="p-5 space-y-5">
        <p className="text-xs text-slate-600 leading-relaxed">
          <Sparkles size={13} className="inline text-blue-600 mr-1 -mt-0.5" />
          Saya menyiapkan <strong>pilihan</strong> berdasarkan nama file, pesan Anda, dan isi dokumen. Saya{" "}
          <strong>tidak memilihkan</strong> — silakan tentukan sendiri tujuan, kategori, dan judulnya.
          <span className="block text-[10px] text-slate-400 mt-1">Engine: {sugg.engine}</span>
          {sugg.content_note && <span className="block text-[11px] text-amber-700 mt-1">ℹ️ {sugg.content_note}</span>}
        </p>

        {analysis.duplicate && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-2">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle size={14} /> File yang identik sudah ada di repositori
            </p>
            <p>
              [{analysis.duplicate.doc_category}] <strong>{analysis.duplicate.title}</strong> (
              {analysis.duplicate.version_label}) — diunggah {analysis.duplicate.uploaded_by_name} pada{" "}
              {new Date(analysis.duplicate.uploaded_at).toLocaleString("id-ID")}. Sesuai pilar Reusability,
              pertimbangkan memakai dokumen yang sudah ada.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() =>
                  onPreview({
                    id: analysis.duplicate!.id,
                    title: analysis.duplicate!.title,
                    stdName: analysis.duplicate!.standardized_name,
                    uploader: `${analysis.duplicate!.uploaded_by_name} (Badge ${analysis.duplicate!.uploaded_by_badge})`,
                    time: new Date(analysis.duplicate!.uploaded_at).toLocaleString("id-ID"),
                  })
                }
                className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 font-bold hover:bg-amber-100"
              >
                Lihat dokumen yang ada
              </button>
              <label className="flex items-center gap-1.5 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.ackDuplicate}
                  onChange={(e) => setForm({ ackDuplicate: e.target.checked })}
                />
                Saya tetap ingin mengunggah sebagai dokumen baru
              </label>
            </div>
          </div>
        )}

        {/* 1. Tujuan */}
        <section>
          <p className="text-xs font-black text-slate-900 mb-2">
            1. Pilih tujuan penyimpanan <span className="text-rose-600">*</span>
          </p>
          {sugg.destinations.length > 0 ? (
            <div className="grid gap-2">
              {sugg.destinations.map((d, i) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setForm({ destKey: d.value })}
                  className={`text-left p-3 rounded-2xl border transition-all ${
                    form.destKey === d.value
                      ? "border-blue-600 bg-blue-50 ring-2 ring-blue-500/20"
                      : "border-slate-200 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-black text-blue-700">Saran AI #{i + 1}</span>
                    {sourceBadge(d)}
                  </div>
                  <p className="text-xs font-bold text-slate-900">{d.label}</p>
                  <p className="text-[11px] text-slate-500">Alasan: {d.reason}</p>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 p-3 rounded-2xl bg-slate-50 border border-slate-200">
              AI belum menemukan tujuan yang cocok dari nama file, pesan, maupun isi dokumen. Silakan pilih manual.
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <FolderKanban size={14} className="text-slate-400 flex-shrink-0" />
            <CustomSelect
              value={destRank >= 0 ? "" : form.destKey}
              onChange={(e) => setForm({ destKey: e.target.value })}
              className={`flex-1 min-w-0 px-3 py-2 rounded-xl border text-xs font-semibold bg-white text-slate-800 ${
                form.destKey && destRank < 0 ? "border-blue-600" : "border-slate-200"
              }`}
            >
              <option value="">— Pilih manual dari tujuan yang Anda miliki aksesnya —</option>
              {analysis.candidates
                .filter((c) => c.kind === "EVIDENCE")
                .map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              {folderGroups.map((folder) => (
                <optgroup key={folder} label={`Folder: ${folder}`}>
                  {appCandidates
                    .filter((c) => (c.folder_name || "-") === folder)
                    .map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.app_name} ({c.app_code}) › {c.section_label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </CustomSelect>
          </div>

          {needsVisibility && (
            <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <p className="text-[11px] font-bold text-slate-700">
                Visibilitas evidence <span className="text-rose-600">*</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { v: "ALL_TIM", label: "Semua Tim (All Tim)" },
                    { v: "TEAM_ONLY", label: "Tim tertentu" },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setForm({ visibility: o.v })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                      form.visibility === o.v
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {form.visibility === "TEAM_ONLY" && (
                <div className="grid sm:grid-cols-2 gap-2">
                  <CustomSelect
                    value={form.teamId}
                    onChange={(e) => setForm({ teamId: e.target.value, branchId: "" })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-800"
                  >
                    <option value="">— Pilih tim —</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.team_name}
                      </option>
                    ))}
                  </CustomSelect>
                  {teamBranches.length > 0 && (
                    <CustomSelect
                      value={form.branchId}
                      onChange={(e) => setForm({ branchId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-800"
                    >
                      <option value="">Seluruh branch tim ini</option>
                      {teamBranches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.branch_name}
                        </option>
                      ))}
                    </CustomSelect>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* 2. Kategori */}
        <section>
          <p className="text-xs font-black text-slate-900 mb-2">
            2. Pilih kategori dokumen <span className="text-rose-600">*</span>
          </p>
          {sugg.categories.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-2 mb-2">
              {sugg.categories.map((c, i) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm({ category: c.value })}
                  className={`text-left p-2.5 rounded-xl border transition-all ${
                    form.category === c.value
                      ? "border-blue-600 bg-blue-50 ring-2 ring-blue-500/20"
                      : "border-slate-200 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-blue-700">#{i + 1}</span>
                    <span className="text-xs font-bold text-slate-900">{CATEGORY_LABELS[c.value] || c.value}</span>
                    {sourceBadge(c)}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">{c.reason}</p>
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {otherCategories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ category: c })}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                  form.category === c
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-500 border-slate-200 hover:border-blue-300"
                }`}
              >
                {CATEGORY_LABELS[c] || c}
              </button>
            ))}
          </div>
        </section>

        {/* 3. Detail */}
        <section className="space-y-3">
          <p className="text-xs font-black text-slate-900">
            3. Detail dokumen{" "}
            <span className="font-semibold text-[11px] text-slate-400">— draf AI hanya dipakai bila Anda klik</span>
          </p>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Judul dokumen <span className="text-rose-600">*</span>
            </label>
            {sugg.title_options.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {sugg.title_options.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ title: t })}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold hover:bg-blue-100"
                  >
                    Gunakan: {t}
                  </button>
                ))}
              </div>
            )}
            <input
              value={form.title}
              onChange={(e) => setForm({ title: e.target.value })}
              placeholder="Klik saran di atas atau ketik judul sendiri"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Versi</label>
              {dest?.kind === "APPLICATION" ? (
                <p className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                  Mengikuti section tujuan: <strong>{dest.version_label}</strong>
                </p>
              ) : (
                <>
                  <input
                    value={form.version}
                    onChange={(e) => setForm({ version: e.target.value })}
                    placeholder="mis. v1.0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  {sugg.version_options.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {sugg.version_options.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setForm({ version: v })}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold hover:bg-blue-50"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Berlaku sampai (opsional)</label>
              <input
                type="date"
                value={form.validUntil}
                onChange={(e) => setForm({ validUntil: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Tag audit (opsional)</label>
            <input
              value={form.tags}
              onChange={(e) => setForm({ tags: e.target.value })}
              placeholder="mis. AUDIT-INT-2026, ISO-27001-2026"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            {sugg.tag_options.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {sugg.tag_options.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      const current = form.tags.split(",").map((x) => x.trim()).filter(Boolean);
                      if (!current.includes(t)) setForm({ tags: [...current, t].join(", ") });
                    }}
                    className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold hover:bg-blue-50"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-700">Ringkasan (opsional)</label>
              {sugg.summary_draft && (
                <button
                  type="button"
                  onClick={() => setForm({ summary: sugg.summary_draft })}
                  className="text-[10px] font-bold text-blue-700 hover:underline"
                >
                  Pakai draf AI
                </button>
              )}
            </div>
            <textarea
              rows={3}
              value={form.summary}
              onChange={(e) => setForm({ summary: e.target.value })}
              placeholder="Kosongkan untuk ringkasan standar sistem"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs resize-none"
            />
          </div>
        </section>

        {/* 4. Review & Konfirmasi */}
        <section className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
          <p className="font-black text-slate-900 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-blue-600" /> Periksa sebelum menyimpan
          </p>
          <p className="text-slate-600">
            Tujuan: <strong className="text-slate-900">{dest?.label || "— belum dipilih —"}</strong>
            {form.destKey && (
              <span className="text-slate-400"> ({destRank >= 0 ? `saran AI #${destRank + 1}` : "pilihan manual"})</span>
            )}
          </p>
          <p className="text-slate-600">
            Kategori:{" "}
            <strong className="text-slate-900">
              {form.category ? CATEGORY_LABELS[form.category] || form.category : "— belum dipilih —"}
            </strong>
            {form.category && (
              <span className="text-slate-400"> ({catRank >= 0 ? `saran AI #${catRank + 1}` : "pilihan manual"})</span>
            )}
          </p>
          {needsVisibility && (
            <p className="text-slate-600">
              Visibilitas:{" "}
              <strong className="text-slate-900">
                {form.visibility === "ALL_TIM"
                  ? "Semua Tim"
                  : form.visibility === "TEAM_ONLY"
                  ? teams.find((t) => t.id === form.teamId)?.team_name || "— pilih tim —"
                  : "— belum dipilih —"}
              </strong>
            </p>
          )}
          {state.error && (
            <p className="text-rose-700 font-semibold flex items-center gap-1.5 pt-1">
              <AlertCircle size={13} /> {state.error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={missing.length > 0 || status === "saving"}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5"
            >
              {status === "saving" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Konfirmasi Upload
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={status === "saving"}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-white text-xs font-bold"
            >
              Batal
            </button>
            {missing.length > 0 && (
              <span className="text-[11px] text-slate-400">Belum diisi: {missing.join(", ")}</span>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
