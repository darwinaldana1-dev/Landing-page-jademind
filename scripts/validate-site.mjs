import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, '..');
const htmlFiles = [
  'index.html',
  'politicas-de-privacidad.html',
  'terminos-y-condiciones.html'
];
const errors = [];

function matches(source, expression) {
  return [...source.matchAll(expression)];
}

for (const relativeFile of htmlFiles) {
  const absoluteFile = path.join(root, relativeFile);
  const html = fs.readFileSync(absoluteFile, 'utf8');
  const ids = matches(html, /\bid="([^"]+)"/g).map((match) => match[1]);
  const idSet = new Set(ids);

  for (const id of idSet) {
    if (ids.filter((candidate) => candidate === id).length > 1) {
      errors.push(`${relativeFile}: ID duplicado "${id}"`);
    }
  }

  for (const match of matches(html, /\bhref="#([^"]+)"/g)) {
    if (!idSet.has(match[1])) {
      errors.push(`${relativeFile}: ancla sin destino "#${match[1]}"`);
    }
  }

  for (const match of matches(html, /\b(?:src|href)="([^"]+)"/g)) {
    const reference = match[1];
    if (/^(?:https?:|mailto:|tel:|#|data:|\/\/)/.test(reference)) continue;
    const localReference = reference.split(/[?#]/)[0];
    if (!localReference) continue;
    const target = path.resolve(path.dirname(absoluteFile), localReference);
    if (!fs.existsSync(target)) {
      errors.push(`${relativeFile}: recurso inexistente "${localReference}"`);
    }
  }

  for (const match of matches(html, /<a\b[^>]*target="_blank"[^>]*>/g)) {
    if (!/\brel="[^"]*noopener[^"]*"/.test(match[0])) {
      errors.push(`${relativeFile}: enlace target="_blank" sin noopener`);
    }
  }

  for (const match of matches(html, /<img\b[^>]*>/g)) {
    if (!/\balt="[^"]*"/.test(match[0])) errors.push(`${relativeFile}: imagen sin alt`);
    if (!/\bwidth="\d+"/.test(match[0]) || !/\bheight="\d+"/.test(match[0])) {
      errors.push(`${relativeFile}: imagen sin dimensiones explícitas`);
    }
  }

  if (!/<meta\s+name="description"\s+content="[^"]+"/.test(html)) {
    errors.push(`${relativeFile}: falta meta description`);
  }
}

const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const controls = matches(index, /<(?:input|select|textarea)\b[^>]*\bid="([^"]+)"/g)
  .map((match) => match[1]);
const labelTargets = new Set(matches(index, /<label\b[^>]*\bfor="([^"]+)"/g)
  .map((match) => match[1]));

for (const id of controls) {
  if (!labelTargets.has(id)) errors.push(`index.html: control sin label "${id}"`);
}

if (!/<main\b/.test(index)) errors.push('index.html: falta el landmark main');
if (!/<h1\b[^>]*>[^]*?<\/h1>/.test(index)) errors.push('index.html: falta H1');
if (!/prefers-reduced-motion/.test(fs.readFileSync(path.join(root, 'styles_v22.css'), 'utf8'))) {
  errors.push('styles_v22.css: falta prefers-reduced-motion');
}

JSON.parse(fs.readFileSync(path.join(root, 'site.webmanifest'), 'utf8'));
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
if (!/<urlset\b/.test(sitemap) || !/<loc>https:\/\/jademind\.com\.co\//.test(sitemap)) {
  errors.push('sitemap.xml: estructura o URL principal inválida');
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validación estática correcta: ${htmlFiles.length} HTML, enlaces locales, anclas, formularios y metadatos.`);
}
