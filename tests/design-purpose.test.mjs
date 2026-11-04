import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (name) => readFileSync(new URL(`../src/app/${name}`, import.meta.url), 'utf8');

test('public entry stays useful without live statistics or pointer effects', () => {
  const page = source('page.tsx');
  assert.match(page, /href="#content"/);
  assert.match(page, /id="content"/);
  assert.match(page, /Pusat Administrasi/);
  assert.match(page, /logo-pusri-horizontal-dark/);
  assert.match(page, /Contoh data/);
  assert.match(page, /stripe-mark/);
  assert.doesNotMatch(page, /useCountUp|onMouseMove|compliance_rate/);
});

test('workspace exposes navigation state and does not fabricate trend charts', () => {
  const page = source('dashboard/page.tsx');
  assert.match(page, /aria-current=\{active \? "page" : undefined\}/);
  assert.doesNotMatch(page, /id="blueArea"|Kepatuhan Audit TI/);
  assert.doesNotMatch(page, /Jadwal & Periode Audit|Aksi Cepat|Folder Ter-assign|PANDA Agentic AI/);
  assert.match(page, /className="overview"/);
});

test('login fields have labels, autocomplete and visible PoC warning', () => {
  const page = source('login/page.tsx');
  for (const field of ['badge', 'password']) {
    assert.ok(page.includes(`htmlFor="${field}"`));
    assert.ok(page.includes(`id="${field}"`));
  }
  assert.match(page, /autoComplete="current-password"/);
  assert.match(page, /role="alert"/);
  assert.match(page, /Jangan gunakan untuk data sensitif/);
});

test('navigation does not mount a synthetic transition screen', () => {
  for (const file of ['layout.tsx', 'login/page.tsx', 'dashboard/page.tsx']) {
    assert.doesNotMatch(source(file), /PageTransitionLoader|triggerPageLoader/);
  }
  const css = source('globals.css');
  assert.match(css, /--action: #225d9f/);
  assert.doesNotMatch(css, /border-radius: (?:1[1-9]|[2-9]\d)px/, 'radii must come from the --r-* scale');
  assert.match(css, /--brand-yellow: #fbd316/);
});

test('UI source stays on the Pusri palette: no emoji, violet, gradients or shimmer', async () => {
  const { readdirSync } = await import('node:fs');
  const dir = new URL('../src/', import.meta.url);
  const files = readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.tsx'));
  for (const f of files) {
    const code = readFileSync(new URL(f, dir), 'utf8').replace(/^\s*(\/\/|\{\/\*).*$/gm, '');
    assert.doesNotMatch(code, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, `${f}: emoji`);
    assert.doesNotMatch(code, /violet-|purple-|fuchsia-|bg-gradient|ai-shimmer/, `${f}: off-palette style`);
  }
});
