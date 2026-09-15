#!/usr/bin/env node
/* Fingerprint the CSS and JS referenced by the HTML.
 *
 * Why: the stylesheet and scripts are cached for a week, but their filenames
 * never change, so after a deploy a returning visitor gets fresh HTML paired
 * with a stale stylesheet. Appending a content hash to each reference makes the
 * URL change whenever the file does, which busts the cache exactly when it
 * should and never otherwise.
 *
 * Netlify runs this automatically (see `command` in netlify.toml). No
 * dependencies, no install step.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const PAGES = ['index.html', '404.html'];

const hash = (p) => createHash('md5').update(readFileSync(p)).digest('hex').slice(0, 8);

let changed = 0;
for (const page of PAGES) {
  const file = join(PUBLIC, page);
  if (!existsSync(file)) continue;

  const before = readFileSync(file, 'utf8');
  // Match /assets/<css|js>/<name>.<css|js> with any existing ?v= stamp.
  const after = before.replace(
    /(\/assets\/(?:css|js)\/[A-Za-z0-9._-]+\.(?:css|js))(\?v=[a-f0-9]+)?/g,
    (full, path) => {
      const onDisk = join(PUBLIC, path);
      if (!existsSync(onDisk)) {
        console.warn(`  ! referenced but missing: ${path}`);
        return full;
      }
      return `${path}?v=${hash(onDisk)}`;
    }
  );

  if (after !== before) {
    writeFileSync(file, after);
    changed++;
  }
  for (const m of after.matchAll(/\/assets\/(?:css|js)\/([A-Za-z0-9._-]+)\?v=([a-f0-9]{8})/g))
    console.log(`  ${m[1].padEnd(16)} v=${m[2]}`);
}
console.log(`stamped ${changed} page(s)`);
