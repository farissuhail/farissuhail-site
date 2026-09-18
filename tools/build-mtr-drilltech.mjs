/**
 * Build the public copy of the MTR DRILLTECH explorer for farissuhail.com.
 *
 * The canonical application lives outside this repository and is never edited:
 *   C:/Users/Surface Laptop 5/Documents/ChatGPT/Project ABC/mtr-drilltech-app/dist
 *
 * This script copies that dist/ into ./mtr-drilltech/ and applies exactly two
 * categories of change, both of which are required for a public deploy:
 *
 * 1. Sub-directory paths. The original app is served from a domain root and uses
 *    root-relative URLs (/style.css, /data/equipment.json). On this site it lives
 *    at /mtr-drilltech/, so those are rewritten to document-relative URLs.
 *
 * 2. Planning data withheld. The June 2026 LTDS records are derived from a source
 *    marked CONFIDENTIAL / Internal. They are not published: the two LTDS JSON
 *    files are omitted, their fetches are replaced with empty catalogues, and the
 *    Malaysia Fleet entry points are hidden. The DOM nodes stay in place so no
 *    script in the app dereferences a missing element.
 *
 * Nothing else is touched: same three models, same geometry, styles, controls,
 * inspector tabs and copy.
 *
 * Usage:  node tools/build-mtr-drilltech.mjs
 */
import { cp, mkdir, readFile, rm, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SOURCE = path.resolve(
  'C:/Users/Surface Laptop 5/Documents/ChatGPT/Project ABC/mtr-drilltech-app/dist',
);
const TARGET = path.join(SITE, 'mtr-drilltech');

/** LTDS-derived files that must not be published. */
const WITHHELD = ['data/ltds.json', 'data/hwu-ltds.json'];

function replaceOnce(source, find, replace, label) {
  if (!source.includes(find)) throw new Error(`Expected pattern missing (${label}): ${find.slice(0, 80)}`);
  return source.replace(find, replace);
}

async function walk(dir, base = dir) {
  const out = [];
  for (const entry of await readdir(dir)) {
    const full = path.join(dir, entry);
    if ((await stat(full)).isDirectory()) out.push(...(await walk(full, base)));
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

await rm(TARGET, { recursive: true, force: true });
await mkdir(TARGET, { recursive: true });
await cp(SOURCE, TARGET, { recursive: true });

for (const rel of WITHHELD) {
  await rm(path.join(TARGET, rel), { force: true });
}

/* ---------------------------------------------------------------- */
/* index.html                                                        */
/* ---------------------------------------------------------------- */

let html = await readFile(path.join(TARGET, 'index.html'), 'utf8');

for (const [from, to] of [
  ['href="/style.css"', 'href="style.css"'],
  ['"three":"/vendor/three.module.min.js"', '"three":"./vendor/three.module.min.js"'],
  ['"three/addons/controls/OrbitControls.js":"/vendor/OrbitControls.js"', '"three/addons/controls/OrbitControls.js":"./vendor/OrbitControls.js"'],
  ['src="/app.js"', 'src="app.js"'],
  ['src="/webmcp.js"', 'src="webmcp.js"'],
  ['src="/assets/mtr-logo-white.png"', 'src="assets/mtr-logo-white.png"'],
]) {
  html = replaceOnce(html, from, to, 'index path');
}

// Hide the Malaysia Fleet entry points rather than deleting the nodes.
html = replaceOnce(
  html,
  '<button class="nav-tab" data-view="fleet">',
  '<button class="nav-tab" data-view="fleet" hidden>',
  'fleet tab',
);
html = replaceOnce(
  html,
  '<button id="show-fleet" class="rig-selector">',
  '<button id="show-fleet" class="rig-selector" hidden>',
  'rig selector',
);

// The published edition shows no planning records, so say so in the metadata.
html = replaceOnce(
  html,
  'content="MTR DRILLTECH interactive jack-up, land rig and hydraulic workover unit explorer with June 2026 LTDS planning records."',
  'content="MTR DRILLTECH interactive jack-up, land rig and hydraulic workover unit explorer. Public edition: illustrative 3D models only, without planning records."',
  'meta description',
);
html = replaceOnce(html, 'JUNE 2026 <b>LTDS</b>', 'PUBLIC <b>EDITION</b>', 'source edition badge');

// A way back to the site section that hosts this.
html = replaceOnce(
  html,
  '<div class="header-right">',
  '<div class="header-right"><a class="icon-btn" href="/mtr-drilltech.html" title="Back to the MTR DRILLTECH section on farissuhail.com" aria-label="Back to the MTR DRILLTECH section">&#8592;</a>',
  'back link',
);

await writeFile(path.join(TARGET, 'index.html'), html);

/* ---------------------------------------------------------------- */
/* app.js                                                            */
/* ---------------------------------------------------------------- */

let app = await readFile(path.join(TARGET, 'app.js'), 'utf8');

app = replaceOnce(
  app,
  "readData('/data/equipment.json'),readData('/data/ltds.json'),readData('/data/hwu-equipment.json'),readData('/data/hwu-ltds.json')",
  "readData('data/equipment.json'),Promise.resolve(EMPTY_CATALOG),readData('data/hwu-equipment.json'),Promise.resolve(EMPTY_CATALOG)",
  'data reads',
);

app = replaceOnce(
  app,
  "$('.main-nav .count').textContent=[...catalog.rigs,...hwuCatalog.rigs].filter(isUnitRecord).length;",
  "$('.main-nav .count').textContent=[...catalog.rigs,...hwuCatalog.rigs].filter(isUnitRecord).length;$('#rig-selector-label').textContent='Illustrative models only';",
  'count line',
);

// Declared once, ahead of the boot block that consumes it.
app = replaceOnce(
  app,
  'try{\r\n  const readData=',
  "const EMPTY_CATALOG={rigs:[],datasetName:'Withheld from the public edition',sourceSnapshotMonth:null,coverage:null,caveats:[],rigNamesRemoved:true};\r\ntry{\r\n  const readData=",
  'empty catalog',
);

// The Evidence tab names the source attachment. The public edition carries none
// of its contents, so it does not need to carry its internal filename either.
app = replaceOnce(
  app,
  '<b>Rig Planning LTDS_File June 2026_0168.pdf</b>',
  '<b>June 2026 LTDS planning attachment &middot; withheld from this edition</b>',
  'source filename',
);

await writeFile(path.join(TARGET, 'app.js'), app);

/* ---------------------------------------------------------------- */
/* Report                                                            */
/* ---------------------------------------------------------------- */

const files = await walk(TARGET);
const leftoverAbsolute = [];
for (const rel of files) {
  if (!/\.(html|js|css)$/.test(rel)) continue;
  const text = await readFile(path.join(TARGET, rel), 'utf8');
  for (const match of text.match(/["'(](\/(?:data|assets|vendor|app|scene|style|webmcp)[A-Za-z0-9._/-]*)/g) ?? []) {
    leftoverAbsolute.push(`${rel}: ${match.slice(1)}`);
  }
}

console.log(
  JSON.stringify(
    {
      target: path.relative(SITE, TARGET),
      files: files.length,
      withheld: WITHHELD,
      ltdsFilesPresent: files.filter((f) => /ltds/i.test(f)),
      leftoverAbsolutePaths: leftoverAbsolute,
    },
    null,
    2,
  ),
);
