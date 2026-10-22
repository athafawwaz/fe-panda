import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Audit log export: user-typed text must not become a spreadsheet formula or break columns.
const src = readFileSync(new URL('../src/lib/csv.ts', import.meta.url), 'utf8');
const toCsv = new Function(`${src.replace(/export /, '').replace(/: string\[\]\[\]\): string/, ')')}; return toCsv;`)();

test('toCsv quotes, escapes, and neutralises formulas', () => {
  assert.equal(toCsv([['a', 'b"c', 'x,y']]), '"a","b""c","x,y"');
  assert.equal(toCsv([['=HYPERLINK("x")', '+1', '-2', '@SUM(A1)']]), `"'=HYPERLINK(""x"")","'+1","'-2","'@SUM(A1)"`);
  assert.equal(toCsv([['1'], ['2']]), '"1"\r\n"2"');
});
