export const API_BASE_URL = (() => {
  if (typeof window !== "undefined") {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
      return envUrl;
    }
    return "/api/v1";
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080/api/v1";
})();


export interface MasterBranch {
  id: string;
  team_id: string;
  branch_code: string;
  branch_name: string;
}

export interface MasterTeam {
  id: string;
  team_code: string;
  team_name: string;
  has_branches: boolean;
  branches?: MasterBranch[];
}

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "PEGAWAI_TI";

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrator",
  PEGAWAI_TI: "Pegawai TI",
};

/** SUPER_ADMIN & ADMIN sama-sama memiliki akses penuh ke seluruh tim. */
export function isAdminRole(role?: string | null): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export interface UserProfile {
  id: string;
  badge_number: string;
  full_name: string;
  email: string;
  role: UserRole;
  team_id?: string | null;
  branch_id?: string | null;
  is_active: boolean;
  team?: MasterTeam | null;
  branch?: MasterBranch | null;
}

export interface DocumentItem {
  id: string;
  module_source: "APPLICATION" | "EVIDENCE";
  folder_id?: string | null;
  application_id?: string | null;
  section_id?: string | null;
  doc_category: string;
  it_domain: string;
  title: string;
  standardized_name: string;
  original_filename: string;
  file_extension: string;
  file_size_bytes: number;
  version_label: string;
  audit_tags: string;
  valid_until: string;
  validity_status: string;
  visibility_scope: "TEAM_ONLY" | "ALL_TIM";
  owner_team_id?: string | null;
  owner_branch_id?: string | null;
  ai_summary: string;
  uploaded_by_badge: string;
  uploaded_by_name: string;
  uploaded_by_role: string;
  uploaded_by_team_label: string;
  uploaded_at: string;
}

export interface AppChangeSection {
  id: string;
  application_id: string;
  version_label: string;
  section_title: string;
  change_description: string;
  is_initial_release: boolean;
  sort_order: number;
  release_date: string;
  created_by_badge: string;
  created_by_name: string;
  created_at: string;
  documents?: DocumentItem[];
}

export interface ApplicationItem {
  id: string;
  folder_id: string;
  app_code: string;
  app_name: string;
  description: string;
  status: string;
  created_by_badge: string;
  created_by_name: string;
  created_at: string;
  sections?: AppChangeSection[];
}

export interface AppFolder {
  id: string;
  folder_name: string;
  description: string;
  assigned_team_id: string;
  assigned_branch_id?: string | null;
  created_by_badge: string;
  created_by_name: string;
  created_at: string;
  assigned_team?: MasterTeam | null;
  assigned_branch?: MasterBranch | null;
  applications?: ApplicationItem[];
}

export interface UploadAuditLog {
  id: number;
  badge_number: string;
  user_name: string;
  user_role: string;
  team_and_branch_label: string;
  action_type: string;
  module_source: string;
  document_id?: string | null;
  folder_name: string;
  app_name: string;
  section_version: string;
  document_title: string;
  visibility_label: string;
  detail_description: string;
  action_timestamp: string;
}

export interface AIDocumentCitation {
  id: string;
  module_source: string;
  doc_category: string;
  title: string;
  standardized_name: string;
  version_label: string;
  folder_name: string;
  app_name: string;
  section_title: string;
  visibility_scope: string;
  uploaded_by_badge: string;
  uploaded_by_name: string;
  uploaded_by_team_label: string;
  uploaded_at: string;
  file_size_bytes: number;
  audit_tags: string;
  valid_until: string;
  ai_summary: string;
  matched_excerpt: string; // cuplikan isi file yang paling relevan dengan pertanyaan
  preview_url: string;
  download_url: string;
}

// Hasil pembacaan isi file oleh Agentic AI saat upload
export interface ContentIndexResult {
  source: "FILE" | "SUMMARY";
  chunks: number;
  note?: string;
  total_pages?: number; // jumlah halaman PDF / slide / sheet
  unread_pages?: number; // halaman bergambar tanpa teks (kemungkinan hasil scan)
  truncated?: boolean; // dokumen terlalu panjang, hanya bagian awal yang dibaca AI
}

export interface AIChatResponse {
  reply_markdown: string;
  engine_mode: string;
  scope_label: string;
  matched_documents: AIDocumentCitation[];
  queried_at: string;
  session_id?: string; // percakapan di riwayat chat tempat jawaban ini disimpan
  message_id?: number; // id tanya-jawab di riwayat chat (untuk Balas / Teruskan)
  trace?: AgentTrace; // langkah AI (pencarian, baca, rerank), token & durasi
  answer_basis?: AnswerBasis; // kosong = jawaban lama sebelum label ini ada
}

