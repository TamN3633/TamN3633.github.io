// Свежесть public/cv.pdf: PDF печатается из страницы, отметка public/cv.pdf.hash хранит хеш текстов,
// из которых он собран. Хеш по содержимому, не по времени файлов: в CI после checkout время случайное.
// Запуск: node scripts/check-pdf.mjs — код выхода 1, если тексты менялись после сборки PDF (`npm run pdf`).
import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const SOURCES = ['src/data/profile.json', 'src/data/skills.json', 'src/data/stack.json', 'src/pages/index.astro', 'src/layouts/Base.astro', 'src/styles/global.css'];
export const STAMP = 'public/cv.pdf.hash';

export function sourcesHash(files) {
  const h = createHash('sha256');
  for (const f of files) h.update(readFileSync(f)).update('\0');
  return h.digest('hex');
}

export function isFresh(stamp, files) {
  if (!existsSync(stamp)) return false;
  return readFileSync(stamp, 'utf8').trim() === sourcesHash(files);
}

if (realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  if (!isFresh(STAMP, SOURCES)) {
    console.error('PDF устарел: тексты сайта менялись после сборки. Запусти `npm run pdf`.');
    process.exit(1);
  }
  console.log('PDF свежий');
}
