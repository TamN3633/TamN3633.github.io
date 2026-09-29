// Запуск: npm test. Все значения в фикстурах — выдуманные.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { scan, walk } from './check-privacy.mjs';

const GATE = new URL('./check-privacy.mjs', import.meta.url).pathname;

function site(files) {
  const dir = mkdtempSync(join(tmpdir(), 'privacy-'));
  for (const [name, body] of Object.entries(files)) {
    mkdirSync(join(dir, name, '..'), { recursive: true });
    writeFileSync(join(dir, name), body);
  }
  return dir;
}

test('находит термин из denylist без учёта регистра и через неразрывный пробел', () => {
  const dir = site({ 'index.html': '<p>Работал в ACME&nbsp;Corp</p>' });
  const found = scan(walk(dir), ['acme corp']);
  assert.equal(found.length, 1);
  assert.match(found[0], /index\.html/);
});

test('находит внутренний IP, путь к шаре и численность в разных формах', () => {
  const dir = site({
    'a/index.html': '<p>сервер 10.20.30.40</p>',
    'b.html': '<p>папка \\\\server01\\share</p>',
    'c.html': '<p>бюро на 70 человек</p>',
    'd.md': 'штат 70+ работников',
  });
  assert.equal(scan(walk(dir), []).length, 4);
});

test('чистая страница, допустимые числа и бинарные файлы не срабатывают', () => {
  const dir = site({
    'index.html': '<p>команда 6 человек, ~800 компьютеров, 92 заявки, 2500 часов, astro 7.3.5</p>',
    'logo.png': 'Работал в ACME Corp',
  });
  assert.deepEqual(scan(walk(dir), ['acme corp']), []);
});

test('режим «только denylist» не применяет общие шаблоны', () => {
  const dir = site({ 'x.mjs': "// пример: '10.20.30.40', 70 человек" });
  assert.deepEqual(scan(walk(dir), ['acme corp'], []), []);
});

function gate(cwd, env = {}) {
  return spawnSync(process.execPath, [GATE, 'dist', '--no-repo'], { cwd, env: { ...process.env, CI: '', ...env } });
}

test('CLI: без denylist локально падает, в CI проходит только по общим шаблонам', () => {
  const dir = site({ 'dist/index.html': '<p>чисто</p>' });
  assert.equal(gate(dir).status, 1);
  assert.equal(gate(dir, { CI: 'true' }).status, 0);
});

test('CLI: пустой каталог сборки — провал, находка — провал, чисто — успех', () => {
  const empty = site({ '.privacy-denylist': 'acme corp\n', 'dist/.keep': '' });
  assert.equal(gate(empty).status, 1);
  const dirty = site({ '.privacy-denylist': 'acme corp\n', 'dist/index.html': 'ACME Corp' });
  assert.equal(gate(dirty).status, 1);
  const clean = site({ '.privacy-denylist': 'acme corp\n', 'dist/index.html': 'чисто' });
  assert.equal(gate(clean).status, 0);
});
