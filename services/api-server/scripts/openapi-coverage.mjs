/**
 * Compare OpenAPI paths vs Nest controller routes (static scan).
 *
 * Usage: node scripts/openapi-coverage.mjs
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const root = join(import.meta.dirname, '..');
const openapiPath = join(root, '../../openapi/openapi.yaml');
const srcDir = join(root, 'src');

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (name.endsWith('.controller.ts') || name === 'app.controller.ts') {
      acc.push(p);
    }
  }
  return acc;
}

function parseOpenApiPaths(yaml) {
  const paths = new Set();
  let inPaths = false;
  for (const line of yaml.split('\n')) {
    if (/^paths:\s*$/.test(line)) {
      inPaths = true;
      continue;
    }
    if (inPaths && /^[a-zA-Z]/.test(line) && !line.startsWith(' ')) break;
    if (!inPaths) continue;
    const m = line.match(/^\s{2}(\/[^\s:]+):/);
    if (m) paths.add(m[1].replace(/\{[^}]+\}/g, ':param'));
  }
  return paths;
}

function parseControllerRoutes(files) {
  const routes = new Set();
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const ctrl =
      text.match(/@Controller\(['"`]([^'"`]*)['"`]\)/) ||
      text.match(/@Controller\(\)/);
    const prefix = ctrl && ctrl[1] !== undefined ? ctrl[1] : '';
    const base = prefix ? `/${prefix}`.replace(/\/+/g, '/') : '';

    const re =
      /@(Get|Post|Put|Patch|Delete)\((?:['"`]([^'"`]*)['"`])?\)/g;
    let m;
    while ((m = re.exec(text))) {
      const sub = m[2] || '';
      let path = `${base}/${sub}`.replace(/\/+/g, '/');
      if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
      if (!path.startsWith('/')) path = `/${path}`;
      // normalize :id style
      path = path.replace(/:([A-Za-z0-9_]+)/g, ':param');
      routes.add(path);
    }
  }
  // health root specials
  routes.add('/');
  routes.add('/health');
  return routes;
}

const yaml = readFileSync(openapiPath, 'utf8');
const openapi = parseOpenApiPaths(yaml);
const implemented = parseControllerRoutes(walk(srcDir));

const missing = [...openapi].filter((p) => {
  // openapi may use {id}; we normalized to :param
  const n = p.replace(/\{[^}]+\}/g, ':param');
  if (implemented.has(n)) return false;
  // allow trailing aliases
  return !implemented.has(n.replace(/\/$/, ''));
});

const extra = [...implemented].filter((p) => {
  const n = p.replace(/:param/g, '{id}');
  // not required to be in openapi (admin extras etc.)
  return !openapi.has(p) && !openapi.has(n) && !p.startsWith('/api/admin');
});

console.log('OpenAPI paths:', openapi.size);
console.log('Implemented routes (approx):', implemented.size);
console.log('\nMissing in code (OpenAPI - impl):');
if (!missing.length) console.log('  (none)');
else missing.sort().forEach((p) => console.log('  -', p));

console.log('\nExtra in code (non-admin, not in OpenAPI):');
const extras = extra
  .filter((p) => p.startsWith('/api/'))
  .sort();
if (!extras.length) console.log('  (none notable)');
else extras.forEach((p) => console.log('  +', p));

const coverage =
  openapi.size === 0
    ? 0
    : (((openapi.size - missing.length) / openapi.size) * 100).toFixed(1);
console.log(`\nCoverage ≈ ${coverage}% (${openapi.size - missing.length}/${openapi.size})`);

// non-zero exit if coverage under 70% of documented paths
if (Number(coverage) < 70) process.exit(2);
