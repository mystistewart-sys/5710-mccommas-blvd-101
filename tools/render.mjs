/* A very small template renderer. No dependencies, no build toolchain.
 *
 *   {{a.b}}            escaped value
 *   {{{a.b}}}          raw HTML (use only for values you control)
 *   {{#each list}}     repeat a block; inside, {{.}} is the item,
 *     {{prop}} {{.}}     {{prop}} reads a property of it, {{@index}} the
 *   {{/each}}            0-based position, {{@number}} a 2-digit ordinal
 *   {{#if a.b}}…{{else}}…{{/if}}   omit or include a block
 *
 * Missing keys throw rather than rendering an empty string — a listing page
 * that silently drops a price is worse than a build that fails loudly.
 */
const MISSING = Symbol('missing');

export function lookup(ctx, path) {
  if (path === '.' || path === 'this') return ctx.$item !== undefined ? ctx.$item : ctx;
  let cur = ctx.$item !== undefined && !(path in ctx) ? ctx.$item : ctx;
  for (const part of path.split('.')) {
    if (cur == null || typeof cur !== 'object' || !(part in cur)) {
      // fall back to the root scope so loops can still reach global values
      cur = ctx.$root;
      for (const p2 of path.split('.')) {
        if (cur == null || typeof cur !== 'object' || !(p2 in cur)) return MISSING;
        cur = cur[p2];
      }
      return cur;
    }
    cur = cur[part];
  }
  return cur;
}

const esc = (v) => String(v).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function must(val, path, where) {
  if (val === MISSING) throw new Error(`Template referenced "${path}" but the listing data has no such field (${where}).`);
  if (val == null) throw new Error(`Template referenced "${path}" but it is null/undefined (${where}).`);
  return val;
}

export function render(tpl, data, where = 'template') {
  const ctx = { ...data, $root: data };
  return renderScope(tpl, ctx, where);
}

function renderScope(tpl, ctx, where) {
  let out = tpl;

  // {{#each list}} … {{/each}}  (innermost first so nesting works)
  let guard = 0;
  while (/\{\{#each\s+([\w.$]+)\}\}/.test(out)) {
    if (++guard > 200) throw new Error('each: runaway nesting');
    out = out.replace(/\{\{#each\s+([\w.$]+)\}\}((?:(?!\{\{#each)[\s\S])*?)\{\{\/each\}\}/,
      (_m, path, body) => {
        const list = must(lookup(ctx, path), path, where);
        if (!Array.isArray(list)) throw new Error(`"${path}" is not a list (${where}).`);
        return list.map((item, i) => {
          const scope = { ...ctx, $item: item, '@index': i, '@number': String(i + 1).padStart(2, '0') };
          if (item && typeof item === 'object' && !Array.isArray(item)) Object.assign(scope, item);
          return renderScope(body, scope, where);
        }).join('');
      });
  }

  // {{#if x}} … {{else}} … {{/if}}
  guard = 0;
  while (/\{\{#if\s+([\w.$]+)\}\}/.test(out)) {
    if (++guard > 200) throw new Error('if: runaway nesting');
    out = out.replace(/\{\{#if\s+([\w.$]+)\}\}((?:(?!\{\{#if)[\s\S])*?)\{\{\/if\}\}/,
      (_m, path, body) => {
        const v = lookup(ctx, path);
        const truthy = v !== MISSING && v != null && v !== false && v !== '' &&
                       !(Array.isArray(v) && v.length === 0);
        const [yes, no] = body.split(/\{\{else\}\}/);
        return renderScope(truthy ? yes : (no || ''), ctx, where);
      });
  }

  out = out.replace(/\{\{\{\s*([\w.@$]+)\s*\}\}\}/g, (_m, p) => String(must(lookup(ctx, p), p, where)));
  out = out.replace(/\{\{\s*([\w.@$]+)\s*\}\}/g,   (_m, p) => esc(must(lookup(ctx, p), p, where)));
  return out;
}
