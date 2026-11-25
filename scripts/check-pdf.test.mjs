// Запуск: npm test. Проверка, что public/cv.pdf собран из текущих текстов сайта.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sourcesHash, isFresh } from './check-pdf.mjs';

function files(map) {
  const dir = mkdtempSync(join(tmpdir(), 'pdf-'));
  return Object.entries(map).map(([name, body]) => {
    const p = join(dir, name);
    writeFileSync(p, body);
    return p;
  });
}

test('хеш зависит только от содержимого и порядка файлов', () => {
  const a = files({ 'a.json': '{"x":1}', 'b.json': '{"y":2}' });
  const b = files({ 'a.json': '{"x":1}', 'b.json': '{"y":2}' });
  assert.equal(sourcesHash(a), sourcesHash(b));
  const c = files({ 'a.json': '{"x":1}', 'b.json': '{"y":3}' });
  assert.notEqual(sourcesHash(a), sourcesHash(c));
});

test('свежий, когда отметка совпадает с хешем текстов', () => {
  const src = files({ 'p.json': '{"role":"тест"}' });
  const [stamp] = files({ 'cv.pdf.hash': sourcesHash(src) + '\n' });
  assert.equal(isFresh(stamp, src), true);
});

test('устарел, когда тексты поменялись после сборки PDF', () => {
  const src = files({ 'p.json': '{"role":"тест"}' });
  const [stamp] = files({ 'cv.pdf.hash': sourcesHash(src) });
  writeFileSync(src[0], '{"role":"другая"}');
  assert.equal(isFresh(stamp, src), false);
});

test('устарел, когда отметки нет', () => {
  const src = files({ 'p.json': '{}' });
  assert.equal(isFresh('/нет/такого/файла', src), false);
});
