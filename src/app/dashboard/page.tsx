"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Home,
  FolderKanban,
  FileText,
  Sparkles,
  ShieldCheck,
  History,
  Search,
  Bell,
  LogOut,
  Plus,
  Upload,
  Eye,
  Download,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Users,
  ChevronRight,
  ArrowLeft,
  Send,
  Layers,
  Lock,
  Globe,
  X,
  Trash2,
  Building2,
  GitBranch,
  FileCheck,
  AlertCircle,
  BookOpen,
  Pencil,
  Check,
  UserCog,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Brain,
  Square,
  Reply,
  Forward,
  RotateCw,
  UserPlus,
} from "lucide-react";
import SuperAdminDocs, { type DocsTab } from "@/components/SuperAdminDocs";
import AIUploadCard from "@/components/AIUploadCard";
import AgentTracePanel, { AnswerBasisChip, UsageBadge } from "@/components/AgentTracePanel";
import MessageActions from "@/components/MessageActions";
import TypewriterMarkdown from "@/components/TypewriterMarkdown";
import FolderGrid from "@/components/FolderGrid";
import EvidenceTable from "@/components/EvidenceTable";
import AuditLogTimeline from "@/components/AuditLogTimeline";
import CustomSelect from "@/components/CustomSelect";
import ApplicationDetail from "@/components/ApplicationDetail";
import { shortName } from "@/lib/uiFormat";
import MasterUserTable from "@/components/MasterUserTable";
import { StatPill } from "@/components/ListControls";
import { triggerPageLoader } from "@/components/PageTransitionLoader";
import {
  apiFetch,
  ApiError,
  getAuthSession,
  saveAuthSession,
  clearAuthSession,
  getImpersonation,
  setImpersonation as storeImpersonation,
  isAdminRole,
  ROLE_LABELS,
  getDocumentPreviewUrl,
  getDocumentDownloadUrl,
  ImpersonationTarget,
  UserRole,
  UserProfile,
  MasterTeam,
  AppFolder,
  ApplicationItem,
  AppChangeSection,
  DocumentItem,
  UploadAuditLog,
  AIChatResponse,
  AIDocumentCitation,
  ContentIndexResult,
  AIChatSession,
  AIChatTurn,
  AIQuotaSummary,
  UPLOAD_ACCEPT,
  streamAgenticChat,
  AgentStep,
  LLMUsage,
  ChatReplyRef,
} from "@/lib/api";

// Jawaban yang sedang disusun AI: langkah, token, dan teks jawaban yang mengalir
interface LiveAnswer {
  steps: AgentStep[];
  usage: LLMUsage | null;
  answer: string;
  startedAt: number;
  thinking: boolean;
}

// Pesan yang akan dibalas / diteruskan beserta cuplikannya untuk ditampilkan di atas kotak input
interface ReplyDraft {
  ref: ChatReplyRef;
  preview: string;
}

const THINKING_PREF_KEY = "panda_ai_thinking";

type ActiveMenu =
  | "dashboard"
  | "applications"
  | "evidence"
  | "agentic"
  | "master_access"
  | "logs"
  | "docs";

