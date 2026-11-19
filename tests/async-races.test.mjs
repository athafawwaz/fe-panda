// Regression: dua race async di frontend (dijalankan sungguhan, bukan cek teks statis).
//  1. AIUploadCard di-mount ulang saat analisis masih jalan -> tidak boleh macet di "analyzing".
//  2. Dashboard chat: ganti sesi / chat baru saat stream atau muat sesi berjalan -> hasil lama dibuang.
// Jalankan: node --test frontend/tests/   (butuh `typescript` terpasang global / resolvable)
// SRC_DIR (opsional) menunjuk salinan src lain, mis. untuk membuktikan test gagal pada kode lama.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
let ts;
try {
  ts = require("typescript");
} catch {
  ts = require(execSync("realpath $(command -v tsc)").toString().trim().replace(/\/bin\/tsc$/, ""));
}
const SRC = process.env.SRC_DIR || new URL("../src/", import.meta.url).pathname;
const read = (p) => readFileSync(SRC + p, "utf8");
const tick = () => new Promise((r) => setTimeout(r, 0));
const flush = async () => { for (let i = 0; i < 10; i++) await tick(); };

// ── Fake jaringan: tiap fetch tertahan sampai test memutuskan; menghormati AbortSignal ──
const calls = [];
const enc = new TextEncoder();
globalThis.fetch = (url, init = {}) =>
  new Promise((resolve, reject) => {
    const c = { url: String(url), init, ignoreAbort: false };
    const abortErr = () => Object.assign(new Error("aborted"), { name: "AbortError" });
    init.signal?.addEventListener("abort", () => !c.ignoreAbort && (c.ctl ? c.ctl.error(abortErr()) : reject(abortErr())));
    c.json = (data) => resolve(new Response(JSON.stringify(data), { status: 200 }));
    c.fail = (status, error) => resolve(new Response(JSON.stringify({ error }), { status }));
    c.stream = () => resolve(new Response(new ReadableStream({ start: (ctl) => (c.ctl = ctl) }), { status: 200 }));
    c.sse = (event, data) => c.ctl.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    c.finish = (data) => { c.sse("done", data); c.ctl.close(); };
    calls.push(c);
  });
const pending = (re) => calls.filter((c) => re.test(c.url));

const store = new Map([["panda_auth_token", "TOK"]]);
globalThis.window = {};
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem() {}, removeItem() {} };