// ─── Langkah AI (mode Thinking) & pemakaian token ───────────────────────────

export interface LLMUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  calls: number;
  estimated?: boolean; // sebagian angka diperkirakan karena provider tidak melaporkan usage
}

export interface StepResult {
  ref?: string;
  document_id: string;
  title: string;
  category: string;
  version: string;
  section?: number;
  score: number; // 0–1
  prev_rank?: number;
  selected?: boolean;
  snippet?: string;
}

export type AgentStepKind = "think" | "tool" | "search" | "read" | "rerank" | "answer";

/** Detail satu panggilan tool (diperbarui langsung selama tool berjalan). */
export interface ToolCallInfo {
  name: string;
  call_id?: string;
  arguments?: Record<string, unknown>;
  raw_arguments?: string; // argumen mentah bila bukan JSON valid
  phase?: string; // tahap yang sedang berjalan
  result_count: number;
  result_chars: number; // panjang hasil (JSON) yang dikirim ke model
  truncated?: boolean;
  output?: string; // cuplikan hasil persis yang dikirim ke model
  error?: string;
}

/** Cara temuan dinilai ulang: model reranker (Cohere/Jina/Voyage) atau heuristik. */
export interface RerankInfo {
  method: "model" | "heuristic";
  provider?: string;
  model?: string;
  candidates: number;
  returned: number;
  latency_ms: number;
  content_shared: boolean;
  weights?: string;
  fallback?: string;
}

export interface AgentStep {
  id: number;
  kind: AgentStepKind;
  title: string;
  detail?: string;
  queries?: string[];
  results?: StepResult[];
  status: "running" | "done" | "error";
  started_ms: number;
  duration_ms: number;
  tokens?: number;
  round?: number; // putaran agent loop (tool calling)
  model?: string; // model LLM yang dipanggil pada langkah ini
  finish?: string; // finish_reason model
  tool?: ToolCallInfo;
  rerank?: RerankInfo;
}

/** DOCUMENTS = mengutip dokumen PANDA, GENERAL = pengetahuan umum, MIXED = campuran. */
export type AnswerBasis = "DOCUMENTS" | "GENERAL" | "MIXED";

export const ANSWER_BASIS_LABELS: Record<AnswerBasis, string> = {
  DOCUMENTS: "Berbasis dokumen",
  GENERAL: "Pengetahuan umum",
  MIXED: "Campuran",
};

export interface AgentTrace {
  thinking: boolean;
  steps: AgentStep[];
  usage: LLMUsage;
  duration_ms: number;
  searches: number;
  findings: number;
  docs_read: number;
}

/** Pesan yang dibalas (Balas) atau diteruskan ke percakapan baru (Teruskan). */
export interface ChatReplyRef {
  message_id?: number;
  role: "question" | "answer";
  mode?: "reply" | "forward";
  text?: string;
}

export interface AIChatRequest {
  prompt: string;
  filter_module: string;
  session_id: string;
  thinking: boolean;
  reply_to?: ChatReplyRef;
}

