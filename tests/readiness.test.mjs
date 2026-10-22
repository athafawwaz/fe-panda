import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Keep the frontend rule in sync with backend/internal/service/tools.go.
test('readiness categories mirror backend core categories', () => {
  const ts = readFileSync(new URL('../src/lib/readiness.ts', import.meta.url), 'utf8');
  const go = readFileSync(new URL('../../backend/internal/service/tools.go', import.meta.url), 'utf8');
  const list = (src, name) => src.match(new RegExp(`${name}\\s*=\\s*(?:\\[\\]string\\{|\\[)([^}\\]]*)`))[1].match(/"(\w+)"/g).join();
  assert.equal(list(ts, 'REQUIRED_INITIAL'), list(go, 'coreInitialCategories'));
  assert.equal(list(ts, 'REQUIRED_CHANGE'), list(go, 'coreChangeCategories'));
});