const apiJs = ts.transpileModule(read("lib/api.ts"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const api = await import("data:text/javascript;base64," + Buffer.from(apiJs).toString("base64"));

// ───────────────────────── 1. AIUploadCard ─────────────────────────
// Runtime hooks minimal: unmount membuang setState & menjalankan cleanup efek (seperti React).
function mountComponent(Comp, props) {
  const inst = { slots: [], effects: [], unmounted: false, cleanups: [] };
  let idx = 0, ei = 0;
  const hooks = {
    useState(init) {
      const i = idx++;
      inst.slots[i] ??= { v: typeof init === "function" ? init() : init };
      return [inst.slots[i].v, (u) => {
        if (inst.unmounted) return; // React: setState setelah unmount = no-op, updater tidak dijalankan
        inst.slots[i].v = typeof u === "function" ? u(inst.slots[i].v) : u;
        render();
      }];
    },
    useEffect(fn, deps) {
      const i = ei++;
      const prev = inst.effects[i];
      if (!prev || !deps || deps.some((d, k) => d !== prev.deps[k])) inst.effects[i] = { fn, deps, run: true };
    },
  };
  const render = () => {
    idx = 0; ei = 0;
    current = hooks;
    Comp(props);
    inst.effects.forEach((e, i) => {
      if (!e.run) return;
      e.run = false;
      inst.cleanups[i]?.();
      inst.cleanups[i] = e.fn();
    });
  };
  render();
  return { status: () => inst.slots[0].v.status, unmount: () => { inst.unmounted = true; inst.cleanups.forEach((c) => c?.()); } };
}
let current;
const fakeReact = { createElement: () => null, useState: (i) => current.useState(i), useEffect: (f, d) => current.useEffect(f, d) };
fakeReact.default = fakeReact;
const cardJs = ts.transpileModule(read("components/AIUploadCard.tsx"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
}).outputText;
const cardExports = {};
new Function("require", "exports", cardJs)((m) => {
  if (m === "react") return fakeReact;
  if (m === "@/lib/api") return { apiFetch: api.apiFetch };
  if (m === "lucide-react") return new Proxy({}, { get: () => () => null });
  return { default: () => null };
}, cardExports);
const Card = cardExports.default;
const analysis = {
  staging_id: "st", file: { name: "a.pdf", size_bytes: 1, sha256: "x".repeat(64) }, categories: [], candidates: [],
  suggestion: { destinations: [], categories: [], title_options: [], version_options: [], tag_options: [], engine: "t", content_shared_with_llm: false }, is_admin: false,
};
const cardProps = (id) => ({ entryId: id, file: new File(["x"], "a.pdf"), message: "", teams: [], onSaved() {}, onPreview() {} });

test("AIUploadCard: remount saat analisis berjalan tidak macet di analyzing", async () => {
  calls.length = 0;
  const a = mountComponent(Card, cardProps("e1"));
  assert.equal(pending(/upload\/analyze/).length, 1);
  a.unmount(); // user pindah menu
  const b = mountComponent(Card, cardProps("e1")); // kembali: analisis sama, tidak diulang
  assert.equal(pending(/upload\/analyze/).length, 1);
  assert.equal(b.status(), "analyzing");
  pending(/upload\/analyze/)[0].json(analysis);
  await flush();
  assert.equal(b.status(), "ready");
  assert.equal(mountComponent(Card, cardProps("e1")).status(), "ready"); // mount berikutnya langsung dari cache
});

test("AIUploadCard: analisis gagal saat remount menjadi error, bukan analyzing selamanya", async () => {
  calls.length = 0;
  mountComponent(Card, cardProps("e2")).unmount();
  const b = mountComponent(Card, cardProps("e2"));
  assert.equal(pending(/upload\/analyze/).length, 1);
  pending(/upload\/analyze/)[0].fail(500, "boom");
  await flush();
  assert.equal(b.status(), "error");
});

// ───────────────────────── 2. Dashboard chat ─────────────────────────
// Ambil kode asli handler dari page.tsx (AST) dan jalankan dengan state/setter palsu.
const pageSrc = read("app/dashboard/page.tsx");
const sf = ts.createSourceFile("page.tsx", pageSrc, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TSX);
const decls = {};
(function walk(n) {
  if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && ts.isArrowFunction(n.initializer)) decls[n.name.text] = n.parent.getText();
  ts.forEachChild(n, walk);
})(sf);
// Efek unmount (useEffect deps [] yang mengembalikan cleanup & menyentuh aiAbortRef) diambil dari page.tsx.
let unmountEffect;
(function walk(n) {
  if (ts.isCallExpression(n) && n.expression.getText() === "useEffect" && n.arguments[1]?.getText() === "[]" && /aiAbortRef/.test(n.arguments[0].getText())) unmountEffect = n.arguments[0].getText();
  ts.forEachChild(n, walk);
})(sf);
assert.ok(unmountEffect, "efek cleanup unmount tidak ditemukan di page.tsx");
const NAMES = ["cancelAiInflight", "startNewAiChat", "openAiSession", "handleAskAgenticAI", "loadAiSessions", "updateAiLive", "switchSegment"];
for (const n of NAMES) assert.ok(decls[n], `handler ${n} tidak ditemukan di page.tsx`);
const handlersJs = ts.transpileModule(NAMES.map((n) => decls[n]).join("\n") + `\nreturn { ${NAMES.join(",")} };`, {
  compilerOptions: { target: ts.ScriptTarget.ES2020 }, reportDiagnostics: false,
}).outputText;
const unmountJs = ts.transpileModule(`return (${unmountEffect})();`, { compilerOptions: { target: ts.ScriptTarget.ES2020 }, reportDiagnostics: false }).outputText;

function chat() {
  const st = {
    aiHistory: [], aiSessionId: null, aiSessions: [], aiLoading: false, aiPendingQuestion: null, aiLive: null,
    aiReplyTo: null, aiPendingReplyTo: null, aiPrompt: "", aiThinking: false, aiFilterModule: "", activeMenu: "agentic", toast: [],
  };
  const refs = {
    aiAbortRef: { current: null }, aiSessionLoadRef: { current: null }, aiSessionsReqRef: { current: 0 }, aiLiveRef: { current: null },
    aiLiveShownRef: { current: 0 }, aiScrolledAtRef: { current: 0 }, historyIndexRef: { current: -1 }, promptDraftRef: { current: "" },
    chatEndRef: { current: null },
  };
  const extra = {
    ...refs, apiFetch: api.apiFetch, streamAgenticChat: api.streamAgenticChat, user: {}, impersonation: null, storeImpersonation() {},
    notify: (m) => st.toast.push(m), loadAiQuota() {}, loadAllWorkspaceData: async () => {}, loadIdentity: async () => ({ team: {} }),
    loadAiShortcuts() {}, scrollToChatBottom() {}, setShowAiSessions() {},
  };
  // Tiap pemanggilan membuat closure baru dengan snapshot state (seperti render ulang React).
  const make = () => {
    const scope = new Proxy({}, {
      has: (_, k) => typeof k === "string" && (k in st || k in extra || /^set[A-Z]/.test(k) || NAMES.includes(k)),
      get: (_, k) => {
        if (typeof k === "symbol") return undefined;
        if (k in extra) return extra[k];
        if (k in st) return st[k];
        const key = k[3].toLowerCase() + k.slice(4);
        return (u) => { if (key in st) st[key] = typeof u === "function" ? u(st[key]) : u; };
      },
    });
    const fns = new Function("scope", `with (scope) { ${handlersJs} }`)(scope);
    Object.assign(extra, fns); // handler saling memanggil lewat scope
    return fns;
  };
  const unmount = () => new Function("scope", `with (scope) { ${unmountJs} }`)(new Proxy({}, { has: (_, k) => k in refs, get: (_, k) => refs[k] }))();
  return { st, refs, make, unmount };
}
const resp = (sid, text) => ({ reply_markdown: text, session_id: sid, matched_documents: [], trace: {} });

test("chat: chat baru saat stream berjalan -> jawaban lama tidak masuk & tidak menimpa session", async () => {
  calls.length = 0;
  const { st, make } = chat();
  const run = make().handleAskAgenticAI("q1");
  const stream = pending(/ai\/chat\/stream/)[0];
  stream.stream();
  stream.ignoreAbort = true; // jawaban sudah terlanjur tiba walau koneksi diputus
  await flush();
  make().startNewAiChat();
  stream.finish(resp("OLD", "jawaban lama"));
  await run;
  assert.deepEqual(st.aiHistory, []);
  assert.equal(st.aiSessionId, null);
  assert.equal(st.aiLoading, false);
  assert.equal(st.aiLive, null);
});

test("chat: stream lama (abort) selesai belakangan tidak menghapus loading/live request baru", async () => {
  calls.length = 0;
  const { st, make } = chat();
  const run1 = make().handleAskAgenticAI("q1");
  const s1 = pending(/ai\/chat\/stream/)[0];
  s1.stream();
  await flush();
  make().startNewAiChat(); // abort q1
  const run2 = make().handleAskAgenticAI("q2");
  const s2 = pending(/ai\/chat\/stream/)[1];
  s2.stream();
  await flush();
  await run1; // q1 selesai dengan AbortError sesudah q2 mulai
  assert.equal(st.aiLoading, true, "loading q2 tidak boleh dimatikan oleh q1");
  assert.equal(st.aiPendingQuestion, "q2");
  assert.ok(st.aiLive, "live q2 harus tetap ada");
  assert.deepEqual(st.aiHistory, [], "q1 yang dibatalkan tidak boleh disisipkan sebagai 'dihentikan'");
  s2.sse("answer_delta", { text: "halo" });
  s2.finish(resp("S2", "halo"));
  await run2;
  assert.equal(st.aiHistory.length, 1);
  assert.equal(st.aiHistory[0].question, "q2");
  assert.equal(st.aiSessionId, "S2");
  assert.equal(st.aiLoading, false);
});

test("chat: buka sesi B saat sesi A masih dimuat -> B menang walau A tiba belakangan", async () => {
  calls.length = 0;
  const { st, make } = chat();
  const a = make().openAiSession("A");
  const b = make().openAiSession("B");
  const [ca, cb] = pending(/chat\/sessions\/[AB]$/);
  cb.json({ session: {}, messages: [{ question: "qB", response: resp("B", "rB") }] });
  await b;
  ca.ignoreAbort = true;
  ca.json({ session: {}, messages: [{ question: "qA", response: resp("A", "rA") }] });
  await a;
  assert.equal(st.aiSessionId, "B");
  assert.deepEqual(st.aiHistory.map((m) => m.question), ["qB"]);
});

test("chat: buka sesi saat stream berjalan -> jawaban stream tidak disisipkan ke sesi yang dibuka", async () => {
  calls.length = 0;
  const { st, make } = chat();
  const run = make().handleAskAgenticAI("q1");
  const s = pending(/ai\/chat\/stream/)[0];
  s.stream();
  s.ignoreAbort = true;
  await flush();
  const open = make().openAiSession("B");
  pending(/chat\/sessions\/B$/)[0].json({ session: {}, messages: [{ question: "qB", response: resp("B", "rB") }] });
  await open;
  s.finish(resp("OLD", "stale"));
  await run;
  assert.equal(st.aiSessionId, "B");
  assert.deepEqual(st.aiHistory.map((m) => m.question), ["qB"]);
  assert.equal(st.aiLoading, false);
});

test("chat: kirim pesan saat sesi masih dimuat -> muat sesi lama tidak menimpa sesi baru", async () => {
  calls.length = 0;
  const { st, make } = chat();
  const open = make().openAiSession("A"); // lambat
  const run = make().handleAskAgenticAI("q1");
  const s = pending(/ai\/chat\/stream/)[0];
  s.stream();
  s.finish(resp("NEW", "jawab"));
  await run;
  const load = pending(/chat\/sessions\/A$/)[0];
  load.ignoreAbort = true;
  load.json({ session: {}, messages: [{ question: "qA", response: resp("A", "rA") }] });
  await open;
  assert.equal(st.aiSessionId, "NEW");
  assert.deepEqual(st.aiHistory.map((m) => m.question), ["q1"]);
});

test("chat: daftar sesi lama yang tiba belakangan tidak menimpa daftar terbaru", async () => {
  calls.length = 0;
  const { st, make } = chat();
  const first = make().loadAiSessions();
  const second = make().loadAiSessions();
  const [c1, c2] = pending(/chat\/sessions$/);
  c2.json({ sessions: [{ id: "new" }] });
  await second;
  c1.json({ sessions: [{ id: "old" }] });
  await first;
  assert.deepEqual(st.aiSessions, [{ id: "new" }]);
});

test("chat: ganti segmen impersonate membatalkan stream & muat sesi segmen lama", async () => {
  calls.length = 0;
  const { st, make } = chat();
  const run = make().handleAskAgenticAI("q1");
  const s = pending(/ai\/chat\/stream/)[0];
  s.stream();
  s.ignoreAbort = true;
  await flush();
  await make().switchSegment(null);
  s.finish(resp("OLD", "stale"));
  await run;
  assert.deepEqual(st.aiHistory, []);
  assert.equal(st.aiSessionId, null);
  assert.equal(st.aiLoading, false);
});

test("chat: unmount memutus stream & muat sesi, callback lama tidak berefek", async () => {
  calls.length = 0;
  const { st, refs, make, unmount } = chat();
  const run = make().handleAskAgenticAI("q1");
  const s = pending(/ai\/chat\/stream/)[0];
  s.stream();
  await flush();
  const open = make().openAiSession("A");
  const load = pending(/chat\/sessions\/A$/)[0];
  load.ignoreAbort = true;
  // openAiSession membatalkan stream; mulai stream lagi supaya keduanya aktif saat unmount
  await run;
  const run2 = make().handleAskAgenticAI("q2");
  const s2 = pending(/ai\/chat\/stream/)[1];
  s2.stream();
  s2.ignoreAbort = true;
  await flush();
  const loadSignal = refs.aiSessionLoadRef.current?.signal;
  assert.ok(refs.aiAbortRef.current && loadSignal, "stream & muat sesi harus aktif sebelum unmount");
  const streamSignal = refs.aiAbortRef.current.signal;
  unmount();
  assert.ok(streamSignal.aborted && loadSignal.aborted);
  assert.equal(refs.aiAbortRef.current, null);
  assert.equal(refs.aiSessionLoadRef.current, null);
  const before = JSON.stringify(st);
  load.json({ session: {}, messages: [{ question: "qA", response: resp("A", "rA") }] });
  s2.finish(resp("LATE", "terlambat"));
  await Promise.all([open, run2]);
  assert.equal(JSON.stringify(st), before, "tidak ada state yang berubah setelah unmount");
});

test("chat: callback onStep/onDelta/onReset milik request lama diabaikan", async () => {
  calls.length = 0;
  const { st, refs, make } = chat();
  const run1 = make().handleAskAgenticAI("q1");
  const s1 = pending(/ai\/chat\/stream/)[0];
  s1.stream();
  s1.ignoreAbort = true; // stream lama tetap mengalirkan event setelah dilepas
  await flush();
  s1.sse("answer_delta", { text: "A" });
  await flush();
  assert.equal(st.aiLive?.answer, "A");
  make().startNewAiChat();
  const run2 = make().handleAskAgenticAI("q2");
  const s2 = pending(/ai\/chat\/stream/)[1];
  s2.stream();
  await flush();
  s2.sse("answer_delta", { text: "B" });
  await flush();
  assert.equal(st.aiLive.answer, "B");
  s1.sse("step", { id: "old", kind: "search", status: "running" });
  s1.sse("usage", { total_tokens: 1 });
  s1.sse("answer_delta", { text: "STALE" });
  s1.sse("answer_reset", {});
  s1.finish(resp("OLD", "stale"));
  await run1;
  assert.equal(st.aiLive.answer, "B", "delta/reset lama tidak boleh menyentuh live q2");
  assert.deepEqual(st.aiLive.steps, []);
  assert.equal(st.aiLive.usage, null);
  assert.equal(st.aiLoading, true);
  assert.equal(st.aiPendingQuestion, "q2");
  assert.equal(refs.aiAbortRef.current.signal.aborted, false);
  s2.finish(resp("S2", "B"));
  await run2;
  assert.deepEqual(st.aiHistory.map((m) => m.question), ["q2"]);
});

test("chat: tombol Stop manual tetap menampilkan jawaban parsial & mereset loading", async () => {
  calls.length = 0;
  const { st, refs, make } = chat();
  const run = make().handleAskAgenticAI("q1");
  const s = pending(/ai\/chat\/stream/)[0];
  s.stream();
  await flush();
  s.sse("answer_delta", { text: "separuh" });
  await flush();
  refs.aiAbortRef.current.abort(); // = stopAgenticAI
  await run;
  assert.equal(st.aiHistory.length, 1);
  assert.equal(st.aiHistory[0].stopped, true);
  assert.equal(st.aiHistory[0].response.reply_markdown, "separuh");
  assert.equal(st.aiLoading, false);
  assert.equal(st.aiLive, null);
  assert.equal(st.aiPendingQuestion, null);
  assert.equal(refs.aiAbortRef.current, null);
});