export default function DashboardWorkspace() {
  const router = useRouter();
  // user = identitas efektif (saat impersonate: Pegawai TI pada segmen terpilih)
  // realUser = akun yang benar-benar login
  const [user, setUser] = useState<UserProfile | null>(null);
  const [realUser, setRealUser] = useState<UserProfile | null>(null);
  const [impersonation, setImpersonation] = useState<ImpersonationTarget | null>(null);
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>("dashboard");
  const [loading, setLoading] = useState(true);
  // Sidebar bisa diciutkan (hanya ikon) di layar lebar; pilihan diingat di browser
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem("panda_sidebar_collapsed") === "1");
    } catch {}
  }, []);
  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      try {
        localStorage.setItem("panda_sidebar_collapsed", prev ? "0" : "1");
      } catch {}
      return !prev;
    });
  };
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Dashboard & Global State
  const [summary, setSummary] = useState({
    total_folders: 0,
    total_apps: 0,
    total_app_docs: 0,
    total_evidence_docs: 0,
    total_all_docs: 0,
    total_users: 0,
    compliance_rate: 96,
    user_scope_label: "",
  });
  const [teamDist, setTeamDist] = useState<Record<string, number>>({});
  const [folders, setFolders] = useState<AppFolder[]>([]);
  const [recentDocs, setRecentDocs] = useState<DocumentItem[]>([]);
  const [logs, setLogs] = useState<UploadAuditLog[]>([]);
  const [teams, setTeams] = useState<MasterTeam[]>([]);
  const [masterUsers, setMasterUsers] = useState<UserProfile[]>([]);
  const [evidenceDocs, setEvidenceDocs] = useState<DocumentItem[]>([]);

  // Navigation inside Menu "Aplikasi": Folder -> Application -> Section Perubahan
  const [selectedFolder, setSelectedFolder] = useState<AppFolder | null>(null);
  const [selectedApp, setSelectedApp] = useState<ApplicationItem | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>("");

  // Modals
  const [previewDoc, setPreviewDoc] = useState<{
    id: string;
    title: string;
    stdName: string;
    uploader: string;
    time: string;
  } | null>(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showCreateAppModal, setShowCreateAppModal] = useState(false);
  const [showCreateSectionModal, setShowCreateSectionModal] = useState(false);
  const [showUploadAppDocModal, setShowUploadAppDocModal] = useState(false);
  const [showUploadEvidenceModal, setShowUploadEvidenceModal] = useState(false);

  // Forms State
  // 1. Create Folder Form (Admin)
  const [folderName, setFolderName] = useState("");
  const [folderDesc, setFolderDesc] = useState("");
  const [folderTeamId, setFolderTeamId] = useState("");
  const [folderBranchId, setFolderBranchId] = useState("");

  // 2. Create Application Form (Admin)
  const [appCode, setAppCode] = useState("");
  const [appName, setAppName] = useState("");
  const [appDesc, setAppDesc] = useState("");
  const [appInitVer, setAppInitVer] = useState("v1.0");

  // 3. Create Section Perubahan / Versioning Form
  const [secVersion, setSecVersion] = useState("v1.1");
  const [secTitle, setSecTitle] = useState("");
  const [secDesc, setSecDesc] = useState("");

  // 4. Upload Document Form (App Section & Evidence)
  const [docCategory, setDocCategory] = useState("PRD");
  const [docTitle, setDocTitle] = useState("");
  const [docDomain, setDocDomain] = useState("SDLC & Change Management");
  const [docVersionLabel, setDocVersionLabel] = useState("v1.0");
  const [docAuditTags, setDocAuditTags] = useState("AUDIT-INT-2026, ISO-27001-2026");
  const [docValidUntil, setDocValidUntil] = useState("2027-12-31");
  const [docSummary, setDocSummary] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  // Admin Evidence Visibility Dropdown
  const [evidenceVisScope, setEvidenceVisScope] = useState<"ALL_TIM" | "TEAM_ONLY">("ALL_TIM");
  const [evidenceTargetTeamId, setEvidenceTargetTeamId] = useState("");
  const [evidenceTargetBranchId, setEvidenceTargetBranchId] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // 5. Master Akses Form (Admin)
  const [newBadge, setNewBadge] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("PEGAWAI_TI");
  const [newUserTeamId, setNewUserTeamId] = useState("");
  const [newUserBranchId, setNewUserBranchId] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [branchTargetTeamId, setBranchTargetTeamId] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  // Inline edit nama Tim / Branch di kartu Master Data
  const [editingMaster, setEditingMaster] = useState<{
    kind: "team" | "branch";
    id: string;
    name: string;
  } | null>(null);

  // 6. Agentic AI Chat State (ChatGPT / Gemini Conversational Style)
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiFilterModule, setAiFilterModule] = useState<"ALL" | "APPLICATION" | "EVIDENCE">("ALL");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPendingQuestion, setAiPendingQuestion] = useState<string | null>(null);
  // Riwayat chat: tanya-jawab biasa, atau sesi upload file via Agentic AI (kartu pilihan + konfirmasi)
  const [aiHistory, setAiHistory] = useState<
    Array<
      | {
          kind?: "chat";
          question: string;
          response: AIChatResponse;
          replyTo?: ChatReplyRef;
          stopped?: boolean;
          typing?: boolean; // jawaban baru: masih dianimasikan seperti sedang diketik
          typingFrom?: number; // karakter yang sudah tampil saat jawaban mengalir (lanjutan tanpa lompatan)
        }
      | { kind: "upload"; question: string; uploadId: string; file: File; message: string }
    >
  >([]);
  // Mode Thinking (pencarian luas & berulang + rerank), pesan yang dibalas/diteruskan, dan jawaban yang sedang mengalir
  const [aiThinking, setAiThinking] = useState(false);
  const [aiReplyTo, setAiReplyTo] = useState<ReplyDraft | null>(null);
  const [aiPendingReplyTo, setAiPendingReplyTo] = useState<ChatReplyRef | null>(null);
  const [aiLive, setAiLive] = useState<LiveAnswer | null>(null);
  const aiLiveRef = useRef<LiveAnswer | null>(null);
  const aiLiveShownRef = useRef(0); // karakter jawaban live yang sudah tampil (animasi mengetik)
  const aiScrolledAtRef = useRef(0);
  const aiAbortRef = useRef<AbortController | null>(null);
  const aiInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  // Riwayat chat tersimpan di server: sesi yang sedang dibuka & daftar sesi milik user
  const [aiSessionId, setAiSessionId] = useState<string | null>(null);
  const [aiSessions, setAiSessions] = useState<AIChatSession[]>([]);
  const [showAiSessions, setShowAiSessions] = useState(false);
  // Status kuota LLM eksternal untuk peringatan "hampir habis / habis" di halaman chat
  const [aiQuota, setAiQuota] = useState<AIQuotaSummary | null>(null);
  const [docsTab, setDocsTab] = useState<DocsTab>("apikey");
  const [aiAttachedFile, setAiAttachedFile] = useState<File | null>(null);
  const aiFileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Riwayat prompt untuk navigasi keyboard Panah Atas / Bawah (seperti di Gemini / ChatGPT / terminal)
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const promptDraftRef = useRef<string>("");

  // Shortcut pertanyaan AI dinamis berdasarkan dokumen yang dapat diakses user
  const [aiShortcuts, setAiShortcuts] = useState<string[]>([
    "Carikan dokumen UAT SIMSKBDN",
    "Tampilkan BAST versi awal v1.0",
    "Cari laporan SLA Layanan TI",
    "Cari laporan uji DRC Infrastruktur",
    "Tampilkan SOP Tata Kelola All Tim",
  ]);
  const [loadingShortcuts, setLoadingShortcuts] = useState(false);

  const notify = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  useEffect(() => {
    const session = getAuthSession();
    if (!session.token || !session.user) {
      router.replace("/login");
      return;
    }
    loadIdentity(session.user).then((effective) => {
      if (effective) loadAllWorkspaceData(effective);
    });
  }, []);

  // Ambil identitas terbaru dari backend (role bisa berubah, mis. ADMIN -> SUPER_ADMIN)
  // beserta identitas efektif bila sedang impersonate.
  const loadIdentity = async (fallback?: UserProfile | null): Promise<UserProfile | null> => {
    try {
      const res = await apiFetch<{
        user: UserProfile;
        real_user: UserProfile;
        impersonating: boolean;
      }>("/auth/me");
      const { token } = getAuthSession();
      if (token) saveAuthSession(token, res.real_user);
      setRealUser(res.real_user);
      setUser(res.user);
      setImpersonation(res.impersonating ? getImpersonation() : null);
      return res.user;
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if (getImpersonation() && (status === 400 || status === 403)) {
        // Segmen impersonate sudah tidak valid (mis. branch dihapus) -> kembali ke akun asli
        storeImpersonation(null);
        return loadIdentity(fallback);
      }
      if (status === 401) {
        clearAuthSession();
        router.replace("/login");
        return null;
      }
      // Backend tidak terjangkau: tetap tampilkan sesi tersimpan
      if (fallback) {
        setRealUser(fallback);
        setUser(fallback);
      }
      return fallback ?? null;
    }
  };

  // Super Admin: "Lihat sebagai" segmen Tim/Branch (null = kembali ke tampilan Super Admin)
  const switchSegment = async (target: ImpersonationTarget | null) => {
    storeImpersonation(target);
    setActiveMenu("dashboard");
    setSelectedFolder(null);
    setSelectedApp(null);
    setAiHistory([]);
    setAiPendingQuestion(null);
    setMasterUsers([]);
    setEditingUserId(null);
    const effective = await loadIdentity();
    if (!effective) return;
    await loadAllWorkspaceData(effective);
    if (target) {
      notify(
        `Impersonate aktif: ${effective.team?.team_name || "Tim"}${
          effective.branch ? ` • ${effective.branch.branch_name}` : ""
        } (read-only)`
      );
    } else {
      notify("Kembali ke tampilan Super Admin.");
    }
  };

  const loadAllWorkspaceData = async (currentUser = user) => {
    try {
      setLoading(true);
      const [dashRes, teamsRes, foldersRes, evRes, logsRes] = await Promise.all([
        apiFetch("/dashboard/summary"),
        apiFetch("/master/teams"),
        apiFetch("/folders"),
        apiFetch("/evidence"),
        apiFetch("/logs"),
      ]);

      if (dashRes?.summary) setSummary(dashRes.summary);
      if (dashRes?.team_distribution) setTeamDist(dashRes.team_distribution);
      if (dashRes?.recent_documents) setRecentDocs(dashRes.recent_documents);
      if (teamsRes?.teams) {
        const list: MasterTeam[] = teamsRes.teams;
        setTeams(list);
        // Pertahankan pilihan tim di form selama tim masih ada (bisa saja baru dihapus)
        const keepOrFirst = (cur: string) =>
          cur && list.some((t) => t.id === cur) ? cur : list[0]?.id || "";
        setFolderTeamId(keepOrFirst);
        setNewUserTeamId(keepOrFirst);
        setEvidenceTargetTeamId(keepOrFirst);
        setBranchTargetTeamId(keepOrFirst);
      }
      if (foldersRes?.folders) {
        setFolders(foldersRes.folders);
        if (selectedFolder) {
          const updatedF = foldersRes.folders.find(
            (f: AppFolder) => f.id === selectedFolder.id
          );
          if (updatedF) setSelectedFolder(updatedF);
        }
      }
      if (evRes?.documents) setEvidenceDocs(evRes.documents);
      if (logsRes?.logs) setLogs(logsRes.logs);

      if (isAdminRole(currentUser?.role)) {
        const usersRes = await apiFetch("/master/users");
        if (usersRes?.users) setMasterUsers(usersRes.users);
      }

      loadAiShortcuts();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openApplicationDetail = async (appId: string) => {
    try {
      const res = await apiFetch<{ application: ApplicationItem }>(
        `/applications/${appId}`
      );
      if (res?.application) {
        setSelectedApp(res.application);
        if (
          res.application.sections &&
          res.application.sections.length > 0
        ) {
          // Default select latest section or keep current
          const latestSec =
            res.application.sections[res.application.sections.length - 1];
          setActiveSectionId(latestSec.id);
        }
      }
    } catch (err: any) {
      notify(err.message);
    }
  };

  // ─── Handlers: Create Folder, Application, Section, Upload ─────────────────

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/folders", {
        method: "POST",
        body: JSON.stringify({
          folder_name: folderName,
          description: folderDesc,
          assigned_team_id: folderTeamId,
          assigned_branch_id: folderBranchId || null,
        }),
      });
      setFolderName("");
      setFolderDesc("");
      setShowCreateFolderModal(false);
      notify("Folder Tim berhasil dibuat!");
      await loadAllWorkspaceData();
    } catch (err: any) {
      notify(err.message);
    }
  };

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolder) return;
    try {
      const res = await apiFetch<{ application: ApplicationItem }>(
        `/folders/${selectedFolder.id}/applications`,
        {
          method: "POST",
          body: JSON.stringify({
            app_code: appCode,
            app_name: appName,
            description: appDesc,
            initial_version: appInitVer,
          }),
        }
      );
      setAppCode("");
      setAppName("");
      setAppDesc("");
      setShowCreateAppModal(false);
      notify("Aplikasi & Section Pembuatan Awal (v1.0) berhasil dibuat!");
      await loadAllWorkspaceData();
      if (res?.application) {
        await openApplicationDetail(res.application.id);
      }
    } catch (err: any) {
      notify(err.message);
    }
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    try {
      const res = await apiFetch<{ section: AppChangeSection }>(
        `/applications/${selectedApp.id}/sections`,
        {
          method: "POST",
          body: JSON.stringify({
            version_label: secVersion,
            section_title: secTitle,
            change_description: secDesc,
          }),
        }
      );
      setSecVersion("v1.2");
      setSecTitle("");
      setSecDesc("");
      setShowCreateSectionModal(false);
      notify("Tab Section Perubahan baru berhasil ditambahkan tanpa menghapus dokumen awal!");
      await openApplicationDetail(selectedApp.id);
      if (res?.section) {
        setActiveSectionId(res.section.id);
      }
      await loadAllWorkspaceData();
    } catch (err: any) {
      notify(err.message);
    }
  };

  const handleUploadDocument = async (
    e: React.FormEvent,
    moduleSource: "APPLICATION" | "EVIDENCE"
  ) => {
    e.preventDefault();
    setUploadingDoc(true);
    try {
      const fd = new FormData();
      fd.append("module_source", moduleSource);
      fd.append("doc_category", docCategory);
      fd.append("title", docTitle);
      fd.append("it_domain", docDomain);
      fd.append("audit_tags", docAuditTags);
      fd.append("valid_until", docValidUntil);
      fd.append("ai_summary", docSummary);

      if (moduleSource === "APPLICATION" && selectedApp) {
        fd.append("application_id", selectedApp.id);
        fd.append("section_id", activeSectionId);
        const activeSec = selectedApp.sections?.find(
          (s) => s.id === activeSectionId
        );
        fd.append("version_label", activeSec?.version_label || "v1.0");
      } else {
        fd.append("version_label", docVersionLabel || "v1.0");
        if (isAdminRole(user?.role)) {
          fd.append("visibility_scope", evidenceVisScope);
          if (evidenceVisScope === "TEAM_ONLY") {
            fd.append("target_team_id", evidenceTargetTeamId);
            fd.append("target_branch_id", evidenceTargetBranchId);
          }
        }
      }

      if (docFile) {
        fd.append("file", docFile);
      }

      const res = await apiFetch<{ content_index?: ContentIndexResult }>("/documents/upload", {
        method: "POST",
        body: fd,
      });

      setDocTitle("");
      setDocSummary("");
      setDocFile(null);
      setShowUploadAppDocModal(false);
      setShowUploadEvidenceModal(false);
      const contentIndex = res?.content_index;
      notify(
        contentIndex?.source === "FILE"
          ? `Dokumen berhasil diunggah. Isi file sudah dibaca AI (${contentIndex.chunks} bagian) dan siap dicari.` +
              (contentIndex.note ? ` ${contentIndex.note}` : "")
          : `Dokumen berhasil diunggah. ${contentIndex?.note ?? "AI membaca ringkasan dokumen."}`
      );

      if (moduleSource === "APPLICATION" && selectedApp) {
        await openApplicationDetail(selectedApp.id);
      }
      await loadAllWorkspaceData();
    } catch (err: any) {
      notify(err.message);
    } finally {
      setUploadingDoc(false);
    }
  };

  // ─── Handler: Master Akses (Add User by Badge + Role + Team + Branch) ──────

  const resetUserForm = () => {
    setShowUserForm(false);
    setEditingUserId(null);
    setNewBadge("");
    setNewFullName("");
    setNewEmail("");
    setNewRole("PEGAWAI_TI");
  };

  const openAddUserForm = () => {
    resetUserForm();
    setNewUserTeamId(teams[0]?.id || "");
    setNewUserBranchId("");
    setShowUserForm(true);
  };

  // Simpan form Master Akses: tambah user baru atau simpan perubahan (mode edit)
  const handleSaveMasterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      full_name: newFullName,
      email: newEmail,
      role: newRole,
      team_id: newRole === "PEGAWAI_TI" ? newUserTeamId : null,
      branch_id:
        newRole === "PEGAWAI_TI" && newUserBranchId ? newUserBranchId : null,
    };
    try {
      if (editingUserId) {
        await apiFetch(`/master/users/${editingUserId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        notify("Perubahan akses & segmen pengguna berhasil disimpan!");
      } else {
        await apiFetch("/master/users", {
          method: "POST",
          body: JSON.stringify({ ...payload, badge_number: newBadge }),
        });
        notify("Akses Badge Pegawai baru berhasil ditambahkan!");
      }
      resetUserForm();
      await loadAllWorkspaceData();
    } catch (err: any) {
      notify(err.message);
    }
  };

  const startEditUser = (u: UserProfile) => {
    setEditingUserId(u.id);
    setNewBadge(u.badge_number);
    setNewFullName(u.full_name);
    setNewEmail(u.email);
    setNewRole(u.role);
    const teamId = u.team_id || teams[0]?.id || "";
    setNewUserTeamId(teamId);
    setNewUserBranchId(u.branch_id || "");
    setShowUserForm(true);
  };

  const handleDeleteUser = async (u: UserProfile) => {
    if (!window.confirm(`Hapus akses Badge ${u.badge_number} (${u.full_name})?`)) return;
    try {
      await apiFetch(`/master/users/${u.id}`, { method: "DELETE" });
      if (editingUserId === u.id) resetUserForm();
      notify("Akses pengguna telah dihapus.");
      await loadAllWorkspaceData();
    } catch (err: any) {
      notify(err.message);
    }
  };

  // ─── Handler: Master Data Tim & Branch (Tambah, Rename, Hapus) ───────────

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    try {
      await apiFetch("/master/teams", {
        method: "POST",
        body: JSON.stringify({ team_name: newTeamName }),
      });
      setNewTeamName("");
      notify("Tim baru berhasil ditambahkan!");
      await loadAllWorkspaceData();
    } catch (err: any) {
      notify(err.message);
    }
  };

  const handleSaveMasterRename = async () => {
    if (!editingMaster || !editingMaster.name.trim()) return;
    const { kind, id, name } = editingMaster;
    try {
      await apiFetch(kind === "team" ? `/master/teams/${id}` : `/master/branches/${id}`, {
        method: "PUT",
        body: JSON.stringify(kind === "team" ? { team_name: name } : { branch_name: name }),
      });
      setEditingMaster(null);
      notify(kind === "team" ? "Nama Tim berhasil diubah." : "Nama Branch berhasil diubah.");
      await loadAllWorkspaceData();
    } catch (err: any) {
      notify(err.message);
    }
  };

  const handleDeleteMaster = async (kind: "team" | "branch", id: string, name: string) => {
    const msg =
      kind === "team"
        ? `Hapus Tim "${name}" beserta seluruh branch-nya?`
        : `Hapus Branch "${name}"?`;
    if (!window.confirm(msg)) return;
    try {
      await apiFetch(kind === "team" ? `/master/teams/${id}` : `/master/branches/${id}`, {
        method: "DELETE",
      });
      notify(kind === "team" ? "Tim berhasil dihapus." : "Branch berhasil dihapus.");
      await loadAllWorkspaceData();
    } catch (err: any) {
      notify(err.message);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchTargetTeamId || !newBranchName.trim()) return;
    try {
      await apiFetch("/master/branches", {
        method: "POST",
        body: JSON.stringify({
          team_id: branchTargetTeamId,
          branch_name: newBranchName,
        }),
      });
      setNewBranchName("");
      notify("Branch baru berhasil ditambahkan ke Tim!");
      await loadAllWorkspaceData();
    } catch (err: any) {
      notify(err.message);
    }
  };

  // ─── Handler: Agentic AI Search (ChatGPT / Gemini Conversational Flow) ─────

  const scrollToChatBottom = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 80);
  };

  // Kirim dari input chat Agentic AI: bila ada file terlampir, buka sesi upload (AI memberi pilihan,
  // user yang memutuskan); bila tidak, jalankan pencarian biasa.
  const handleSendAgentic = (customPrompt?: string) => {
    if (!aiAttachedFile) {
      handleAskAgenticAI(customPrompt);
      return;
    }
    const message = (customPrompt ?? aiPrompt).trim();
    if (message) {
      setPromptHistory((prev) => [message, ...prev.filter((p) => p !== message)]);
      historyIndexRef.current = -1;
      promptDraftRef.current = "";
    }
    setAiHistory((prev) => [
      ...prev,
      {
        kind: "upload",
        question: message || `Unggah dokumen ${aiAttachedFile.name}`,
        uploadId: `${Date.now()}-${aiAttachedFile.name}`,
        file: aiAttachedFile,
        message,
      },
    ]);
    setAiAttachedFile(null);
    setAiPrompt("");
    scrollToChatBottom();
  };

  const attachAgenticFile = (file: File | undefined | null) => {
    if (!file) return;
    if (impersonation) {
      notify("Mode impersonate bersifat read-only — upload dinonaktifkan.");
      return;
    }
    setAiAttachedFile(file);
  };

  // Preferensi Thinking diingat per browser
  useEffect(() => {
    try {
      setAiThinking(localStorage.getItem(THINKING_PREF_KEY) === "1");
    } catch {
      // localStorage tidak tersedia: pakai default (mati)
    }
  }, []);

  const toggleAiThinking = () => {
    setAiThinking((on) => {
      try {
        localStorage.setItem(THINKING_PREF_KEY, on ? "0" : "1");
      } catch {
        // abaikan: preferensi hanya kenyamanan
      }
      return !on;
    });
  };

  const updateAiLive = (fn: (prev: LiveAnswer) => LiveAnswer) => {
    if (!aiLiveRef.current) return;
    aiLiveRef.current = fn(aiLiveRef.current);
    setAiLive(aiLiveRef.current);
  };

  const handleAskAgenticAI = async (customPrompt?: string) => {
    const q = (customPrompt ?? aiPrompt).trim();
    if (!q || aiLoading) return;
    if (activeMenu !== "agentic") {
      setActiveMenu("agentic");
    }
    setPromptHistory((prev) => [q, ...prev.filter((p) => p !== q)]);
    historyIndexRef.current = -1;
    promptDraftRef.current = "";
    const replyRef = aiReplyTo?.ref ?? null;
    const thinking = aiThinking;
    setAiPrompt("");
    setAiReplyTo(null);
    setAiPendingQuestion(q);
    setAiPendingReplyTo(replyRef);
    setAiLoading(true);
    aiLiveRef.current = { steps: [], usage: null, answer: "", startedAt: Date.now(), thinking };
    aiLiveShownRef.current = 0;
    aiScrolledAtRef.current = 0;
    setAiLive(aiLiveRef.current);
    const controller = new AbortController();
    aiAbortRef.current = controller;
    scrollToChatBottom();

    try {
      const res = await streamAgenticChat(
        {
          prompt: q,
          filter_module: aiFilterModule,
          session_id: aiSessionId ?? "",
          thinking,
          ...(replyRef ? { reply_to: replyRef } : {}),
        },
        {
          onStep: (step) =>
            updateAiLive((prev) => {
              const steps = prev.steps.some((s) => s.id === step.id)
                ? prev.steps.map((s) => (s.id === step.id ? step : s))
                : [...prev.steps, step];
              return { ...prev, steps };
            }),
          onUsage: (usage) => updateAiLive((prev) => ({ ...prev, usage })),
          onDelta: (text) => updateAiLive((prev) => ({ ...prev, answer: prev.answer + text })),
          onReset: () => {
            aiLiveShownRef.current = 0;
            updateAiLive((prev) => ({ ...prev, answer: "" }));
          },
        },
        controller.signal
      );
      // Append chronologically (top-to-bottom like ChatGPT / Gemini); sisa jawaban lanjut "diketik" dari posisi live
      setAiHistory((prev) => [
        ...prev,
        { question: q, response: res, replyTo: replyRef ?? undefined, typing: true, typingFrom: aiLiveShownRef.current },
      ]);
      if (res.session_id) {
        setAiSessionId(res.session_id);
        loadAiSessions();
      }
      scrollToChatBottom();
      loadAllWorkspaceData();
      loadAiQuota();
    } catch (err: any) {
      const live = aiLiveRef.current;
      if (err?.name === "AbortError" && live) {
        // Dihentikan user: tampilkan apa yang sudah dikerjakan (tidak disimpan ke riwayat)
        const elapsed = Date.now() - live.startedAt;
        setAiHistory((prev) => [
          ...prev,
          {
            question: q,
            replyTo: replyRef ?? undefined,
            stopped: true,
            typing: true,
            typingFrom: aiLiveShownRef.current,
            response: {
              reply_markdown: live.answer || "_Jawaban dihentikan sebelum selesai._",
              engine_mode: "Dihentikan oleh user",
              scope_label: "",
              matched_documents: [],
              queried_at: new Date().toISOString(),
              trace: {
                thinking: live.thinking,
                steps: live.steps.map((s) => (s.status === "running" ? { ...s, status: "error", detail: "Dihentikan oleh user." } : s)),
                usage: live.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, calls: 0 },
                duration_ms: elapsed,
                searches: live.steps.filter((s) => s.kind === "search").length,
                findings: 0,
                docs_read: 0,
              },
            },
          },
        ]);
      } else {
        notify(err.message);
      }
    } finally {
      setAiPendingQuestion(null);
      setAiPendingReplyTo(null);
      aiLiveRef.current = null;
      setAiLive(null);
      aiAbortRef.current = null;
      setAiLoading(false);
    }
  };

  const stopAgenticAI = () => aiAbortRef.current?.abort();

  // Animasi mengetik selesai: jawaban tampil statis & kartu dokumen + aksi dimunculkan
  const finishTyping = (index: number) =>
    setAiHistory((prev) => prev.map((it, i) => (i === index && it.kind !== "upload" ? { ...it, typing: false } : it)));

  // Gulir mengikuti teks yang sedang diketik (tiap ±300 karakter agar tidak tersendat)
  const followTyping = (shown: number) => {
    if (shown - aiScrolledAtRef.current > 300) {
      aiScrolledAtRef.current = shown;
      scrollToChatBottom();
    }
  };

  // Balas: pesan ini ikut dikirim ke AI sebagai konteks pertanyaan berikutnya di percakapan yang sama
  const replyToMessage = (role: ChatReplyRef["role"], text: string, messageId?: number) => {
    setAiReplyTo({ ref: { role, mode: "reply", message_id: messageId, text }, preview: text });
    setTimeout(() => aiInputRef.current?.focus(), 50);
  };

  // Teruskan: buka percakapan baru dengan pesan ini sebagai konteks
  const forwardMessage = (role: ChatReplyRef["role"], text: string, messageId?: number) => {
    startNewAiChat();
    setAiReplyTo({ ref: { role, mode: "forward", message_id: messageId, text }, preview: text });
    notify("Pesan diteruskan ke percakapan baru. Tulis pertanyaan Anda tentang pesan ini.");
  };

  // Ikuti jawaban yang sedang disusun: gulir saat ada langkah baru atau jawaban bertambah panjang
  const liveProgress = aiLive ? `${aiLive.steps.length}-${Math.floor(aiLive.answer.length / 400)}` : "";
  useEffect(() => {
    if (liveProgress) scrollToChatBottom();
  }, [liveProgress]);

  // Ambil daftar riwayat pertanyaan user untuk navigasi keyboard Panah Atas / Bawah
  const getEffectivePromptHistory = (): string[] => {
    if (promptHistory.length > 0) return promptHistory;
    const fromHistory = aiHistory
      .map((item) => item.question?.trim())
      .filter((q): q is string => Boolean(q));
    return [...fromHistory].reverse();
  };

  // Navigasi keyboard Panah Atas / Bawah (seperti di Gemini / ChatGPT / terminal)
  const handlePromptKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    isTextarea: boolean
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (isTextarea) {
        e.preventDefault();
        handleSendAgentic();
        return;
      }
    }

    if (e.key === "Escape" && historyIndexRef.current !== -1) {
      e.preventDefault();
      setAiPrompt(promptDraftRef.current);
      historyIndexRef.current = -1;
      return;
    }

    if (e.key === "ArrowUp") {
      const history = getEffectivePromptHistory();
      if (history.length === 0) return;

      const target = e.currentTarget;
      const isAtStart = target.selectionStart === 0 && target.selectionEnd === 0;
      const isNavigating = historyIndexRef.current !== -1;
      const isEmpty = aiPrompt.trim() === "";

      if (isEmpty || isAtStart || isNavigating) {
        e.preventDefault();

        if (historyIndexRef.current === -1) {
          promptDraftRef.current = aiPrompt;
        }

        const nextIndex = Math.min(historyIndexRef.current + 1, history.length - 1);
        if (nextIndex >= 0 && nextIndex < history.length) {
          historyIndexRef.current = nextIndex;
          const recalled = history[nextIndex];
          setAiPrompt(recalled);
          setTimeout(() => {
            if (aiInputRef.current) {
              const len = recalled.length;
              aiInputRef.current.setSelectionRange?.(len, len);
            }
          }, 0);
        }
      }
    } else if (e.key === "ArrowDown") {
      if (historyIndexRef.current !== -1) {
        e.preventDefault();

        const history = getEffectivePromptHistory();
        const nextIndex = historyIndexRef.current - 1;

        if (nextIndex >= 0 && nextIndex < history.length) {
          historyIndexRef.current = nextIndex;
          const recalled = history[nextIndex];
          setAiPrompt(recalled);
          setTimeout(() => {
            if (aiInputRef.current) {
              const len = recalled.length;
              aiInputRef.current.setSelectionRange?.(len, len);
            }
          }, 0);
        } else {
          // Melewati prompt terbaru: pulihkan draft teks yang sempat diketik user
          historyIndexRef.current = -1;
          const draft = promptDraftRef.current;
          setAiPrompt(draft);
          setTimeout(() => {
            if (aiInputRef.current) {
              const len = draft.length;
              aiInputRef.current.setSelectionRange?.(len, len);
            }
          }, 0);
        }
      }
    }
  };

  // ─── Riwayat Chat Agentic AI (tersimpan di server per user) ────────────────

  const loadAiSessions = async () => {
    try {
      const res = await apiFetch<{ sessions: AIChatSession[] }>("/ai/chat/sessions");
      setAiSessions(res.sessions || []);
    } catch {
      // Riwayat hanya pelengkap; chat tetap bisa dipakai walau daftar gagal dimuat
    }
  };

  const loadAiQuota = async () => {
    try {
      const res = await apiFetch<{ quota: AIQuotaSummary }>("/ai/quota");
      setAiQuota(res.quota);
    } catch {
      // Peringatan kuota hanya pelengkap
    }
  };

  const loadAiShortcuts = async () => {
    try {
      setLoadingShortcuts(true);
      const res = await apiFetch<{ shortcuts: string[] }>("/ai/chat/shortcuts");
      if (res?.shortcuts && res.shortcuts.length > 0) {
        setAiShortcuts(res.shortcuts);
      }
    } catch {
      // Pertahankan shortcut default bila gagal
    } finally {
      setLoadingShortcuts(false);
    }
  };

  const startNewAiChat = () => {
    aiAbortRef.current?.abort();
    setAiHistory([]);
    setAiPendingQuestion(null);
    setAiSessionId(null);
    setAiReplyTo(null);
  };

  const openAiSession = async (id: string) => {
    try {
      const res = await apiFetch<{ session: AIChatSession; messages: AIChatTurn[] }>(
        `/ai/chat/sessions/${id}`
      );
      setAiHistory(res.messages.map((m) => ({ question: m.question, response: m.response, replyTo: m.reply_to })));
      const questionsFromSession = res.messages
        .map((m) => m.question?.trim())
        .filter((q): q is string => Boolean(q))
        .reverse();
      setPromptHistory((prev) => {
        const combined = [...questionsFromSession];
        for (const p of prev) {
          if (!combined.includes(p)) combined.push(p);
        }
        return combined;
      });
      historyIndexRef.current = -1;
      promptDraftRef.current = "";
      setAiReplyTo(null);
      setAiPendingQuestion(null);
      setAiSessionId(id);
      setShowAiSessions(false);
      scrollToChatBottom();
    } catch (err: any) {
      notify(err.message);
      loadAiSessions();
    }
  };

  const deleteAiSession = async (s: AIChatSession) => {
    if (!window.confirm(`Hapus riwayat chat "${s.title}"?`)) return;
    try {
      await apiFetch(`/ai/chat/sessions/${s.id}`, { method: "DELETE" });
      if (s.id === aiSessionId) startNewAiChat();
      setAiSessions((prev) => prev.filter((x) => x.id !== s.id));
    } catch (err: any) {
      notify(err.message);
    }
  };

  // Muat daftar riwayat chat & shortcut AI saat membuka menu Agentic AI
  useEffect(() => {
    if (activeMenu === "agentic" && !impersonation) loadAiSessions();
    if (activeMenu === "agentic") {
      loadAiQuota();
      loadAiShortcuts();
    }
  }, [activeMenu, impersonation]);

  // Ganti segmen impersonate = cakupan dokumen berbeda, jadi mulai percakapan baru & muat ulang shortcut
  useEffect(() => {
    startNewAiChat();
    setShowAiSessions(false);
    loadAiShortcuts();
  }, [impersonation]);

  // Helper to format inline bold (**text**) and code (`text`) cleanly
  const formatInlineText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono text-xs border border-blue-100"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const renderFormattedMarkdown = (md: string) => {
    // Baris kutipan berurutan ("> ...", mis. isi dokumen) digabung menjadi satu blok kutipan
    const blocks: Array<{ quote: boolean; lines: string[] }> = [];
    for (const rawLine of md.split("\n")) {
      const line = rawLine.trim();
      const quote = line.startsWith(">");
      const text = quote ? line.replace(/^>\s?/, "") : line;
      const last = blocks[blocks.length - 1];
      if (quote && last?.quote) last.lines.push(text);
      else blocks.push({ quote, lines: [text] });
    }
    return (
      <div className="space-y-2 text-sm text-slate-700 leading-relaxed">
        {blocks.map((block, i) => {
          if (block.quote) {
            return (
              <blockquote
                key={i}
                className="ml-1 pl-3 border-l-2 border-blue-200 text-[13px] text-slate-600 space-y-1"
              >
                {block.lines.map((l, j) =>
                  l ? <p key={j}>{formatInlineText(l)}</p> : <div key={j} className="h-1" />
                )}
              </blockquote>
            );
          }
          const line = block.lines[0];
          if (!line) return <div key={i} className="h-1" />;
          const heading = line.match(/^#{1,4}\s+(.*)$/);
          if (heading) {
            return (
              <h4
                key={i}
                className="text-base font-black text-blue-950 pt-2 pb-0.5 border-b border-slate-100"
              >
                {formatInlineText(heading[1])}
              </h4>
            );
          }
          if (line.startsWith("- ") || line.startsWith("* ")) {
            return (
              <div key={i} className="flex items-start gap-2.5 pl-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                <div className="flex-1">{formatInlineText(line.slice(2))}</div>
              </div>
            );
          }
          return <p key={i}>{formatInlineText(line)}</p>;
        })}
      </div>
    );
  };

  const handleLogout = () => {
    clearAuthSession();
    triggerPageLoader({
      targetPath: "/",
      customTitle: "Menutup Sesi & Kembali ke Halaman Utama",
    });
    router.push("/");
  };

  // Helper to get branches for a selected team
  const getBranchesForTeam = (tId: string) => {
    const found = teams.find((t) => t.id === tId);
    return found?.branches || [];
  };

  const activeSectionObj = selectedApp?.sections?.find(
    (s) => s.id === activeSectionId
  );

  if (!user) return null;

  const isAdmin = isAdminRole(user.role);
  const isSuperAdmin = realUser?.role === "SUPER_ADMIN";
  const isImpersonating = !!impersonation;
  const initialSuperAdminBadge = "2411249";
  const segmentLabel = `${user.team?.team_name || "Pegawai TI"}${
    user.branch ? ` • ${user.branch.branch_name}` : ""
  }`;

  // Tombol 📎 lampirkan dokumen di chat Agentic AI (disembunyikan saat impersonate karena read-only)
  const renderAttachButton = () =>
    !isImpersonating && (
      <button
        type="button"
        onClick={() => aiFileInputRef.current?.click()}
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
          aiAttachedFile
            ? "bg-blue-600 text-white"
            : "bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
        }`}
        title="Lampirkan dokumen untuk diunggah via Agentic AI (atau drag & drop ke area chat)"
      >
        <Paperclip size={16} />
      </button>
    );

  // Saklar mode Thinking: AI menelusuri repositori berkali-kali, membaca lebih dalam, lalu menilai ulang temuan
  const renderThinkingToggle = () => (
    <button
      type="button"
      onClick={toggleAiThinking}
      aria-pressed={aiThinking}
      title={
        aiThinking
          ? "Thinking aktif: AI mencari berkali-kali, membaca lebih dalam, dan menilai ulang temuan sebelum menjawab"
          : "Aktifkan Thinking untuk pencarian yang lebih luas & mendalam (lebih lama, memakai lebih banyak token)"
      }
      className={`h-9 px-3 rounded-xl flex items-center gap-1.5 text-xs font-bold flex-shrink-0 transition-all ${
        aiThinking
          ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/25"
          : "bg-slate-100 text-slate-500 hover:bg-violet-50 hover:text-violet-700"
      }`}
    >
      <Brain size={15} />
      Thinking
    </button>
  );

  const renderReplyChip = () =>
    aiReplyTo && (
      <div className="flex items-start gap-2 mt-2 px-3 py-2 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs">
        {aiReplyTo.ref.mode === "forward" ? (
          <Forward size={14} className="text-indigo-600 flex-shrink-0 mt-0.5" />
        ) : (
          <Reply size={14} className="text-indigo-600 flex-shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-bold text-indigo-900">
            {aiReplyTo.ref.mode === "forward" ? "Meneruskan" : "Membalas"}{" "}
            {aiReplyTo.ref.role === "answer" ? "jawaban PANDA AI" : "pertanyaan Anda"}
          </p>
          <p className="text-slate-600 line-clamp-2">{aiReplyTo.preview.replace(/[#>*`]/g, "").trim()}</p>
        </div>
        <button
          type="button"
          onClick={() => setAiReplyTo(null)}
          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white flex-shrink-0"
          title="Batal membalas"
        >
          <X size={13} />
        </button>
      </div>
    );

  // Gelembung "sedang mengetik" saat AI memahami pertanyaan, menelusuri, atau mulai menyusun jawaban
  const renderTypingBubble = () => {
    const live = aiLive;
    const running = live ? [...live.steps].reverse().find((s) => s.status === "running") : undefined;
    let label: string | null = null;
    if (!live || live.steps.length === 0) label = live?.thinking ? "Memahami pertanyaan" : "Menelusuri repositori";
    else if (running?.kind === "answer") label = "Menyusun jawaban";
    if (!label) return null;
    const thinking = !!live?.thinking;
    return (
      <div className="bg-white rounded-3xl rounded-tl-md px-5 py-3.5 border border-blue-200 shadow-sm inline-flex items-center gap-3 ai-fade-up">
        <span className={`flex items-center gap-1 ${thinking ? "text-violet-500" : "text-blue-500"}`}>
          <span className="ai-typing-dot" />
          <span className="ai-typing-dot" />
          <span className="ai-typing-dot" />
        </span>
        <span className={`text-xs font-bold ai-shimmer-text ${thinking ? "text-violet-800" : "text-slate-600"}`}>
          {label}…
        </span>
      </div>
    );
  };

  // Kutipan pesan yang dibalas, ditampilkan di atas pertanyaan user
  const renderReplyQuote = (ref?: ChatReplyRef | null) =>
    ref && (
      <div className="mb-1.5 px-3 py-1.5 rounded-xl bg-white/15 border-l-2 border-white/60 text-[11px] text-blue-50">
        <span className="font-bold flex items-center gap-1">
          {ref.mode === "forward" ? <Forward size={11} /> : <Reply size={11} />}
          {ref.mode === "forward" ? "Diteruskan dari" : "Membalas"} {ref.role === "answer" ? "jawaban PANDA AI" : "pertanyaan"}
        </span>
        {ref.text && <span className="line-clamp-2 opacity-90">{ref.text.replace(/[#>*`]/g, "").trim()}</span>}
      </div>
    );

  const renderAttachedFileChip = () =>
    aiAttachedFile && (
      <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-2xl bg-blue-50 border border-blue-200 text-xs">
        <FileText size={14} className="text-blue-600 flex-shrink-0" />
        <span className="font-bold text-slate-800 truncate">{aiAttachedFile.name}</span>
        <span className="text-slate-500 flex-shrink-0">
          {(aiAttachedFile.size / 1024 / 1024).toFixed(2)} MB
        </span>
        <span className="text-[11px] text-blue-700 hidden sm:inline">
          — kirim untuk melihat pilihan tujuan dari AI
        </span>
        <button
          type="button"
          onClick={() => setAiAttachedFile(null)}
          className="ml-auto p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white flex-shrink-0"
          title="Hapus lampiran"
        >
          <X size={13} />
        </button>
      </div>
    );

  // Input rename inline untuk Tim / Branch di kartu Master Data (Enter simpan, Esc batal)
  const renderMasterRename = () =>
    editingMaster && (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSaveMasterRename();
        }}
        className="flex items-center gap-1 flex-1 min-w-0"
      >
        <input
          autoFocus
          value={editingMaster.name}
          onChange={(e) => setEditingMaster({ ...editingMaster, name: e.target.value })}
          onKeyDown={(e) => e.key === "Escape" && setEditingMaster(null)}
          className="flex-1 min-w-0 px-2.5 py-1 rounded-lg border border-blue-300 bg-white text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <button type="submit" className="p-1.5 rounded-lg bg-blue-600 text-white" title="Simpan">
          <Check size={12} />
        </button>
        <button
          type="button"
          onClick={() => setEditingMaster(null)}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-white"
          title="Batal"
        >
          <X size={12} />
        </button>
      </form>
    );

  // Sapaan, tanggal, & kalender mengikuti waktu lokal (bukan hardcode)
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 11
      ? "Selamat Pagi ☀️"
      : hour < 15
      ? "Selamat Siang 🌤️"
      : hour < 18
      ? "Selamat Sore 🌇"
      : "Selamat Malam 🌙";
  const todayLabel = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const monthLabel = now.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
  const firstWeekday = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col lg:flex-row font-sans text-slate-900">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-blue-500/40 flex items-center gap-3 animate-bounce">
          <CheckCircle2 size={18} className="text-cyan-400" />
          <span className="text-xs font-bold">{toastMsg}</span>
        </div>
      )}

      {/* ─── SIDEBAR NAVIGASI KIRI (FLOWORA LAYOUT IN CORPORATE BLUE BUMN) ─── */}
      <aside
        className={`w-full bg-white border-b lg:border-b-0 lg:border-r border-slate-200/80 flex flex-col p-5 flex-shrink-0 lg:sticky lg:top-0 lg:h-screen lg:self-start transition-[width] duration-200 ${
          sidebarCollapsed ? "lg:w-20 lg:p-3" : "lg:w-72"
        }`}
      >
        {/* Brand Logo Pusri + tombol ciutkan sidebar */}
        <div
          className={`flex items-center justify-between gap-2 mb-7 flex-shrink-0 ${
            sidebarCollapsed ? "lg:justify-center" : ""
          }`}
        >
          <Link
            href="/"
            className={`block px-2 ${sidebarCollapsed ? "lg:hidden" : ""}`}
            title="Ke Landing Page"
          >
            <img
              src="/assets/logo-pusri-horizontal-dark.png"
              alt="PT Pupuk Sriwidjaja Palembang"
              className="h-10 w-auto object-contain"
            />
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            aria-label={sidebarCollapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            className="hidden lg:flex w-9 h-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors flex-shrink-0"
          >
            {sidebarCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
          </button>
        </div>

        {/* Navigation Menu Items (scroll sendiri bila layar pendek) */}
        <nav className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
          <div className="space-y-5">
            {[
              {
                title: "Menu Utama",
                items: [{ id: "dashboard", label: "Dashboard Utama", icon: Home }],
              },
              {
                title: "Asisten Cerdas",
                items: [
                  {
                    id: "agentic",
                    label: "PANDA Agentic AI",
                    icon: Sparkles,
                    highlight: true,
                  },
                ],
              },
              {
                title: "Manajemen Konten",
                items: [
                  {
                    id: "applications",
                    label: "Aplikasi & Versioning",
                    icon: FolderKanban,
                    badge: summary.total_apps,
                  },
                  {
                    id: "evidence",
                    label: "Evidence (Bahan AI)",
                    icon: FileText,
                    badge: summary.total_evidence_docs,
                  },
                ],
              },
              {
                title: "Administrasi",
                items: [
                  ...(isAdmin
                    ? [
                        {
                          id: "master_access",
                          label: "Master Akses & Tim",
                          icon: ShieldCheck,
                        },
                      ]
                    : []),
                  {
                    id: "logs",
                    label: "Log Upload & Audit",
                    icon: History,
                  },
                  ...(isSuperAdmin && !isImpersonating
                    ? [{ id: "docs", label: "Docs", icon: BookOpen }]
                    : []),
                ],
              },
            ].map((section) => (
              <div key={section.title}>
                <p
                  className={`px-4 mb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 ${
                    sidebarCollapsed ? "lg:hidden" : ""
                  }`}
                >
                  {section.title}
                </p>
                {sidebarCollapsed && (
                  <div className="hidden lg:block mx-3 mb-2 border-t border-slate-200" />
                )}
                <div className="space-y-1.5">
                  {section.items.map((item: any) => {
                    const active = activeMenu === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveMenu(item.id as ActiveMenu);
                          if (item.id === "applications") {
                            setSelectedApp(null);
                          }
                        }}
                        title={item.label}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 ${
                          sidebarCollapsed ? "lg:justify-center lg:px-0" : ""
                        } ${
                          active
                            ? `bg-blue-600 text-white shadow-lg shadow-blue-600/25 ${item.highlight ? "panda-glow" : ""}`
                            : item.highlight
                            ? "panda-glow bg-white text-blue-700 hover:bg-blue-50/80"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon
                            size={19}
                            className={
                              active
                                ? "text-white"
                                : item.highlight
                                ? "text-blue-600"
                                : "text-slate-400"
                            }
                          />
                          <span className={sidebarCollapsed ? "lg:hidden" : ""}>
                            {item.label}
                          </span>
                        </div>
                        {item.badge !== undefined && (
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-extrabold ${
                              sidebarCollapsed ? "lg:hidden" : ""
                            } ${
                              active
                                ? "bg-white/20 text-white"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Bottom Corporate Info Card (selalu terlihat di dasar sidebar) */}
        <div className="mt-5 pt-5 border-t border-slate-100 space-y-3 flex-shrink-0">
            {isSuperAdmin && sidebarCollapsed && (
              <button
                type="button"
                onClick={toggleSidebar}
                title="Lihat sebagai… (perluas sidebar)"
                className={`hidden lg:flex w-full items-center justify-center py-2.5 rounded-2xl border transition-colors ${
                  isImpersonating
                    ? "bg-amber-50 border-amber-300 text-amber-800"
                    : "bg-white border-slate-200 text-slate-700 hover:border-blue-300"
                }`}
              >
                <UserCog size={16} />
              </button>
            )}
            {isSuperAdmin && (
              <CustomSelect
                leftIcon={<UserCog size={14} />}
                title="Lihat dashboard sebagai pegawai pada segmen Tim / Branch tertentu"
                value={
                  impersonation
                    ? `${impersonation.team_id}|${impersonation.branch_id ?? ""}`
                    : ""
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return switchSegment(null);
                  const [team_id, branch_id] = v.split("|");
                  switchSegment({ team_id, branch_id: branch_id || null });
                }}
                className={`w-full px-4 py-2.5 rounded-2xl border text-xs font-bold ${
                  sidebarCollapsed ? "lg:hidden" : ""
                } ${
                  isImpersonating
                    ? "bg-amber-50 border-amber-300 text-amber-800"
                    : "bg-white border-slate-200 text-slate-700 hover:border-blue-300"
                }`}
              >
                <option value="">Super Admin</option>
                {teams.map((t) => (
                  <optgroup key={t.id} label={t.team_name}>
                    <option value={`${t.id}|`}>
                      {t.team_name}
                      {t.branches && t.branches.length > 0 ? " (seluruh tim)" : ""}
                    </option>
                    {t.branches?.map((b) => (
                      <option key={b.id} value={`${t.id}|${b.id}`}>
                        {t.team_name} • {b.branch_name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </CustomSelect>
            )}
            <Link
              href="/"
              title="Kembali ke Landing Page"
              className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              <Globe size={14} />
              <span className={sidebarCollapsed ? "lg:hidden" : ""}>Landing Page</span>
            </Link>

          <button
            onClick={handleLogout}
            title="Keluar"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-slate-200 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut size={15} />
            <span className={sidebarCollapsed ? "lg:hidden" : ""}>
              Keluar (Badge: {realUser?.badge_number || user.badge_number})
            </span>
          </button>
        </div>
      </aside>

      {/* ─── MAIN WORKSPACE AREA ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar (Flowora Search + User Profile Pill) */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/70 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
          {/* Quick AI Search Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskAgenticAI();
            }}
            className="relative flex-1 max-w-xl"
          >
            <Search
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Cari dokumen PRD, UAT, BAST, atau Evidence via Agentic AI..."
              className="w-full pl-11 pr-28 py-2.5 rounded-full bg-slate-100/90 border border-slate-200/80 text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1.5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center gap-1 hover:bg-blue-700 transition-colors"
            >
              <Sparkles size={12} /> Tanya AI
            </button>
          </form>

          {/* Right User Badge Info */}
          <div className="flex items-center gap-3">
            <span className="hidden 2xl:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
              <ShieldCheck size={14} />
              Badge: {user.badge_number} • {user.role}
            </span>
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-sky-400 text-white font-black text-xs flex items-center justify-center shadow-sm">
                {user.full_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {user.full_name}
                </p>
                <p className="text-[11px] text-slate-500">
                  {isAdmin ? `${ROLE_LABELS[user.role]} PANDA` : segmentLabel}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Banner Mode Impersonate (Super Admin) */}
        {isImpersonating && (
          <div className="mx-6 mt-5 px-5 py-3.5 rounded-2xl bg-amber-50 border border-amber-300 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center flex-shrink-0">
                <UserCog size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-amber-900">
                  Mode Impersonate: {segmentLabel}
                </p>
                <p className="text-[11px] text-amber-800">
                  Tampilan & data persis seperti Pegawai TI di segmen ini. Bersifat read-only
                  — upload & perubahan data dinonaktifkan.
                </p>
              </div>
            </div>
            <button
              onClick={() => switchSegment(null)}
              className="px-4 py-2 rounded-xl bg-amber-900 hover:bg-amber-950 text-white text-xs font-bold flex items-center gap-1.5 flex-shrink-0"
            >
              <X size={14} /> Keluar dari Impersonate
            </button>
          </div>
        )}

        {/* Main Content Switcher */}
        <main className="p-6 flex-1 overflow-y-auto">
          {/* ===================================================================
              TAB 1: DASHBOARD UTAMA (BENTO GRID CORPORATE BLUE - SCREENSHOT 1)
             =================================================================== */}
          {activeMenu === "dashboard" && (
            <div className="grid xl:grid-cols-12 gap-6">
              {/* Left/Center 8 Columns */}
              <div className="xl:col-span-8 space-y-6">
                {/* Greeting Banner + 4 KPI Cards (Flowora Top Card in Corporate Blue) */}
                <div className="bg-white rounded-[2rem] p-6 sm:p-7 border border-slate-200/80 shadow-sm relative overflow-hidden">
                  <div className="rounded-3xl bg-gradient-to-r from-[#0f172a] via-[#1d4ed8] to-[#0284c7] p-6 sm:p-8 text-white relative overflow-hidden mb-6">
                    <div className="absolute right-[-5%] top-[-20%] w-64 h-64 bg-cyan-300/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-cyan-200 text-[11px] font-bold uppercase tracking-wider mb-3">
                          🐼 PANDA Governance Workspace
                        </span>
                        <p className="text-sm font-semibold text-blue-100 mb-0.5">
                          {greeting}
                        </p>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-2">
                          {user.full_name}
                        </h1>
                        <p className="text-blue-100 text-xs sm:text-sm max-w-xl">
                          &ldquo;Sentralisasi, Standardisasi, dan Reusability
                          Evidence Audit TI PT Pupuk Sriwidjaja Palembang.&rdquo;
                        </p>
                      </div>

                      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 sm:text-right flex-shrink-0">
                        <p className="text-xs font-bold text-cyan-200 uppercase tracking-wider">
                          {todayLabel}
                        </p>
                        <p className="text-lg font-black text-white mt-0.5">
                          Badge #{user.badge_number}
                        </p>
                        <p className="text-[11px] text-blue-100">
                          {summary.user_scope_label}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 4 Bento KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      {
                        label: "Folder Tim",
                        val: summary.total_folders,
                        sub: "Folder Ter-assign",
                        icon: FolderKanban,
                        bg: "bg-blue-50/90 border-blue-100",
                        iconBg: "bg-blue-600 text-white",
                      },
                      {
                        label: "Total Aplikasi",
                        val: summary.total_apps,
                        sub: "Ber-versioning",
                        icon: Layers,
                        bg: "bg-sky-50/90 border-sky-100",
                        iconBg: "bg-sky-500 text-white",
                      },
                      {
                        label: "Dokumen SDLC",
                        val: summary.total_app_docs,
                        sub: "PRD • UAT • BAST",
                        icon: FileCheck,
                        bg: "bg-indigo-50/90 border-indigo-100",
                        iconBg: "bg-indigo-600 text-white",
                      },
                      {
                        label: "Evidence AI",
                        val: summary.total_evidence_docs,
                        sub: "Lintas Tim TI",
                        icon: Sparkles,
                        bg: "bg-emerald-50/90 border-emerald-100",
                        iconBg: "bg-emerald-600 text-white",
                      },
                    ].map((k) => (
                      <div
                        key={k.label}
                        className={`p-4 rounded-2xl border ${k.bg} flex flex-col gap-3 min-w-0 transition-transform hover:-translate-y-1`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div
                            className={`w-10 h-10 rounded-xl ${k.iconBg} flex items-center justify-center shadow-sm flex-shrink-0`}
                          >
                            <k.icon size={19} />
                          </div>
                          <p className="text-2xl font-black text-slate-900 leading-none tabular-nums">
                            {k.val}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">
                            {k.label}
                          </p>
                          <p className="text-[11px] font-semibold text-blue-700 truncate">
                            {k.sub}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Middle Row: 3 Bento Cards (Upload Trend, Donut Chart, Live Upload Activity) */}
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Card 1: Kepatuhan & Pertumbuhan Dokumen */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="block text-xs font-bold text-slate-800 mb-3">
                        Total Terindeks AI
                      </span>
                      <p className="text-3xl font-black text-slate-900">
                        {summary.total_all_docs}{" "}
                        <span className="text-sm font-semibold text-slate-500">
                          Dokumen
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Seluruh versi awal & perubahan tersimpan utuh
                      </p>
                      <span className="inline-block mt-2.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold whitespace-nowrap">
                        +100% Terpusat
                      </span>
                    </div>

                    {/* Smooth Corporate Blue SVG Area Chart */}
                    <div className="mt-6">
                      <svg viewBox="0 0 240 80" className="w-full h-24 overflow-visible">
                        <defs>
                          <linearGradient id="blueArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0,65 Q40,55 75,42 T150,28 T240,10 L240,80 L0,80 Z"
                          fill="url(#blueArea)"
                        />
                        <path
                          d="M0,65 Q40,55 75,42 T150,28 T240,10"
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                        <circle cx="150" cy="28" r="4" fill="#2563eb" />
                        <circle cx="240" cy="10" r="5" fill="#0284c7" />
                      </svg>
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
                        <span>Q1</span>
                        <span>Q2</span>
                        <span>Q3</span>
                        <span>Q4 2026</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Donut Chart Cakupan Tim */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="text-xs font-bold text-slate-800 min-w-0">
                        Kepatuhan Audit TI
                      </span>
                      <span className="text-xs font-extrabold text-blue-600">
                        {summary.compliance_rate}%
                      </span>
                    </div>

                    <div className="flex flex-col items-center gap-4 my-auto">
                      <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="3.8"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="3.8"
                            strokeDasharray={`${summary.compliance_rate}, 100`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute text-lg font-black text-blue-950">
                          {summary.compliance_rate}%
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs w-full">
                        {Object.entries(teamDist).map(([tName, cnt]) => (
                          <div
                            key={tName}
                            className="flex items-center justify-between gap-3 text-[11px]"
                          >
                            <span className="text-slate-600 truncate min-w-0">
                              {tName.replace("Tim ", "")}
                            </span>
                            <span className="font-bold text-slate-900 flex-shrink-0 tabular-nums">
                              {cnt}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-[11px] text-emerald-600 font-bold mt-3">
                      ✓ Standar Penamaan & Versioning Aktif
                    </p>
                  </div>

                  {/* Card 3: Live Team Upload Activity */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="text-xs font-bold text-slate-800 min-w-0">
                        Log Upload Terbaru
                      </span>
                      <button
                        onClick={() => setActiveMenu("logs")}
                        className="text-[11px] font-bold text-blue-600 hover:underline whitespace-nowrap"
                      >
                        Semua →
                      </button>
                    </div>

                    <div className="space-y-3 my-auto">
                      {logs.slice(0, 3).map((lg) => (
                        <div key={lg.id} className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-black text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                            {lg.user_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {lg.user_name}{" "}
                              <span className="text-[10px] font-semibold text-blue-600">
                                ({lg.badge_number})
                              </span>
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {lg.document_title || lg.detail_description}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(lg.action_timestamp).toLocaleString(
                                "id-ID"
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Folder & Aplikasi Terbaru + Quick Actions */}
                <div className="grid md:grid-cols-12 gap-6">
                  {/* Folder & Applications Card */}
                  <div className="md:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm">
                          Folder Tim & Aplikasi Terdaftar
                        </h3>
                        <p className="text-xs text-slate-500">
                          Klik folder untuk melihat aplikasi & section perubahan
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveMenu("applications")}
                        className="text-xs font-bold text-blue-600 hover:underline whitespace-nowrap flex-shrink-0"
                      >
                        Buka Semua →
                      </button>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3.5">
                      {folders.slice(0, 4).map((f) => (
                        <div
                          key={f.id}
                          onClick={() => {
                            setSelectedFolder(f);
                            setSelectedApp(null);
                            setActiveMenu("applications");
                          }}
                          className="p-4 rounded-2xl border border-slate-200/80 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group bg-slate-50/50 min-w-0"
                        >
                          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm mb-3">
                            <FolderKanban size={18} />
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors truncate">
                            {f.folder_name}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {f.applications?.length || 0} Aplikasi Terdaftar
                          </p>
                          <span className="inline-block max-w-full truncate mt-2.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                            {f.assigned_team?.team_name.replace("Tim ", "")}
                            {f.assigned_branch
                              ? ` • ${f.assigned_branch.branch_name}`
                              : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Actions Grid (Flowora Style in Corporate Blue) */}
                  <div className="md:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
                    <h3 className="font-bold text-slate-900 text-sm mb-4">
                      Aksi Cepat (Quick Actions)
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          setActiveMenu("evidence");
                          setShowUploadEvidenceModal(true);
                        }}
                        className="p-3.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-all"
                      >
                        <Upload size={20} />
                        Upload Evidence
                      </button>
                      <button
                        onClick={() => setActiveMenu("applications")}
                        className="p-3.5 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-700 flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-all"
                      >
                        <FolderKanban size={20} />
                        Buka Aplikasi
                      </button>
                      <button
                        onClick={() => setActiveMenu("agentic")}
                        className="p-3.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-all"
                      >
                        <Sparkles size={20} />
                        Tanya Agentic AI
                      </button>
                      <button
                        onClick={() =>
                          setActiveMenu(
                            isAdmin ? "master_access" : "logs"
                          )
                        }
                        className="p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-all"
                      >
                        <ShieldCheck size={20} />
                        {isAdmin ? "Master Akses" : "Log Upload"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 4 Columns (Calendar, Recent Docs, & Mini PANDA AI Launcher) */}
              <div className="xl:col-span-4 space-y-6">
                {/* Calendar Card */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <CalendarIcon size={17} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-900 leading-tight">
                        Jadwal & Periode Audit
                      </p>
                      <p className="text-[11px] font-bold text-blue-600">
                        {monthLabel}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                    {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map(
                      (d) => (
                        <span key={d} className="text-[10px] font-bold text-slate-400 py-1">
                          {d}
                        </span>
                      )
                    )}
                    {Array.from({ length: firstWeekday }, (_, idx) => (
                      <div key={`pad-${idx}`} />
                    ))}
                    {Array.from({ length: daysInMonth }, (_, idx) => idx + 1).map(
                      (day) => (
                        <div
                          key={day}
                          className={`py-1.5 rounded-xl font-bold text-xs ${
                            day === now.getDate()
                              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {day}
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Recent Documents Card with Direct Preview & Download */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <span className="font-bold text-sm text-slate-900 leading-tight min-w-0">
                      Dokumen & Evidence Terbaru
                    </span>
                    <button
                      onClick={() => setActiveMenu("evidence")}
                      className="text-xs font-bold text-blue-600 hover:underline whitespace-nowrap flex-shrink-0"
                    >
                      Lihat Semua →
                    </button>
                  </div>
                  <div className="space-y-3">
                    {recentDocs.slice(0, 4).map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-extrabold">
                              {doc.doc_category}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">
                              {doc.version_label}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 truncate mt-1">
                            {doc.title}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            Oleh: {doc.uploaded_by_name} ({doc.uploaded_by_badge})
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() =>
                              setPreviewDoc({
                                id: doc.id,
                                title: doc.title,
                                stdName: doc.standardized_name,
                                uploader: `${doc.uploaded_by_name} (${doc.uploaded_by_badge})`,
                                time: new Date(doc.uploaded_at).toLocaleString(
                                  "id-ID"
                                ),
                              })
                            }
                            className="p-2 rounded-xl bg-white border border-slate-200 text-blue-600 hover:bg-blue-50"
                            title="Lihat Dokumen"
                          >
                            <Eye size={14} />
                          </button>
                          <a
                            href={getDocumentDownloadUrl(doc.id)}
                            className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                            title="Download Langsung"
                          >
                            <Download size={14} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Flowora Bottom-Right AI Widget in Corporate Navy & Moving Blue Orb */}
                <div className="rounded-3xl bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#0f172a] p-6 text-white shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">
                        Asisten Audit Pintar
                      </span>
                      <h4 className="text-lg font-black">PANDA Agentic AI</h4>
                    </div>
                    <div
                      onClick={() => setActiveMenu("agentic")}
                      className="w-12 h-12 living-orb-core cursor-pointer"
                    >
                      <div className="living-orb-plasma" />
                      <div className="living-orb-gloss" />
                    </div>
                  </div>
                  <p className="text-xs text-blue-100 mb-4">
                    Ketik dokumen UAT, PRD, BAST, atau Evidence untuk mendapatkan
                    ringkasan & tombol download instan.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAskAgenticAI();
                    }}
                    className="flex items-center gap-2 bg-white rounded-2xl p-1.5"
                  >
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Contoh: Cari UAT SIMSKBDN..."
                      className="flex-1 px-3 py-2 text-xs text-slate-900 outline-none bg-transparent font-medium"
                    />
                    <button
                      type="submit"
                      className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center flex-shrink-0"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              TAB 2: MENU APLIKASI (FOLDER TIM -> APLIKASI -> SECTION PERUBAHAN)
             =================================================================== */}
          {activeMenu === "applications" && (
            <div className="space-y-6">
              {/* Top Header & Breadcrumb */}
              {!selectedApp && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-600 mb-1">
                      <button
                        onClick={() => {
                          setSelectedFolder(null);
                          setSelectedApp(null);
                        }}
                        className="hover:underline"
                      >
                        📁 Semua Folder Tim
                      </button>
                      {selectedFolder && (
                        <>
                          <ChevronRight size={14} />
                          <button
                            onClick={() => setSelectedApp(null)}
                            className="hover:underline"
                          >
                            {selectedFolder.folder_name}
                          </button>
                        </>
                      )}
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">
                      {selectedFolder
                        ? `Folder: ${selectedFolder.folder_name}`
                        : "Manajemen Folder Tim & Aplikasi SDLC"}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedFolder
                        ? `Di-assign ke: ${
                            selectedFolder.assigned_team?.team_name || ""
                          }${
                            selectedFolder.assigned_branch
                              ? ` • Branch: ${selectedFolder.assigned_branch.branch_name}`
                              : ""
                          }`
                        : "Admin dapat membuat Folder dan meng-assign ke Tim/Branch tertentu."}
                    </p>
                  </div>

                  {/* Contextual Action Buttons */}
                  <div className="flex items-center gap-3">
                    {!selectedFolder && isAdmin && (
                      <button
                        onClick={() => setShowCreateFolderModal(true)}
                        className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/25 flex items-center gap-2"
                      >
                        <Plus size={16} /> Buat Folder & Assign Tim
                      </button>
                    )}
                    {selectedFolder && !selectedApp && isAdmin && (
                      <button
                        onClick={() => setShowCreateAppModal(true)}
                        className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/25 flex items-center gap-2"
                      >
                        <Plus size={16} /> Tambah Aplikasi di Folder Ini
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* LEVEL 1: GRID FOLDER TIM */}
              {!selectedFolder && (
                <FolderGrid
                  folders={folders}
                  isAdmin={isAdmin}
                  onOpen={setSelectedFolder}
                  onCreate={() => setShowCreateFolderModal(true)}
                />
              )}

              {/* LEVEL 2: DAFTAR APLIKASI DI DALAM FOLDER */}
              {selectedFolder && !selectedApp && (
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedFolder(null)}
                    className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600"
                  >
                    <ArrowLeft size={15} /> Kembali ke Daftar Folder Tim
                  </button>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(selectedFolder.applications || []).map((app) => (
                      <div
                        key={app.id}
                        onClick={() => openApplicationDetail(app.id)}
                        className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1.5 hover:border-blue-500 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <span className="px-3 py-1 rounded-xl bg-blue-600 text-white text-xs font-black">
                            {app.app_code}
                          </span>
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                            {app.status}
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-600 mb-2">
                          {app.app_name}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed mb-5 line-clamp-2">
                          {app.description}
                        </p>
                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
                          <span
                            className="text-slate-500 font-medium min-w-0 truncate"
                            title={`Dibuat oleh ${app.created_by_name} (Badge ${app.created_by_badge})`}
                          >
                            Oleh {shortName(app.created_by_name)}
                          </span>
                          <span className="text-blue-600 font-bold flex items-center gap-1 whitespace-nowrap flex-shrink-0">
                            Lihat Versi <ChevronRight size={14} />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LEVEL 3: DETAIL APLIKASI & RIWAYAT VERSI (SECTION PERUBAHAN) */}
              {selectedApp && (
                <ApplicationDetail
                  app={selectedApp}
                  folder={selectedFolder}
                  activeSectionId={activeSectionId}
                  onSelectSection={setActiveSectionId}
                  onBackToFolders={() => {
                    setSelectedFolder(null);
                    setSelectedApp(null);
                  }}
                  onBackToFolder={() => setSelectedApp(null)}
                  onAddSection={() => setShowCreateSectionModal(true)}
                  onUpload={(category) => {
                    setDocCategory(category);
                    setShowUploadAppDocModal(true);
                  }}
                  onPreview={(doc) =>
                    setPreviewDoc({
                      id: doc.id,
                      title: doc.title,
                      stdName: doc.standardized_name,
                      uploader: `${doc.uploaded_by_name} (Badge ${doc.uploaded_by_badge})`,
                      time: new Date(doc.uploaded_at).toLocaleString("id-ID"),
                    })
                  }
                  downloadUrl={getDocumentDownloadUrl}
                />
              )}
            </div>
          )}

          {/* ===================================================================
              TAB 3: MENU EVIDENCE (LINTAS TIM UNTUK BAHAN AGENTIC AI)
             =================================================================== */}
          {activeMenu === "evidence" && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2">
                    <Sparkles size={13} /> Repositori Bahan Knowledge Base Agentic AI
                  </span>
                  <h2 className="text-2xl font-black text-slate-900">
                    Menu Evidence Audit Lintas Tim TI
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tempat seluruh tim (Digitalisasi, Layanan TI, Infrastruktur TI,
                    Tata Kelola TI) mengunggah dokumen bukti audit apa pun.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setDocCategory("SOP");
                    setShowUploadEvidenceModal(true);
                  }}
                  className="px-5 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/25 flex items-center gap-2"
                >
                  <Upload size={16} /> Upload Dokumen Evidence Baru
                </button>
              </div>

              <EvidenceTable
                docs={evidenceDocs}
                downloadUrl={getDocumentDownloadUrl}
                onUpload={() => {
                  setDocCategory("SOP");
                  setShowUploadEvidenceModal(true);
                }}
                onPreview={(doc) =>
                  setPreviewDoc({
                    id: doc.id,
                    title: doc.title,
                    stdName: doc.standardized_name,
                    uploader: `${doc.uploaded_by_name} (Badge ${doc.uploaded_by_badge})`,
                    time: new Date(doc.uploaded_at).toLocaleString("id-ID"),
                  })
                }
              />
            </div>
          )}

          {/* ===================================================================
              TAB 4: MENU AGENTIC AI (CHATGPT / GEMINI CONVERSATIONAL EXPERIENCE)
             =================================================================== */}
          {activeMenu === "agentic" && (
            <div
              className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-sm h-[calc(100vh-118px)] flex flex-col justify-between relative overflow-hidden"
              onDragOver={(e) => {
                if (!isImpersonating && e.dataTransfer.types.includes("Files")) e.preventDefault();
              }}
              onDrop={(e) => {
                if (!e.dataTransfer.files?.length) return;
                e.preventDefault();
                attachAgenticFile(e.dataTransfer.files[0]);
              }}
            >
              {/* Input file tersembunyi untuk tombol 📎 (upload dokumen via Agentic AI) */}
              <input
                ref={aiFileInputRef}
                type="file"
                accept={UPLOAD_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  attachAgenticFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              {/* Panel Riwayat Chat (laci dari kiri di dalam area Agentic AI) */}
              {showAiSessions && (
                <>
                  <div
                    className="absolute inset-0 z-20 bg-slate-900/10"
                    onClick={() => setShowAiSessions(false)}
                  />
                  <aside className="absolute inset-y-0 left-0 z-30 w-80 max-w-[85%] bg-white border-r border-slate-200 shadow-2xl flex flex-col">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                      <p className="font-black text-sm text-slate-900 flex items-center gap-2">
                        <History size={16} className="text-blue-600" /> Riwayat Chat
                      </p>
                      <button
                        onClick={() => setShowAiSessions(false)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                        aria-label="Tutup riwayat chat"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="px-3 pt-3">
                      <button
                        onClick={() => {
                          startNewAiChat();
                          setShowAiSessions(false);
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Plus size={14} /> Percakapan Baru
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                      {aiSessions.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-10 px-4 leading-relaxed">
                          Belum ada riwayat chat. Percakapan Anda dengan PANDA AI akan tersimpan
                          otomatis di sini.
                        </p>
                      ) : (
                        aiSessions.map((s) => (
                          <div
                            key={s.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => openAiSession(s.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") openAiSession(s.id);
                            }}
                            className={`group flex items-start gap-2 p-3 rounded-2xl border cursor-pointer transition-colors ${
                              s.id === aiSessionId
                                ? "bg-blue-50 border-blue-200"
                                : "border-transparent hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">{s.title}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {new Date(s.updated_at).toLocaleString("id-ID", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}{" "}
                                • {s.message_count} pertanyaan
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteAiSession(s);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition"
                              aria-label={`Hapus riwayat chat ${s.title}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </aside>
                </>
              )}

              {/* Top Header Bar inside Cortex AI Hub */}
              <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 bg-white/90 backdrop-blur-md z-10 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 living-orb-core flex-shrink-0">
                    <div className="living-orb-plasma" />
                    <div className="living-orb-gloss" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-slate-900">
                        PANDA Cortex AI
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                        {aiQuota?.engine ?? "PANDA Agent"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Asisten Pencarian, Perangkum, & Unduh Instan Dokumen Audit TI
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5">
                    {isAdmin ? (
                      <>
                        <Globe size={13} className="text-blue-600" /> Scope: Semua
                        Tim & Aplikasi
                      </>
                    ) : (
                      <>
                        <Lock size={13} className="text-blue-600" /> Scope
                        Terisolasi: {summary.user_scope_label}
                      </>
                    )}
                  </span>
                  {!isImpersonating && (
                    <button
                      onClick={() => {
                        setShowAiSessions(true);
                        loadAiSessions();
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <History size={14} /> Riwayat Chat
                    </button>
                  )}
                  {(aiHistory.length > 0 || aiPendingQuestion) && (
                    <button
                      onClick={startNewAiChat}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Plus size={14} /> Percakapan Baru
                    </button>
                  )}
                </div>
              </div>

              {/* Peringatan kuota AI hampir habis / habis */}
              {aiQuota && (aiQuota.status === "LOW" || aiQuota.status === "EXHAUSTED") && (
                <div
                  role="status"
                  className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-6 py-2.5 border-b text-xs flex-shrink-0 ${
                    aiQuota.status === "EXHAUSTED"
                      ? "bg-rose-50 border-rose-200 text-rose-800"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}
                >
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <p className="flex-1 min-w-[200px] font-semibold">{aiQuota.message}</p>
                  {isSuperAdmin && !isImpersonating && (
                    <button
                      onClick={() => {
                        setDocsTab("quota");
                        setActiveMenu("docs");
                      }}
                      className="px-3 py-1 rounded-lg bg-white/70 hover:bg-white border border-black/10 font-bold whitespace-nowrap"
                    >
                      Lihat detail kuota
                    </button>
                  )}
                </div>
              )}

              {/* STATE A: EMPTY STATE (SEBELUM ADA CHAT — TAMPILKAN LIVING ORB DI TENGAH) */}
              {aiHistory.length === 0 && !aiPendingQuestion ? (
                <div className="flex-1 overflow-y-auto flex flex-col items-center px-4 sm:px-6 py-6">
                  <div className="max-w-4xl w-full text-center my-auto">
                    {/* ANIMATED LIVING ORB (BOLA BULETAN BERGERAK-GERAK) */}
                    <div className="living-orb-container mt-2 mb-1">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 living-orb-core hover:scale-105 transition-transform duration-500">
                        <div className="living-orb-plasma" />
                        <div className="living-orb-gloss" />
                      </div>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 mt-3">
                      Halo, {user.full_name}
                    </h2>
                    <h3 className="text-xl sm:text-3xl font-black text-slate-900 mt-1 mb-5 tracking-tight">
                      Dokumen audit apa yang ingin Anda cari hari ini?
                    </h3>

                    {/* Centered Initial Input Box (Like ChatGPT / Gemini Home) */}
                    <div className="bg-white rounded-3xl border-2 border-blue-100 shadow-xl shadow-blue-900/5 p-3.5 sm:p-4 text-left focus-within:border-blue-500 transition-all">
                      <textarea
                        ref={(el) => {
                          aiInputRef.current = el;
                        }}
                        rows={2}
                        value={aiPrompt}
                        onChange={(e) => {
                          setAiPrompt(e.target.value);
                          historyIndexRef.current = -1;
                        }}
                        onKeyDown={(e) => handlePromptKeyDown(e, true)}
                        placeholder={
                          aiAttachedFile
                            ? "Opsional: jelaskan dokumen ini (mis. UAT perubahan SSO aplikasi SIMSKBDN)"
                            : "Ketik pertanyaan audit (tekan ↑ untuk riwayat sebelumnya), atau lampirkan dokumen dengan 📎 untuk diunggah..."
                        }
                        className="w-full resize-none outline-none text-sm text-slate-800 placeholder:text-slate-400 font-medium p-1"
                      />
                      {aiAttachedFile && renderAttachedFileChip()}
                      {renderReplyChip()}

                      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
                        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                          {renderAttachButton()}
                          {renderThinkingToggle()}
                          {(
                            [
                              { id: "ALL", label: "⚛️ Deeper Audit Search (Semua)" },
                              { id: "APPLICATION", label: "📁 Hanya Dokumen Aplikasi" },
                              { id: "EVIDENCE", label: "📂 Hanya Menu Evidence" },
                            ] as const
                          ).map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => setAiFilterModule(f.id)}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap ${
                                aiFilterModule === f.id
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          disabled={aiLoading}
                          onClick={() => handleSendAgentic()}
                          className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-700 to-sky-400 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 hover:scale-105 transition-transform disabled:opacity-50 flex-shrink-0"
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Shortcut Pertanyaan Cepat Dinamis Berdasarkan Dokumen User */}
                    <div className="flex items-center justify-center gap-2 flex-wrap mt-4 max-w-3xl mx-auto">
                      <button
                        type="button"
                        onClick={loadAiShortcuts}
                        disabled={loadingShortcuts}
                        title="Acak shortcut pertanyaan baru dari dokumen yang dapat Anda akses"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 text-xs font-bold transition-all shadow-sm flex-shrink-0"
                      >
                        <RotateCw size={12} className={loadingShortcuts ? "animate-spin" : ""} />
                        <span>Acak Shortcut</span>
                      </button>
                      {aiShortcuts.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => handleAskAgenticAI(chip)}
                          className="px-3.5 py-1.5 rounded-full bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200/90 text-xs font-bold transition-all shadow-sm hover:border-blue-300"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>

                    {/* 3 Starter Prompt Cards */}
                    <div className="grid sm:grid-cols-3 gap-3.5 mt-5 text-left">
                      {[
                        {
                          title: "Cari & Ringkas UAT Aplikasi",
                          desc: "Tampilkan dokumen UAT aplikasi beserta ringkasan skenario uji & tombol unduhnya.",
                          prompt:
                            "Carikan dokumen UAT aplikasi beserta ringkasan hasil pengujiannya",
                        },
                        {
                          title: "Cek Histori Versi Awal (v1.0)",
                          desc: "Telusuri dokumen PRD dan BAST pada saat pembuatan awal aplikasi (v1.0).",
                          prompt:
                            "Tampilkan dokumen PRD dan BAST pembuatan awal versi v1.0",
                        },
                        {
                          title: "Telusuri Evidence Audit TI",
                          desc: "Cari laporan SLA Layanan TI, hasil uji DRC Infrastruktur, atau SOP Tata Kelola.",
                          prompt:
                            "Tampilkan dokumen evidence laporan SLA, DRC, atau SOP audit terbaru",
                        },
                      ].map((card) => (
                        <button
                          key={card.title}
                          onClick={() => handleAskAgenticAI(card.prompt)}
                          className="p-4 rounded-3xl bg-slate-50/80 hover:bg-blue-50/60 border border-slate-200/70 hover:border-blue-300 transition-all text-left group"
                        >
                          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 mb-2.5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Sparkles size={15} />
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm mb-1">
                            {card.title}
                          </h4>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {card.desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* STATE B: ACTIVE CHATBOT VIEW (SEPERTI CHATGPT / GEMINI — THREAD DI ATAS, INPUT BAR DI BAWAH) */
                <>
                  {/* Scrollable Chat Message Thread */}
                  <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-8 bg-slate-50/40">
                    <div className="max-w-4xl mx-auto space-y-8">
                      {aiHistory.map((item, idx) => (
                        <div key={idx} className="space-y-6">
                          {/* 1. User Message Bubble (Right Side) */}
                          <div className="flex items-start justify-end gap-3 group">
                            <div className="max-w-xl flex flex-col items-end gap-1">
                              <div className="bg-blue-600 text-white rounded-3xl rounded-tr-md px-5 py-3.5 shadow-md shadow-blue-600/15">
                                {item.kind !== "upload" && renderReplyQuote(item.replyTo)}
                                <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                                  {item.question}
                                </p>
                                {item.kind === "upload" && (
                                  <p className="mt-1.5 text-[11px] text-blue-100 flex items-center gap-1.5">
                                    <Paperclip size={12} /> {item.file.name}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center justify-end gap-1 pt-0.5 px-0.5">
                                <MessageActions
                                  text={item.question}
                                  align="right"
                                  onReply={() =>
                                    replyToMessage(
                                      "question",
                                      item.question,
                                      item.kind !== "upload" ? item.response?.message_id : undefined
                                    )
                                  }
                                  onForward={() =>
                                    forwardMessage(
                                      "question",
                                      item.question,
                                      item.kind !== "upload" ? item.response?.message_id : undefined
                                    )
                                  }
                                  onUse={() => {
                                    setAiPrompt(item.question);
                                    historyIndexRef.current = -1;
                                    setTimeout(() => {
                                      aiInputRef.current?.focus();
                                      const len = item.question.length;
                                      aiInputRef.current?.setSelectionRange?.(len, len);
                                    }, 50);
                                  }}
                                />
                              </div>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-700 to-sky-500 text-white font-black text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                              {user.full_name.slice(0, 2).toUpperCase()}
                            </div>
                          </div>

                          {/* 2. PANDA AI Response Bubble (Left Side with Mini Living Orb Avatar) */}
                          {item.kind === "upload" ? (
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 living-orb-core flex-shrink-0 mt-1">
                                <div className="living-orb-plasma" />
                                <div className="living-orb-gloss" />
                              </div>
                              <div className="flex-1 min-w-0 space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-black text-sm text-slate-900">PANDA AI</span>
                                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                                    Asisten Upload Dokumen
                                  </span>
                                </div>
                                <AIUploadCard
                                  entryId={item.uploadId}
                                  file={item.file}
                                  message={item.message}
                                  teams={teams}
                                  onPreview={setPreviewDoc}
                                  onSaved={(res) => {
                                    notify(`Dokumen "${res.document.title}" tersimpan via Agentic AI.`);
                                    loadAllWorkspaceData();
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 living-orb-core flex-shrink-0 mt-1">
                              <div className="living-orb-plasma" />
                              <div className="living-orb-gloss" />
                            </div>

                            <div className="flex-1 min-w-0 space-y-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-black text-sm text-slate-900">
                                  PANDA AI
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                                    item.stopped
                                      ? "text-amber-700 bg-amber-50 border-amber-200"
                                      : item.response.trace?.thinking
                                        ? "text-violet-700 bg-violet-50 border-violet-200"
                                        : "text-blue-700 bg-blue-50 border-blue-200"
                                  }`}
                                >
                                  {item.response.trace?.thinking && <Brain size={11} />}
                                  {item.response.engine_mode}
                                </span>
                                <AnswerBasisChip basis={item.response.answer_basis} />
                                <span className="text-[11px] text-slate-400">
                                  {new Date(
                                    item.response.queried_at
                                  ).toLocaleTimeString("id-ID")}
                                </span>
                              </div>

                              {/* Langkah AI: menimbang, mencari, membaca, menilai ulang (bisa dibuka/dilipat) */}
                              {item.response.trace && item.response.trace.steps.length > 0 && (
                                <AgentTracePanel
                                  steps={item.response.trace.steps}
                                  thinking={item.response.trace.thinking}
                                  usage={item.response.trace.usage}
                                  durationMs={item.response.trace.duration_ms}
                                  searches={item.response.trace.searches}
                                  findings={item.response.trace.findings}
                                  docsRead={item.response.trace.docs_read}
                                />
                              )}

                              {/* Formatted Markdown Bubble (jawaban baru dilanjutkan dengan animasi mengetik) */}
                              <div className="bg-white rounded-3xl rounded-tl-md p-6 border border-slate-200/80 shadow-sm">
                                {item.typing ? (
                                  <TypewriterMarkdown
                                    text={item.response.reply_markdown}
                                    from={item.typingFrom ?? 0}
                                    complete
                                    render={renderFormattedMarkdown}
                                    onProgress={followTyping}
                                    onDone={() => finishTyping(idx)}
                                  />
                                ) : (
                                  renderFormattedMarkdown(item.response.reply_markdown)
                                )}
                              </div>

                              {/* Aksi jawaban (Salin / Balas / Teruskan) & pemakaian token — muncul setelah selesai diketik */}
                              {!item.typing && (
                              <div className="flex flex-wrap items-center justify-between gap-2 -mt-2 px-1 ai-fade-up">
                                <MessageActions
                                  text={item.response.reply_markdown}
                                  onReply={
                                    item.stopped
                                      ? undefined
                                      : () => replyToMessage("answer", item.response.reply_markdown, item.response.message_id)
                                  }
                                  onForward={() => forwardMessage("answer", item.response.reply_markdown, item.response.message_id)}
                                />
                                <UsageBadge trace={item.response.trace} />
                              </div>
                              )}

                              {/* Direct Click / Download Document Citation Cards */}
                              {!item.typing && item.response.matched_documents.length > 0 && (
                                <div className="space-y-2.5 ai-fade-up">
                                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                    <FileCheck
                                      size={14}
                                      className="text-blue-600"
                                    />
                                    Dokumen Terkait ({
                                      item.response.matched_documents.length
                                    }{" "}
                                    File) — Klik Lihat atau Download Langsung:
                                  </p>
                                  <div className="grid sm:grid-cols-2 gap-3.5">
                                    {item.response.matched_documents.map(
                                      (doc: AIDocumentCitation, di: number) => (
                                        <div
                                          key={doc.id}
                                          className="bg-white rounded-2xl p-4 border border-blue-200/90 shadow-sm flex flex-col justify-between gap-3 hover:border-blue-500 hover:shadow-md transition-all ai-fade-up"
                                          style={{ animationDelay: `${di * 80}ms` }}
                                        >
                                          <div>
                                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                              <span className="px-2.5 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-black">
                                                {doc.doc_category} •{" "}
                                                {doc.version_label}
                                              </span>
                                              <span className="text-[10px] font-bold text-slate-500 truncate max-w-[160px]">
                                                {doc.uploaded_by_team_label}
                                              </span>
                                            </div>
                                            <h5 className="font-bold text-slate-900 text-sm leading-snug">
                                              {doc.title}
                                            </h5>
                                            <p className="text-[11px] font-mono text-blue-600 mt-0.5 truncate">
                                              {doc.standardized_name}
                                            </p>
                                            {doc.matched_excerpt && (
                                              <p className="mt-2 pl-2.5 border-l-2 border-blue-300 text-[11px] text-slate-600 italic leading-relaxed line-clamp-4">
                                                &ldquo;{doc.matched_excerpt}&rdquo;
                                              </p>
                                            )}
                                            <p className="text-[10px] text-slate-400 mt-2">
                                              Oleh:{" "}
                                              <strong>
                                                {doc.uploaded_by_name}
                                              </strong>{" "}
                                              (Badge {doc.uploaded_by_badge}) •{" "}
                                              {new Date(
                                                doc.uploaded_at
                                              ).toLocaleString("id-ID")}
                                            </p>
                                          </div>

                                          <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100">
                                            <button
                                              onClick={() =>
                                                setPreviewDoc({
                                                  id: doc.id,
                                                  title: doc.title,
                                                  stdName: doc.standardized_name,
                                                  uploader: `${doc.uploaded_by_name} (Badge ${doc.uploaded_by_badge})`,
                                                  time: new Date(
                                                    doc.uploaded_at
                                                  ).toLocaleString("id-ID"),
                                                })
                                              }
                                              className="flex-1 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                                            >
                                              <Eye size={14} /> Klik Lihat
                                            </button>
                                            <a
                                              href={getDocumentDownloadUrl(
                                                doc.id
                                              )}
                                              className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                                            >
                                              <Download size={14} /> Download
                                            </a>
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          )}
                        </div>
                      ))}

                      {/* Pending / Thinking Bubble when AI is processing */}
                      {aiPendingQuestion && (
                        <div className="space-y-6">
                          <div className="flex items-start justify-end gap-3">
                            <div className="max-w-xl bg-blue-600 text-white rounded-3xl rounded-tr-md px-5 py-3.5 shadow-md">
                              {renderReplyQuote(aiPendingReplyTo)}
                              <p className="text-sm font-medium whitespace-pre-wrap">
                                {aiPendingQuestion}
                              </p>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-700 to-sky-500 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                              {user.full_name.slice(0, 2).toUpperCase()}
                            </div>
                          </div>

                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 living-orb-core flex-shrink-0 mt-1">
                              <div className="living-orb-plasma living-orb-plasma-fast" />
                              <div className="living-orb-gloss" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-black text-sm text-slate-900">PANDA AI</span>
                                {aiLive?.thinking && (
                                  <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-2.5 py-0.5 rounded-full border border-violet-200 inline-flex items-center gap-1">
                                    <Brain size={11} /> Thinking
                                  </span>
                                )}
                              </div>

                              {/* Langkah AI secara langsung: apa yang sedang dilakukan & dicari */}
                              {aiLive && (
                                <AgentTracePanel
                                  live
                                  steps={aiLive.steps}
                                  thinking={aiLive.thinking}
                                  usage={aiLive.usage}
                                  startedAt={aiLive.startedAt}
                                />
                              )}

                              {aiLive?.answer ? (
                                <div className="bg-white rounded-3xl rounded-tl-md p-6 border border-slate-200/80 shadow-sm ai-fade-up">
                                  <TypewriterMarkdown
                                    text={aiLive.answer}
                                    complete={false}
                                    render={renderFormattedMarkdown}
                                    onProgress={(shown) => {
                                      aiLiveShownRef.current = shown;
                                      followTyping(shown);
                                    }}
                                  />
                                </div>
                              ) : (
                                renderTypingBubble()
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div ref={chatEndRef} />
                    </div>
                  </div>

                  {/* Bottom-Docked Chat Input Bar (Like ChatGPT / Gemini) */}
                  <div className="p-4 sm:px-8 sm:py-4 bg-white border-t border-slate-200/80 flex-shrink-0">
                    <div className="max-w-4xl mx-auto space-y-2.5">
                      {/* Follow-up Suggestion Chips (Dinamis dari Dokumen yang Boleh Diakses) */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        <button
                          type="button"
                          onClick={loadAiShortcuts}
                          disabled={loadingShortcuts}
                          title="Acak shortcut pertanyaan baru dari dokumen yang dapat Anda akses"
                          className="p-1 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-700 transition-colors flex-shrink-0"
                        >
                          <RotateCw size={12} className={loadingShortcuts ? "animate-spin" : ""} />
                        </button>
                        {aiShortcuts.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => handleAskAgenticAI(chip)}
                            className="px-3 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[11px] font-bold whitespace-nowrap transition-colors flex-shrink-0"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>

                      {aiAttachedFile && renderAttachedFileChip()}
                      {renderReplyChip()}

                      {/* Input Box Docked at Bottom */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSendAgentic();
                        }}
                        className="flex items-center gap-2 bg-slate-50 border-2 border-slate-200/90 focus-within:bg-white focus-within:border-blue-500 rounded-3xl px-4 py-2 shadow-sm transition-all"
                      >
                        <CustomSelect
                          value={aiFilterModule}
                          onChange={(e) =>
                            setAiFilterModule(
                              e.target.value as
                                | "ALL"
                                | "APPLICATION"
                                | "EVIDENCE"
                            )
                          }
                          className="bg-blue-50 text-blue-700 border border-blue-200 rounded-xl px-2.5 py-1.5 text-xs font-bold flex-shrink-0"
                        >
                          <option value="ALL">⚛️ Semua Modul</option>
                          <option value="APPLICATION">📁 Aplikasi</option>
                          <option value="EVIDENCE">📂 Evidence</option>
                        </CustomSelect>

                        {renderAttachButton()}
                        {renderThinkingToggle()}

                        <input
                          ref={(el) => {
                            aiInputRef.current = el;
                          }}
                          type="text"
                          value={aiPrompt}
                          onChange={(e) => {
                            setAiPrompt(e.target.value);
                            historyIndexRef.current = -1;
                          }}
                          onKeyDown={(e) => handlePromptKeyDown(e, false)}
                          placeholder={
                            aiAttachedFile
                              ? "Opsional: jelaskan dokumen ini, lalu kirim"
                              : aiReplyTo
                                ? "Tulis balasan atau pertanyaan tentang pesan ini..."
                                : aiThinking
                                  ? "Thinking aktif — tanyakan hal yang butuh penelusuran mendalam (↑ riwayat)..."
                                  : "Tanyakan dokumen audit (tekan ↑ untuk riwayat sebelumnya), atau lampirkan file..."
                          }
                          className="flex-1 min-w-0 bg-transparent outline-none text-sm text-slate-900 font-medium px-2 py-1.5"
                        />

                        {aiLoading && aiLive ? (
                          <button
                            type="button"
                            onClick={stopAgenticAI}
                            title="Hentikan jawaban"
                            className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-md hover:bg-rose-600 transition-colors flex-shrink-0"
                          >
                            <Square size={14} fill="currentColor" />
                          </button>
                        ) : (
                          <button
                            type="submit"
                            disabled={aiLoading || (!aiPrompt.trim() && !aiAttachedFile)}
                            className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-700 to-sky-400 text-white flex items-center justify-center shadow-md hover:scale-105 transition-transform disabled:opacity-40 flex-shrink-0"
                          >
                            <Send size={16} />
                          </button>
                        )}
                      </form>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ===================================================================
              TAB 5: MENU MASTER AKSES & MASTER DATA TIM/BRANCH (KHUSUS ADMIN)
             =================================================================== */}
          {activeMenu === "master_access" && isAdmin && (
            <div className="space-y-6">
              {/* Header halaman */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2">
                    <ShieldCheck size={13} /> Administrasi Akses
                  </span>
                  <h2 className="text-2xl font-black text-slate-900">Master Akses & Tim</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kelola badge pegawai, role, serta segmen Tim & Branch yang menentukan isolasi data
                    dan cakupan Agentic AI.
                  </p>
                </div>
                <button
                  onClick={openAddUserForm}
                  className="px-5 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/25 flex items-center gap-2"
                >
                  <UserPlus size={16} /> Tambah Pengguna
                </button>
              </div>

              {/* Ringkasan */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatPill icon={<Users size={17} />} value={masterUsers.length} label="Total pengguna" />
                <StatPill
                  icon={<ShieldCheck size={17} />}
                  value={masterUsers.filter((u) => isAdminRole(u.role)).length}
                  label="Admin & Super Admin"
                />
                <StatPill
                  icon={<UserCog size={17} />}
                  value={masterUsers.filter((u) => u.role === "PEGAWAI_TI").length}
                  label="Pegawai TI"
                />
                <StatPill
                  icon={<GitBranch size={17} />}
                  value={`${teams.length} / ${teams.reduce((n, t) => n + (t.branches?.length || 0), 0)}`}
                  label="Tim / Branch"
                />
              </div>

              <div className="grid xl:grid-cols-12 gap-6 items-start">
                {/* Daftar pengguna */}
                <div className="xl:col-span-8 min-w-0">
                  <MasterUserTable
                    users={masterUsers}
                    isSuperAdmin={isSuperAdmin}
                    editingUserId={editingUserId}
                    protectedBadge={initialSuperAdminBadge}
                    currentUserId={realUser?.id}
                    onAdd={openAddUserForm}
                    onEdit={startEditUser}
                    onDelete={handleDeleteUser}
                    onImpersonate={(u) =>
                      switchSegment({
                        team_id: u.team_id as string,
                        branch_id: u.branch_id || null,
                      })
                    }
                  />
                </div>

                {/* Master Data Tim & Branch (Tambah, Rename, Hapus) */}
                <div className="xl:col-span-4 bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden xl:sticky xl:top-6">
                  <div className="p-4 sm:p-5 border-b border-slate-100">
                    <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                      <GitBranch size={16} className="text-blue-600" /> Master Data Tim & Branch
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Tim/Branch yang masih dipakai pengguna, folder, atau dokumen tidak dapat dihapus.
                    </p>
                  </div>

                  <div className="p-4 sm:p-5 space-y-4">
                    <div className="grid sm:grid-cols-2 xl:grid-cols-1 gap-3">
                      <form onSubmit={handleCreateTeam} className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-600">Tambah Tim</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
                            placeholder="Nama tim baru"
                            className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                          />
                          <button
                            type="submit"
                            disabled={!newTeamName.trim()}
                            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-blue-600 disabled:bg-slate-300 text-white text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1"
                          >
                            <Plus size={13} /> Tim
                          </button>
                        </div>
                      </form>

                      <form onSubmit={handleCreateBranch} className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-600">Tambah Branch</label>
                        <CustomSelect
                          value={branchTargetTeamId}
                          onChange={(e) => setBranchTargetTeamId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900"
                          title="Tim tujuan branch baru"
                        >
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.team_name}
                            </option>
                          ))}
                        </CustomSelect>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newBranchName}
                            onChange={(e) => setNewBranchName(e.target.value)}
                            placeholder="Nama branch baru"
                            className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                          />
                          <button
                            type="submit"
                            disabled={!newBranchName.trim()}
                            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-blue-600 disabled:bg-slate-300 text-white text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1"
                          >
                            <Plus size={13} /> Branch
                          </button>
                        </div>
                      </form>
                    </div>

                    <div className="grid sm:grid-cols-2 xl:grid-cols-1 gap-2 text-xs">
                      {teams.map((t) => {
                        const memberCount = masterUsers.filter((u) => u.team_id === t.id).length;
                        return (
                          <div
                            key={t.id}
                            className="group p-3 rounded-2xl bg-slate-50 border border-slate-200/60"
                          >
                            <div className="flex items-center justify-between gap-2">
                              {editingMaster?.kind === "team" && editingMaster.id === t.id ? (
                                renderMasterRename()
                              ) : (
                                <>
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-900 truncate">{t.team_name}</p>
                                    <p className="text-[10px] text-slate-400">
                                      {memberCount} pengguna · {t.branches?.length || 0} branch
                                    </p>
                                  </div>
                                  <div className="flex items-center flex-shrink-0">
                                    <button
                                      onClick={() =>
                                        setEditingMaster({ kind: "team", id: t.id, name: t.team_name })
                                      }
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white"
                                      title="Rename Tim"
                                    >
                                      <Pencil size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMaster("team", t.id, t.team_name)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white"
                                      title="Hapus Tim"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                            {t.branches && t.branches.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {t.branches.map((b) =>
                                  editingMaster?.kind === "branch" && editingMaster.id === b.id ? (
                                    <div key={b.id} className="w-full">
                                      {renderMasterRename()}
                                    </div>
                                  ) : (
                                    <span
                                      key={b.id}
                                      className="inline-flex items-center gap-0.5 pl-2.5 pr-1 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold"
                                    >
                                      {b.branch_name}
                                      <button
                                        onClick={() =>
                                          setEditingMaster({ kind: "branch", id: b.id, name: b.branch_name })
                                        }
                                        className="p-1 rounded-full hover:bg-blue-200"
                                        title="Rename Branch"
                                      >
                                        <Pencil size={10} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteMaster("branch", b.id, b.branch_name)}
                                        className="p-1 rounded-full hover:bg-rose-100 hover:text-rose-600"
                                        title="Hapus Branch"
                                      >
                                        <X size={10} />
                                      </button>
                                    </span>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              TAB 7: MENU DOCS & SETTING AI (KHUSUS SUPER ADMIN)
             =================================================================== */}
          {activeMenu === "docs" && isSuperAdmin && !isImpersonating && (
            <SuperAdminDocs notify={notify} tab={docsTab} onTabChange={setDocsTab} />
          )}

          {/* ===================================================================
              TAB 6: MENU LOG AKTIVITAS & UPLOAD DETAIL (SIAPA & KAPAN)
             =================================================================== */}
          {activeMenu === "logs" && <AuditLogTimeline logs={logs} />}
        </main>
      </div>

      {/* =======================================================================
          MODALS: PREVIEW PDF, CREATE FOLDER, CREATE APP, CREATE SECTION, UPLOAD
         ======================================================================= */}

      {/* 1. In-App Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full h-[88vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 sm:px-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm sm:text-base">
                  {previewDoc.title}
                </h4>
                <p className="text-[11px] text-cyan-300">
                  {previewDoc.stdName} • Diunggah oleh: {previewDoc.uploader} pada{" "}
                  {previewDoc.time} WIB
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={getDocumentDownloadUrl(previewDoc.id)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Download size={14} /> Download File
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100">
              <iframe
                src={getDocumentPreviewUrl(previewDoc.id)}
                className="w-full h-full border-0"
                title={previewDoc.title}
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal Buat Folder & Assign ke Tim/Branch (Admin) */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">
                📁 Buat Folder Aplikasi & Assign Tim
              </h3>
              <button onClick={() => setShowCreateFolderModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Folder
                </label>
                <input
                  type="text"
                  required
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="Contoh: Aplikasi Layanan Internal"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi Folder
                </label>
                <textarea
                  rows={2}
                  value={folderDesc}
                  onChange={(e) => setFolderDesc(e.target.value)}
                  placeholder="Deskripsi peruntukan folder aplikasi..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assign Folder ke Tim
                </label>
                <CustomSelect
                  value={folderTeamId}
                  onChange={(e) => {
                    const tId = e.target.value;
                    setFolderTeamId(tId);
                    const brs = getBranchesForTeam(tId);
                    setFolderBranchId(brs.length > 0 ? brs[0].id : "");
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.team_name}
                    </option>
                  ))}
                </CustomSelect>
              </div>
              {getBranchesForTeam(folderTeamId).length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assign ke Branch Spesifik
                  </label>
                  <CustomSelect
                    value={folderBranchId}
                    onChange={(e) => setFolderBranchId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900"
                  >
                    <option value="">Semua Branch dalam Tim Ini</option>
                    {getBranchesForTeam(folderTeamId).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.branch_name}
                      </option>
                    ))}
                  </CustomSelect>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateFolderModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
                >
                  Simpan Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Buat Aplikasi di dalam Folder */}
      {showCreateAppModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">
                🚀 Tambah Aplikasi di Folder {selectedFolder?.folder_name}
              </h3>
              <button onClick={() => setShowCreateAppModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateApplication} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kode Singkat Aplikasi
                  </label>
                  <input
                    type="text"
                    required
                    value={appCode}
                    onChange={(e) => setAppCode(e.target.value)}
                    placeholder="Contoh: EPROC"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Section Versi Awal
                  </label>
                  <input
                    type="text"
                    value={appInitVer}
                    onChange={(e) => setAppInitVer(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Aplikasi
                </label>
                <input
                  type="text"
                  required
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Contoh: Sistem E-Procurement Terpadu Pusri"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi Aplikasi
                </label>
                <textarea
                  rows={2}
                  value={appDesc}
                  onChange={(e) => setAppDesc(e.target.value)}
                  placeholder="Fungsi dan ruang lingkup aplikasi..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateAppModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
                >
                  Buat Aplikasi & Tab v1.0
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal Tambah Section Perubahan (Tab View Versioning) */}
      {/* Modal Tambah / Edit Master Akses Pegawai */}
      {showUserForm && isAdmin && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={(e) => e.target === e.currentTarget && resetUserForm()}
        >
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between gap-3 p-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                  {editingUserId ? <Pencil size={18} /> : <UserPlus size={18} />}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {editingUserId ? "Edit Akses & Segmen Pegawai" : "Tambah Pengguna"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingUserId
                      ? `Ubah role, tim, dan branch untuk badge ${newBadge}`
                      : "Daftarkan badge pegawai beserta role, tim, dan branch"}
                  </p>
                </div>
              </div>
              <button
                onClick={resetUserForm}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMasterUser} className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Badge</label>
                  <input
                    type="text"
                    required
                    autoFocus={!editingUserId}
                    disabled={!!editingUserId}
                    value={newBadge}
                    onChange={(e) => setNewBadge(e.target.value)}
                    placeholder="Contoh: 2419010"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="Contoh: Andi Wijaya"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>
              {editingUserId && (
                <p className="-mt-2 text-[11px] text-slate-400">
                  Nomor badge adalah identitas login dan tidak dapat diubah.
                </p>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Korporat</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="andi.wijaya@pusri.co.id"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role Akses</label>
                <CustomSelect
                  value={newRole}
                  disabled={editingUserId !== null && newBadge === initialSuperAdminBadge}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold bg-slate-50 text-slate-900 disabled:text-slate-500"
                >
                  {(isSuperAdmin || newRole === "SUPER_ADMIN") && (
                    <option value="SUPER_ADMIN">Super Admin (Impersonate, Docs & Setting AI)</option>
                  )}
                  <option value="ADMIN">Admin (Akses Semua Tim & Kelola Folder)</option>
                  <option value="PEGAWAI_TI">Pegawai TI (Terisolasi Sesuai Tim & Branch)</option>
                </CustomSelect>
                {editingUserId !== null && newBadge === initialSuperAdminBadge && (
                  <p className="text-[11px] text-slate-400 mt-1">Badge awal harus tetap Super Admin.</p>
                )}
              </div>

              {/* Tim & Branch hanya untuk Pegawai TI */}
              {newRole === "PEGAWAI_TI" ? (
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 grid sm:grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label className="block text-xs font-bold text-blue-900 mb-1">Tim</label>
                    <CustomSelect
                      value={newUserTeamId}
                      onChange={(e) => {
                        setNewUserTeamId(e.target.value);
                        setNewUserBranchId("");
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-blue-200 text-sm font-bold bg-white text-slate-900"
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.team_name}
                        </option>
                      ))}
                    </CustomSelect>
                  </div>
                  <div className="min-w-0">
                    <label className="block text-xs font-bold text-blue-900 mb-1">Branch / Sub-Tim</label>
                    {getBranchesForTeam(newUserTeamId).length > 0 ? (
                      <CustomSelect
                        value={newUserBranchId}
                        onChange={(e) => setNewUserBranchId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-blue-200 text-sm font-bold bg-white text-slate-900"
                      >
                        <option value="">Seluruh tim</option>
                        {getBranchesForTeam(newUserTeamId).map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.branch_name}
                          </option>
                        ))}
                      </CustomSelect>
                    ) : (
                      <p className="px-3.5 py-2.5 rounded-xl border border-dashed border-blue-200 text-xs text-blue-800/70 bg-white/60">
                        Tim ini tidak punya branch
                      </p>
                    )}
                  </div>
                  <p className="sm:col-span-2 text-[11px] text-blue-900/70">
                    Pegawai hanya melihat folder, evidence, dan hasil Agentic AI dari segmen ini serta
                    dokumen berstatus All Tim.
                  </p>
                </div>
              ) : (
                <p className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800">
                  Role ini memiliki akses ke semua tim dan seluruh aplikasi.
                </p>
              )}

              {!editingUserId && (
                <p className="text-[11px] text-slate-500">
                  Password awal pengguna baru: <span className="font-black text-slate-700">Panda</span>
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetUserForm}
                  className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/25"
                >
                  {editingUserId ? "Simpan Perubahan" : "Simpan Pengguna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showCreateSectionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">
                🔄 Tambah Section Perubahan ({selectedApp?.app_name})
              </h3>
              <button onClick={() => setShowCreateSectionModal(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Menambahkan tab versi baru untuk perubahan/pengembangan aplikasi
              tanpa menghapus dokumen pembuatan awal (v1.0).
            </p>
            <form onSubmit={handleCreateSection} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Label Versi Perubahan
                </label>
                <input
                  type="text"
                  required
                  value={secVersion}
                  onChange={(e) => setSecVersion(e.target.value)}
                  placeholder="Contoh: v1.1 atau v2.0"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Section Perubahan / Change Request
                </label>
                <input
                  type="text"
                  required
                  value={secTitle}
                  onChange={(e) => setSecTitle(e.target.value)}
                  placeholder="Contoh: Integrasi Pembayaran Host-to-Host Bank"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Perubahan
                </label>
                <textarea
                  rows={2}
                  value={secDesc}
                  onChange={(e) => setSecDesc(e.target.value)}
                  placeholder="Rincian perubahan fitur pada versi ini..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateSectionModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
                >
                  Tambah Tab Section Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal Upload Dokumen ke Section Aplikasi (PRD, UAT, BAST, dll.) */}
      {showUploadAppDocModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">
                📤 Upload Dokumen Aplikasi ({activeSectionObj?.version_label})
              </h3>
              <button onClick={() => setShowUploadAppDocModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => handleUploadDocument(e, "APPLICATION")}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jenis Dokumen SDLC
                  </label>
                  <CustomSelect
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900"
                  >
                    <option value="PRD">PRD (Product Requirements)</option>
                    <option value="UAT">UAT (User Acceptance Test)</option>
                    <option value="BAST">BAST (Berita Acara Serah Terima)</option>
                    <option value="FSD">FSD / Arsitektur Teknis</option>
                    <option value="LAINNYA">Dokumen Pendukung Lainnya</option>
                  </CustomSelect>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tag Reusability Audit
                  </label>
                  <input
                    type="text"
                    value={docAuditTags}
                    onChange={(e) => setDocAuditTags(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Dokumen
                </label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder={`Contoh: Dokumen ${docCategory} ${selectedApp?.app_name} ${activeSectionObj?.version_label}`}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ringkasan Dokumen (Opsional — AI juga membaca isi file)
                </label>
                <textarea
                  rows={3}
                  value={docSummary}
                  onChange={(e) => setDocSummary(e.target.value)}
                  placeholder="Ringkasan hasil pengujian UAT / ruang lingkup PRD / pihak penandatangan BAST..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih File Dokumen (Wajib — isi PDF, DOCX, XLSX, PPTX, TXT dibaca AI)
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-700 file:font-bold"
                />
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                📌 <strong>Log Otomatis:</strong> Akan tercatat diunggah oleh{" "}
                <strong>
                  {user.full_name} (Badge {user.badge_number})
                </strong>{" "}
                beserta tanggal dan jam presisi saat ini.
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadAppDocModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={uploadingDoc}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
                >
                  {uploadingDoc ? "Mengunggah..." : "Upload & Index ke AI"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal Upload Dokumen pada Menu "Evidence" (Dengan Dropdown Visibilitas untuk Admin) */}
      {showUploadEvidenceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">
                📂 Upload Dokumen Menu Evidence (Bahan AI)
              </h3>
              <button onClick={() => setShowUploadEvidenceModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => handleUploadDocument(e, "EVIDENCE")}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kategori Evidence
                  </label>
                  <CustomSelect
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900"
                  >
                    <option value="SOP">SOP / Kebijakan TI</option>
                    <option value="SLA">Laporan SLA & Insiden (Layanan TI)</option>
                    <option value="DRC">Laporan Uji DRC & Backup (Infra TI)</option>
                    <option value="PENTEST">Laporan VAPT / Pentest Security</option>
                    <option value="UAT">Dokumen UAT Umum</option>
                    <option value="BAST">Dokumen BAST Umum</option>
                    <option value="LAINNYA">Evidence Audit Lainnya</option>
                  </CustomSelect>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Versi Dokumen
                  </label>
                  <input
                    type="text"
                    value={docVersionLabel}
                    onChange={(e) => setDocVersionLabel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Dokumen Evidence
                </label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Contoh: Laporan Uji DRC & Backup Restore Semester 2 2026"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              {/* DROPDOWN VISIBILITAS TIM KHUSUS SAAT ADMIN UPLOAD EVIDENCE */}
              {isAdmin && (
                <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-blue-950 mb-1">
                      🔐 Pengaturan Visibilitas Dokumen (Khusus Admin)
                    </label>
                    <CustomSelect
                      value={evidenceVisScope}
                      onChange={(e) =>
                        setEvidenceVisScope(
                          e.target.value as "ALL_TIM" | "TEAM_ONLY"
                        )
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-blue-300 text-xs font-bold bg-white text-slate-900"
                    >
                      <option value="ALL_TIM">
                        🌐 Dapat Dilihat Semua Tim (All Tim)
                      </option>
                      <option value="TEAM_ONLY">
                        🔒 Hanya Dapat Dilihat oleh Tim Tertentu
                      </option>
                    </CustomSelect>
                  </div>

                  {evidenceVisScope === "TEAM_ONLY" && (
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-blue-900 mb-1">
                          Pilih Tim Tujuan
                        </label>
                        <CustomSelect
                          value={evidenceTargetTeamId}
                          onChange={(e) => {
                            const tId = e.target.value;
                            setEvidenceTargetTeamId(tId);
                            const brs = getBranchesForTeam(tId);
                            setEvidenceTargetBranchId(
                              brs.length > 0 ? brs[0].id : ""
                            );
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-blue-200 text-xs font-bold bg-white text-slate-900"
                        >
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.team_name}
                            </option>
                          ))}
                        </CustomSelect>
                      </div>
                      {getBranchesForTeam(evidenceTargetTeamId).length > 0 && (
                        <div>
                          <label className="block text-[11px] font-bold text-blue-900 mb-1">
                            Pilih Branch
                          </label>
                          <CustomSelect
                            value={evidenceTargetBranchId}
                            onChange={(e) =>
                              setEvidenceTargetBranchId(e.target.value)
                            }
                            className="w-full px-3 py-2 rounded-xl border border-blue-200 text-xs font-bold bg-white text-slate-900"
                          >
                            <option value="">Seluruh Branch Tim Ini</option>
                            {getBranchesForTeam(evidenceTargetTeamId).map(
                              (b) => (
                                <option key={b.id} value={b.id}>
                                  {b.branch_name}
                                </option>
                              )
                            )}
                          </CustomSelect>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ringkasan / Konten Penting (Opsional — AI juga membaca isi file)
                </label>
                <textarea
                  rows={3}
                  value={docSummary}
                  onChange={(e) => setDocSummary(e.target.value)}
                  placeholder="Tuliskan poin utama dokumen ini. Agentic AI membaca ringkasan ini sekaligus seluruh isi file yang diunggah..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih File Dokumen (Wajib — isi PDF, DOCX, XLSX, PPTX, TXT dibaca AI)
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-700 file:font-bold"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                📌 <strong>Log Upload Detail:</strong> Dicatat atas nama{" "}
                <strong>
                  {user.full_name} (Badge {user.badge_number})
                </strong>{" "}
                beserta waktu presisi.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadEvidenceModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={uploadingDoc}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
                >
                  {uploadingDoc ? "Mengunggah..." : "Upload Evidence & Index AI"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