// Riwayat chat Agentic AI
export interface AIChatSession {
  id: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface AIChatTurn {
  id: number;
  question: string;
  response: AIChatResponse;
  reply_to?: ChatReplyRef;
  created_at: string;
}

// Kuota LLM eksternal (dihitung dari pemakaian PANDA; hari kuota mulai 07.00 WIB)
export type AIQuotaState = "BUILTIN" | "OK" | "LOW" | "EXHAUSTED" | "UNKNOWN";

export interface AIQuotaSummary {
  engine?: string; // engine Agentic AI yang aktif (tool calling / agen JSON / builtin)
  status: AIQuotaState;
  message: string;
  percent: number;
  limit: number;
  used_today: number;
  remaining: number;
  resets_at: string;
  exhausted_until: string | null;
}

export interface AIQuotaDetail extends AIQuotaSummary {
  provider: string;
  model: string;
  failed_today: number;
  tokens_today: number;
  limit_source: "SETTING" | "PROVIDER" | "";
  last_error: string;
  last_error_at: string | null;
  daily?: { day: string; success: number; failed: number; tokens: number }[];
}

export interface AISettings {
  provider: string;
  base_url: string;
  model: string;
  has_api_key: boolean;
  api_key_masked: string;
  source: "database" | "env" | "default";
  engine_mode: string;
  /** Provider dipakai lewat agent loop tool calling (false = fallback agen JSON / builtin) */
  tool_calling?: boolean;
  /** Isi dokumen boleh dikirim ke LLM eksternal (analisis upload & kutipan isi di chat Agentic AI) */
  share_doc_content: boolean;
  /** Jumlah tanya-jawab terakhir di percakapan yang dibaca AI saat menjawab (0 = tidak membaca riwayat) */
  chat_history_turns: number;
  max_chat_history_turns: number;
  /** Batas keputusan agen riset pada mode Thinking (tiap keputusan = 1 panggilan LLM); 0 = otomatis, AI berhenti sendiri */
  thinking_max_steps: number;
  min_thinking_max_steps: number;
  max_thinking_max_steps: number;
  updated_by_badge: string;
  updated_at: string | null;
}

export interface RerankPreset {
  id: string;
  label: string;
  base_url: string;
  model: string;
}

/** Setting reranker model (Super Admin → Docs → Reranker). */
export interface RerankSettings {
  provider: string; // none | cohere | jina | voyage | custom
  base_url: string;
  model: string;
  has_api_key: boolean;
  api_key_masked: string;
  enabled: boolean;
  candidates: number;
  top_n: number;
  min_candidates: number;
  max_candidates: number;
  max_top_n: number;
  presets: RerankPreset[];
  /** Saklar isi dokumen (sama dengan LLM): mati = reranker hanya menerima judul & ringkasan */
  content_shared: boolean;
  source: "database" | "env" | "default";
  updated_by_badge: string;
  updated_at: string | null;
}

export interface RerankTestResult {
  ok: boolean;
  message: string;
  query?: string;
  ranking?: { text: string; score: number }[];
  latency_ms?: number;
}

// ─── Upload via Agentic AI (Analisis → Konfirmasi) ─────────────────────────

/** Ekstensi file yang diterima backend (harus sama dengan allowedUploadTypes di upload_common.go). */
export const UPLOAD_ACCEPT =
  ".pdf,.docx,.xlsx,.pptx,.doc,.xls,.ppt,.png,.jpg,.jpeg,.txt,.csv,.md";

export interface AIRankedOption {
  value: string;
  label: string;
  reason: string;
  source: "BUILTIN" | "LLM";
}

/** Tujuan upload yang boleh dipilih user (dibangun server sesuai cakupan aksesnya). */
export interface AIUploadCandidate {
  key: string; // "evidence" | "app:<applicationID>:<sectionID>"
  kind: "EVIDENCE" | "APPLICATION";
  label: string;
  folder_name?: string;
  app_name?: string;
  app_code?: string;
  section_label?: string;
  version_label?: string;
  owner_label: string;
}

export interface AIUploadAnalysis {
  staging_id: string;
  expires_at: string;
  file: { name: string; size_bytes: number; extension: string; sha256: string };
  message: string;
  suggestion: {
    destinations: AIRankedOption[];
    categories: AIRankedOption[];
    title_options: string[];
    version_options: string[];
    tag_options: string[];
    summary_draft: string;
    engine: string;
    content_shared_with_llm: boolean;
    content_note?: string;
  };
  candidates: AIUploadCandidate[];
  categories: string[];
  duplicate: {
    id: string;
    title: string;
    standardized_name: string;
    doc_category: string;
    version_label: string;
    module_source: string;
    uploaded_by_name: string;
    uploaded_by_badge: string;
    uploaded_at: string;
  } | null;
  is_admin: boolean;
}

export interface AIUploadConfirmResult {
  document: DocumentItem;
  content_index: ContentIndexResult;
  location: string;
}

/** Segmen yang sedang di-impersonate Super Admin ("Lihat sebagai"). */
export interface ImpersonationTarget {
  team_id: string;
  branch_id: string | null;
}

const TOKEN_KEY = "panda_auth_token";
const USER_KEY = "panda_auth_user";
const IMPERSONATE_KEY = "panda_impersonate";

export function getImpersonation(): ImpersonationTarget | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(IMPERSONATE_KEY);
    return raw ? (JSON.parse(raw) as ImpersonationTarget) : null;
  } catch {
    return null;
  }
}

export function setImpersonation(target: ImpersonationTarget | null) {
  if (typeof window === "undefined") return;
  if (target) localStorage.setItem(IMPERSONATE_KEY, JSON.stringify(target));
  else localStorage.removeItem(IMPERSONATE_KEY);
}

