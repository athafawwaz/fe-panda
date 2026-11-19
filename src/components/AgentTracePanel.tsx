"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  Cpu,
  Lightbulb,
  ListOrdered,
  Loader2,
  PenLine,
  Search,
  Wrench,
} from "lucide-react";
import { ANSWER_BASIS_LABELS } from "@/lib/api";
import type { AgentStep, AgentStepKind, AgentTrace, AnswerBasis, LLMUsage, RerankInfo, StepResult, ToolCallInfo } from "@/lib/api";

// ─── Format angka ─────────────────────────────────────────────────────────────

export function formatTokens(n: number): string {
  if (n >= 10000) return `${(n / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} rb`;
  return n.toLocaleString("id-ID");
}

export function formatDuration(ms: number): string {
  if (ms < 10000) return `${(ms / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} dtk`;
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} dtk` : `${Math.floor(s / 60)} mnt ${s % 60} dtk`;
}

const KIND_STYLE: Record<AgentStepKind, { icon: React.ElementType; tone: string }> = {
  think: { icon: Lightbulb, tone: "text-amber-600 bg-amber-50 border-amber-200" },
  tool: { icon: Wrench, tone: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  search: { icon: Search, tone: "text-blue-600 bg-blue-50 border-blue-200" },
  read: { icon: BookOpen, tone: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  rerank: { icon: ListOrdered, tone: "text-blue-600 bg-blue-50 border-blue-200" },
  answer: { icon: PenLine, tone: "text-sky-600 bg-sky-50 border-sky-200" },
};

// ─── Badge token & durasi di bawah jawaban ────────────────────────────────────

export function UsageBadge({ trace }: { trace?: AgentTrace }) {
  if (!trace) return null;
  const u = trace.usage;
  const toolCalls = trace.steps.filter((s) => s.kind === "tool").length;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
      <span
        className="inline-flex items-center gap-1"
        title={u.total_tokens > 0 ? `Input ${formatTokens(u.prompt_tokens)} · output ${formatTokens(u.completion_tokens)} token` : undefined}
      >
        <Coins size={12} className="text-amber-500" />
        {u.total_tokens > 0 ? (
          <>
            <strong className="text-slate-700">{formatTokens(u.total_tokens)}</strong> token
            <span className="text-slate-400">
              (↑{formatTokens(u.prompt_tokens)} ↓{formatTokens(u.completion_tokens)})
            </span>
            {u.estimated && <span className="text-slate-400">perkiraan</span>}
          </>
        ) : (
          "Tanpa token (Built-in)"
        )}
      </span>
      {u.calls > 0 && <span>· {u.calls} panggilan AI</span>}
      {toolCalls > 0 && <span>· {toolCalls} tool call</span>}
      <span className="inline-flex items-center gap-1">
        · <Clock size={12} /> {formatDuration(trace.duration_ms)}
      </span>
    </span>
  );
}

// ─── Panel langkah AI ─────────────────────────────────────────────────────────

interface AgentTracePanelProps {
  steps: AgentStep[];
  thinking: boolean;
  usage?: LLMUsage | null;
  live?: boolean;
  startedAt?: number; // epoch ms, untuk timer saat berjalan
  durationMs?: number;
  searches?: number;
  findings?: number;
  docsRead?: number;
}

export default function AgentTracePanel({
  steps,
  thinking,
  usage,
  live = false,
  startedAt,
  durationMs = 0,
  searches,
  findings,
  docsRead,
}: AgentTracePanelProps) {
  const [open, setOpen] = useState(live && thinking);
  const [now, setNow] = useState(() => Date.now());
  const userToggled = useRef(false);
  const toolCount = steps.filter((s) => s.kind === "tool").length;

  // Seperti Claude: terbuka selama berpikir, dilipat otomatis setelah jawaban selesai
  useEffect(() => {
    if (!live) setOpen(false);
  }, [live]);

  // Begitu AI memanggil tool, log dibuka agar detail tool terlihat langsung (kecuali user sudah melipatnya)
  useEffect(() => {
    if (live && toolCount > 0 && !userToggled.current) setOpen(true);
  }, [live, toolCount]);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [live]);

  if (!live && steps.length === 0) return null;

  const elapsed = live && startedAt ? now - startedAt : durationMs;
  const current = [...steps].reverse().find((s) => s.status === "running");
  const searchCount = searches ?? steps.filter((s) => s.kind === "search" || s.tool?.name === "search_documents").length;
  const decisionCount = steps.filter((s) => s.kind === "think").length;
  const tokenTotal = usage?.total_tokens ?? 0;
  const agentic = toolCount > 0 || steps.some((s) => s.round);

  const headline = live
    ? `${thinking ? "Berpikir" : agentic ? "Bekerja" : "Mencari"} · ${current?.tool?.phase ?? current?.title ?? "Memulai"}`
    : thinking
      ? `Berpikir selama ${formatDuration(elapsed)}`
      : `${agentic ? "Selesai" : "Penelusuran selesai"} dalam ${formatDuration(elapsed)}`;

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-colors ${
        thinking ? "border-blue-200 bg-blue-50/60" : "border-slate-200 bg-white"
      }`}
    >
      {live && <div className="ai-progress-sweep" />}
      <button
        type="button"
        onClick={() => {
          userToggled.current = true;
          setOpen((o) => !o);
        }}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-white/60"
        aria-expanded={open}
      >
        <span
          className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${
            thinking ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
          } ${live && thinking ? "ai-breathe" : ""}`}
        >
          {live && !thinking ? (
            <Loader2 size={15} className="animate-spin" />
          ) : thinking ? (
            <Brain size={15} />
          ) : agentic ? (
            <Wrench size={14} />
          ) : (
            <Search size={14} />
          )}
        </span>
        <span className="flex-1 min-w-0">
          <span
            className={`block text-[13px] font-bold truncate ${thinking ? "text-blue-900" : "text-slate-800"} ${
              ""
            }`}
          >
            {headline}
            {live && "…"}
          </span>
          <span className="block text-[11px] text-slate-500 truncate">
            {thinking && decisionCount > 0 ? `${decisionCount} langkah · ` : ""}
            {toolCount > 0 ? `${toolCount} tool call · ` : ""}
            {searchCount} pencarian
            {findings ? ` · ${findings} temuan` : ""}
            {docsRead ? ` · ${docsRead} dokumen dibaca` : ""}
            {tokenTotal > 0 ? ` · ${formatTokens(tokenTotal)} token` : ""}
            {live ? ` · ${formatDuration(elapsed)}` : ""}
          </span>
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ol className="px-4 pb-4 pt-1 space-y-3.5">
          {steps.map((step, i) => (
            <StepItem key={step.id} step={step} last={i === steps.length - 1} />
          ))}
        </ol>
      )}
    </div>
  );
}

function StepItem({ step, last }: { step: AgentStep; last: boolean }) {
  const style = KIND_STYLE[step.kind] ?? KIND_STYLE.search;
  const Icon = style.icon;
  return (
    <li className="relative pl-9 ai-step-in">
      {!last && <span className="absolute left-[13px] top-7 bottom-[-14px] w-px bg-slate-200" />}
      <span
        className={`absolute left-0 top-0 w-7 h-7 rounded-full border flex items-center justify-center ${
          step.status === "error" ? "text-rose-600 bg-rose-50 border-rose-200" : style.tone
        }`}
      >
        {step.status === "running" ? (
          <Loader2 size={13} className="animate-spin" />
        ) : step.status === "error" ? (
          <AlertCircle size={13} />
        ) : (
          <Icon size={13} />
        )}
      </span>

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-1">
        <span className={`text-[13px] font-semibold text-slate-800 `}>
          {step.title}
        </span>
        {!!step.round && <span className="text-[10px] font-semibold text-slate-400">putaran {step.round}</span>}
        {step.status !== "running" && step.duration_ms > 0 && (
          <span className="text-[10px] text-slate-400">{formatDuration(step.duration_ms)}</span>
        )}
        {!!step.tokens && (
          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-1.5">
            {formatTokens(step.tokens)} token
          </span>
        )}
        {step.model && step.kind !== "tool" && (
          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-1.5">
            <Cpu size={10} /> {step.model}
          </span>
        )}
        {step.finish === "length" && (
          <span className="text-[10px] font-semibold text-amber-700">keluaran terpotong</span>
        )}
      </div>

      {step.tool && <ToolDetails tool={step.tool} running={step.status === "running"} />}

      {step.queries && step.queries.length > 0 && step.queries.some((q) => q) && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {step.queries.filter(Boolean).map((q, i) => (
            <span
              key={q}
              className="inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-700 ai-step-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Search size={10} className="text-slate-400 flex-shrink-0" />
              <span className="truncate">{q}</span>
            </span>
          ))}
        </div>
      )}

      {step.rerank && <RerankLine info={step.rerank} />}

      {step.detail && (
        <p
          className={`mt-1.5 text-[12px] leading-relaxed ${
            step.kind === "think" ? "italic text-slate-600 border-l-2 border-amber-200 pl-2.5" : "text-slate-500"
          } ${step.status === "error" ? "text-rose-600" : ""}`}
        >
          {step.detail}
        </p>
      )}

      {step.results && step.results.length > 0 && <ResultList kind={step.kind} results={step.results} />}

      {step.tool?.output && <ToolOutput output={step.tool.output} chars={step.tool.result_chars} />}
    </li>
  );
}

function formatArg(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

function ToolDetails({ tool, running }: { tool: ToolCallInfo; running: boolean }) {
  const args = Object.entries(tool.arguments ?? {}).filter(([k]) => k !== "query");
  return (
    <div className="mt-1.5 space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <code className="px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-[11px] font-semibold text-indigo-700">
          {tool.name}()
        </code>
        {args.map(([k, v]) => (
          <span key={k} className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600">
            <span className="text-slate-400">{k}:</span> {formatArg(v)}
          </span>
        ))}
        {tool.raw_arguments && (
          <span className="px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-100 text-[11px] text-rose-700 font-mono truncate max-w-full">
            {tool.raw_arguments}
          </span>
        )}
      </div>
      {running && tool.phase && (
        <p className="flex items-center gap-1.5 text-[11px] text-indigo-600">
          <Loader2 size={11} className="animate-spin" /> {tool.phase}
        </p>
      )}
      {!running && (
        <p className="text-[11px] text-slate-400">
          {tool.result_count} hasil · {tool.result_chars.toLocaleString("id-ID")} karakter dikirim ke model
          {tool.truncated ? " · dipangkas agar muat batas" : ""}
        </p>
      )}
      {tool.error && (
        <p className="flex items-start gap-1.5 text-[11px] text-rose-600">
          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" /> {tool.error}
        </p>
      )}
    </div>
  );
}

function RerankLine({ info }: { info: RerankInfo }) {
  const model = info.method === "model";
  return (
    <div className="mt-1.5 space-y-1">
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-slate-500">
        <ListOrdered size={12} className={model ? "text-blue-500" : "text-slate-400"} />
        {model ? (
          <>
            Reranker <strong className="text-blue-700">{info.provider}:{info.model}</strong>
          </>
        ) : (
          <>Penilaian ulang heuristik</>
        )}
        <span>
          · {info.candidates} kandidat → {info.returned}
        </span>
        {model && <span>· {info.latency_ms} ms</span>}
        {model && <span>· {info.content_shared ? "judul + isi potongan" : "judul + ringkasan saja"}</span>}
        {info.weights && <span className="text-slate-400">· {info.weights}</span>}
      </p>
      {info.fallback && (
        <p className="flex items-start gap-1.5 text-[11px] text-amber-700">
          <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" /> Reranker model tidak dipakai: {info.fallback}
        </p>
      )}
    </div>
  );
}

function ToolOutput({ output, chars }: { output: string; chars: number }) {
  const [open, setOpen] = useState(false);
  let pretty = output;
  try {
    pretty = JSON.stringify(JSON.parse(output), null, 2);
  } catch {
    // cuplikan terpotong bukan JSON utuh: tampilkan apa adanya
  }
  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-700"
        aria-expanded={open}
      >
        <ChevronRight size={12} className={`transition-transform ${open ? "rotate-90" : ""}`} />
        Hasil yang dikirim ke model
        {output.length < chars && <span className="font-normal text-slate-400">(cuplikan)</span>}
      </button>
      {open && (
        <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-slate-900 text-slate-100 text-[10.5px] leading-relaxed p-2.5 whitespace-pre-wrap break-words">
          {pretty}
        </pre>
      )}
    </div>
  );
}

function ResultList({ kind, results }: { kind: AgentStepKind; results: StepResult[] }) {
  const reranked = kind === "rerank" || (kind === "tool" && results.some((r) => r.prev_rank));
  const scored = results.some((r) => r.score > 0);
  return (
    <ul className="mt-2 space-y-1">
      {results.map((r, i) => {
        const moved = reranked && r.prev_rank ? r.prev_rank - (i + 1) : 0;
        return (
          <li
            key={`${r.ref ?? r.document_id}-${i}`}
            className={`flex items-center gap-2 rounded-lg px-2 py-1 text-[11px] ai-step-in ${
              r.selected && kind === "rerank" ? "bg-emerald-50/80" : "bg-white/70"
            }`}
            style={{ animationDelay: `${i * 45}ms` }}
            title={r.snippet}
          >
            {reranked && <span className="w-4 text-right font-bold text-slate-500 flex-shrink-0">{i + 1}</span>}
            {r.ref && <span className="font-mono text-[10px] text-slate-400 flex-shrink-0">{r.ref}</span>}
            <span className="flex-1 min-w-0">
              <span className="block truncate font-semibold text-slate-700">{r.title}</span>
              <span className="block truncate text-slate-400">
                {r.category} · {r.version}
                {r.section ? ` · bagian ${r.section}` : ""}
                {r.snippet ? ` — ${r.snippet}` : ""}
              </span>
            </span>
            {reranked && (
              <span className="w-8 flex items-center justify-end flex-shrink-0 text-[10px] font-bold" title={r.prev_rank ? `Sebelum dinilai ulang: #${r.prev_rank}` : undefined}>
                {moved > 0 && (
                  <span className="text-emerald-600 flex items-center">
                    <ArrowUp size={10} />
                    {moved}
                  </span>
                )}
                {moved < 0 && (
                  <span className="text-rose-500 flex items-center">
                    <ArrowDown size={10} />
                    {-moved}
                  </span>
                )}
              </span>
            )}
            {scored && (
              <span className="w-14 h-1.5 rounded-full bg-slate-100 overflow-hidden flex-shrink-0" title={`Skor ${r.score.toFixed(2)}`}>
                <span
                  className={`block h-full rounded-full ${reranked ? "bg-blue-500" : "bg-blue-500"}`}
                  style={{ width: `${Math.max(4, Math.min(100, r.score * 100))}%` }}
                />
              </span>
            )}
            {r.selected && kind === "rerank" && <Check size={12} className="text-emerald-600 flex-shrink-0" />}
          </li>
        );
      })}
    </ul>
  );
}

// ─── Label basis jawaban ──────────────────────────────────────────────────────

const BASIS_STYLE: Record<AnswerBasis, { tone: string; hint: string }> = {
  DOCUMENTS: {
    tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
    hint: "Jawaban mengutip dokumen di repositori PANDA (lihat kartu dokumen di bawah).",
  },
  GENERAL: {
    tone: "text-slate-600 bg-slate-50 border-slate-200",
    hint: "Jawaban dari pengetahuan umum AI, bukan isi dokumen PANDA.",
  },
  MIXED: {
    tone: "text-amber-700 bg-amber-50 border-amber-200",
    hint: "Sebagian jawaban mengutip dokumen PANDA, sebagian pengetahuan umum (ditandai \"Secara umum\").",
  },
};

export function AnswerBasisChip({ basis }: { basis?: AnswerBasis }) {
  if (!basis || !BASIS_STYLE[basis]) return null;
  const style = BASIS_STYLE[basis];
  return (
    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${style.tone}`} title={style.hint}>
      {ANSWER_BASIS_LABELS[basis]}
    </span>
  );
}
