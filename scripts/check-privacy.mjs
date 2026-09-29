// Гейт приватности: сайт и репозиторий публичные, история — навсегда.
// Ищет названия работодателей (локальный .privacy-denylist, в git не попадает), внутренние IP,
// пути к сетевым шарам и численность организаций — в собранном сайте и во всех файлах, которые уйдут в коммит.
// Запуск: node scripts/check-privacy.mjs [каталог сборки=dist] [--no-repo]. Любая находка = код выхода 1.
// Без denylist локально не запускается; в CI (CI=true) проверяет только общие шаблоны.
import { readdirSync, readFileSync, existsSync, realpathSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const TEXT = new Set(['.html', '.xml', '.txt', '.json', '.js', '.mjs', '.ts', '.astro', '.css', '.svg', '.md', '.yml', '.yaml', '.webmanifest']);

const PATTERNS = [
  ['внутренний IP', /\b(?:10\.\d{1,3}|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/g],
  ['путь к сетевой шаре', /\\\\[\w.-]+\\|smb:\/\/[\w.-]+/g],
  // От двух цифр: «команда 6 человек» допустима, двузначная и больше — уже численность организации.
  ['численность', /\b\d{2,}\+?\s*(?:человек|чел\.|сотрудник|работник|специалист|пользовател|юзер|employees|users)/gi],
];

// Файлы самого гейта содержат шаблоны и выдуманные примеры — для них только denylist.
const GATE_FILES = /(^|\/)scripts\/check-privacy[^/]*\.mjs$/;

export function walk(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath, e.name));
}

export function scan(files, denylist, patterns = PATTERNS) {
  const terms = denylist.map((t) => t.toLowerCase());
  const found = [];
  for (const path of files) {
    if (!TEXT.has(extname(path).toLowerCase())) continue;
    const body = readFileSync(path, 'utf8').replace(/&nbsp;|&#160;| /g, ' ');
    const lower = body.toLowerCase();
    terms.forEach((t, i) => { if (lower.includes(t)) found.push(`${path}: термин из denylist №${i + 1}`); });
    for (const [what, re] of patterns) {
      for (const m of body.matchAll(re)) found.push(`${path}: ${what} «${m[0]}»`);
    }
  }
  return found;
}

export function readDenylist(file) {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

if (realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith('--')) ?? 'dist';
  const inCI = process.env.CI === 'true';
  const denylist = readDenylist('.privacy-denylist');
  if (!denylist.length && !inCI) fail('нет .privacy-denylist — без него названия работодателей не проверить');
  if (!existsSync(dir)) fail(`нет каталога сборки ${dir}`);

  const siteFiles = walk(dir).filter((f) => TEXT.has(extname(f).toLowerCase()));
  if (!siteFiles.length) fail(`в ${dir} нет ни одного текстового файла — сборка пустая?`);
  const found = scan(siteFiles, denylist);

  let repoCount = 0;
  if (!args.includes('--no-repo')) {
    const git = spawnSync('git', ['ls-files', '-co', '--exclude-standard'], { encoding: 'utf8' });
    if (git.status !== 0) fail(`git ls-files не отработал: ${git.stderr.trim()}`);
    const repo = git.stdout.split('\n').filter(Boolean);
    repoCount = repo.length;
    found.push(...scan(repo.filter((f) => !GATE_FILES.test(f)), denylist));
    found.push(...scan(repo.filter((f) => GATE_FILES.test(f)), denylist, []));
  }

  for (const f of found) console.error(f);
  const scope = `сайт: ${siteFiles.length} файлов, репозиторий: ${repoCount}, denylist: ${denylist.length}${inCI && !denylist.length ? ' (CI — только общие шаблоны)' : ''}`;
  if (found.length) fail(`${found.length} находок (${scope})`);
  console.log(`OK (${scope})`);
}