/** Error dari API beserta HTTP status-nya (status 0 = backend tidak terjangkau). */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function saveAuthSession(token: string, user: UserProfile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getAuthSession(): { token: string | null; user: UserProfile | null } {
  if (typeof window === "undefined") return { token: null, user: null };
  const token = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
  if (!token || !rawUser) return { token: null, user: null };
  try {
    return { token, user: JSON.parse(rawUser) };
  } catch {
    return { token: null, user: null };
  }
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(IMPERSONATE_KEY);
}

/** Header autentikasi & impersonate yang sama untuk semua request ke backend. */
function authHeaders(extra?: HeadersInit, body?: BodyInit | null): Record<string, string> {
  const { token } = getAuthSession();
  const headers: Record<string, string> = { ...(extra as Record<string, string>) };
  if (!(body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const imp = getImpersonation();
  if (imp) {
    headers["X-Impersonate-Team"] = imp.team_id;
    if (imp.branch_id) headers["X-Impersonate-Branch"] = imp.branch_id;
  }
  return headers;
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = authHeaders(options.headers, options.body);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError("Backend tidak dapat dihubungi. Pastikan server Go berjalan.", 0);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error || `Request gagal (${res.status})`, res.status);
  }
  return data as T;
}

export interface AgentStreamHandlers {
  onStep?: (step: AgentStep) => void;
  onUsage?: (usage: LLMUsage) => void;
  onDelta?: (text: string) => void;
  /** Jawaban yang sudah mengalir dibuang (mis. LLM gagal lalu diganti jawaban otomatis). */
  onReset?: () => void;
}

/**
 * Bertanya ke Agentic AI dengan progres langsung (Server-Sent Events): langkah AI, token, lalu jawaban yang
 * mengalir. Membatalkan `signal` (tombol Stop) memutus koneksi dan menghentikan proses di server.
 */
export async function streamAgenticChat(
  body: AIChatRequest,
  handlers: AgentStreamHandlers,
  signal?: AbortSignal
): Promise<AIChatResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/ai/chat/stream`, {
      method: "POST",
      headers: { ...authHeaders(), Accept: "text/event-stream" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") throw err;
    throw new ApiError("Backend tidak dapat dihubungi. Pastikan server Go berjalan.", 0);
  }
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.error || `Request gagal (${res.status})`, res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: AIChatResponse | null = null;

  const dispatch = (block: string) => {
    let event = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    if (data.length === 0) return; // detak ": ping"
    const payload = JSON.parse(data.join("\n"));
    switch (event) {
      case "step":
        handlers.onStep?.(payload as AgentStep);
        break;
      case "usage":
        handlers.onUsage?.(payload as LLMUsage);
        break;
      case "answer_delta":
        handlers.onDelta?.(payload.text as string);
        break;
      case "answer_reset":
        handlers.onReset?.();
        break;
      case "done":
        result = payload as AIChatResponse;
        break;
      case "error":
        throw new ApiError(payload.error || "Gagal memproses pencarian Agentic AI", 500);
    }
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    let sep = buffer.indexOf("\n\n");
    while (sep >= 0) {
      dispatch(buffer.slice(0, sep));
      buffer = buffer.slice(sep + 2);
      sep = buffer.indexOf("\n\n");
    }
  }
  if (buffer.trim()) dispatch(buffer);
  if (!result) throw new ApiError("Koneksi terputus sebelum jawaban selesai. Coba kirim ulang.", 0);
  return result;
}

/**
 * Ambil file dokumen lewat fetch terautentikasi (Bearer + header impersonate). Tidak ada token di URL;
 * gagal (401/403/404/jaringan) selalu melempar ApiError, tidak ada fallback ke URL publik.
 */
export async function fetchDocumentBlob(
  docId: string,
  kind: "preview" | "download",
  signal?: AbortSignal
): Promise<Blob> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(docId)}/${kind}`, {
      headers: authHeaders(),
      signal,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") throw err;
    throw new ApiError("Backend tidak dapat dihubungi. Pastikan server Go berjalan.", 0);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.error || `Request gagal (${res.status})`, res.status);
  }
  return res.blob();
}

/** Unduh dokumen: fetch terautentikasi -> blob URL -> klik anchor sementara. */
export async function downloadDocument(docId: string, filename: string): Promise<void> {
  const url = URL.createObjectURL(await fetchDocumentBlob(docId, "download"));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
