// Regression: dokumen diambil lewat fetch ber-Bearer + header impersonate, tanpa token di URL.
// Jalankan: node --test frontend/tests/   (butuh `typescript` terpasang global / resolvable)
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
  // Fallback: modul typescript di samping binary `tsc` global (bin/tsc -> ../typescript/bin/tsc)
  ts = require(execSync("realpath $(command -v tsc)").toString().trim().replace(/\/bin\/tsc$/, ""));
}

const src = readFileSync(new URL("../src/lib/api.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;

const store = new Map([
  ["panda_auth_token", "TOK"],
  ["panda_auth_user", JSON.stringify({ id: "u" })],
  ["panda_impersonate", JSON.stringify({ team_id: "T1", branch_id: "B1" })],
]);
globalThis.window = {};
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem() {}, removeItem() {} };
const api = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));

test("fetchDocumentBlob sends Bearer + impersonate headers, no token in URL", async () => {
  let call;
  globalThis.fetch = async (url, init) => ((call = { url, init }), new Response("pdf", { status: 200 }));
  const blob = await api.fetchDocumentBlob("abc", "preview");
  assert.equal(await blob.text(), "pdf");
  assert.match(call.url, /\/documents\/abc\/preview$/);
  assert.ok(!call.url.includes("TOK") && !call.url.includes("?"));
  assert.equal(call.init.headers.Authorization, "Bearer TOK");
  assert.equal(call.init.headers["X-Impersonate-Team"], "T1");
  assert.equal(call.init.headers["X-Impersonate-Branch"], "B1");
});

test("fetchDocumentBlob rejects with ApiError on 401/403 (no fallback)", async () => {
  for (const status of [401, 403, 404]) {
    globalThis.fetch = async () => new Response(JSON.stringify({ error: "nope" }), { status });
    await assert.rejects(api.fetchDocumentBlob("abc", "download"), (e) => e instanceof api.ApiError && e.status === status && e.message === "nope");
  }
  globalThis.fetch = async () => { throw new TypeError("net"); };
  await assert.rejects(api.fetchDocumentBlob("abc", "download"), (e) => e.status === 0);
});

test("downloadDocument uses blob URL + anchor with filename", async () => {
  globalThis.fetch = async () => new Response("x");
  const clicked = [];
  globalThis.document = { createElement: () => ({ click() { clicked.push(this); } }) };
  const origCreate = URL.createObjectURL;
  const origRevoke = URL.revokeObjectURL;
  const origTimeout = globalThis.setTimeout;
  const revoked = [];
  URL.revokeObjectURL = (url) => revoked.push(url);
  globalThis.setTimeout = (callback) => callback();
  URL.createObjectURL = () => "blob:test";
  try {
    await api.downloadDocument("abc", "f.pdf");
  } finally {
    URL.createObjectURL = origCreate;
    URL.revokeObjectURL = origRevoke;
    globalThis.setTimeout = origTimeout;
  }
  assert.equal(clicked.length, 1);
  assert.equal(clicked[0].href, "blob:test");
  assert.equal(clicked[0].download, "f.pdf");
  assert.deepEqual(revoked, ["blob:test"]);
});
