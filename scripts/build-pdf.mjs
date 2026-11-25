// Печатает собранную страницу (dist/index.html) в public/cv.pdf через Chrome headless и пишет отметку свежести.
// Содержимое PDF = содержимое сайта (прошло гейт приватности), без работодателей и телефона.
// Запуск: npm run pdf (локально, macOS; путь к Chrome можно задать в CHROME).
import { writeFileSync, existsSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { SOURCES, STAMP, sourcesHash } from './check-pdf.mjs';

const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const page = resolve('dist/index.html');
if (!existsSync(page)) { console.error('Нет dist/index.html — сначала astro build'); process.exit(1); }
if (!existsSync(chrome)) { console.error(`Нет Chrome: ${chrome} (задай путь в CHROME)`); process.exit(1); }
const pdf = resolve('public/cv.pdf');

const r = spawnSync(chrome, ['--headless', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${pdf}`, `file://${page}`], { stdio: 'inherit', timeout: 60_000 });
if (r.status !== 0 || !existsSync(pdf) || statSync(pdf).size === 0) { console.error('Chrome не напечатал PDF', r.error?.message ?? ''); process.exit(1); }
writeFileSync(STAMP, sourcesHash(SOURCES) + '\n');
console.log('public/cv.pdf собран');
