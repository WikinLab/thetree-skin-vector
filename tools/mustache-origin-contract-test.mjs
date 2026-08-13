#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Mustache from 'mustache';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const templateRoot = path.join(root, 'vendor', 'mediawiki-vector-legacy', 'includes', 'templates');

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

assert.equal(
  Mustache.render('{{#items}}<{{name}}>{{/items}}', { items: [{ name: 'a' }, { name: 'b' }] }),
  '<a><b>'
);
assert.equal(
  Mustache.render('{{#wrap}}value{{/wrap}}', { wrap: () => (text, render) => `[${render(text)}]` }),
  '[value]'
);
assert.equal(
  Mustache.render('begin\n  {{> row}}\nend', {}, { row: 'x\ny' }),
  'begin\n  x\n  yend'
);

if (fs.existsSync(templateRoot)) {
  const templates = walk(templateRoot).filter((file) => file.endsWith('.mustache'));
  assert.ok(templates.length > 0, 'No materialized Vector Mustache templates were found');
  for (const template of templates) Mustache.parse(fs.readFileSync(template, 'utf8'));

  const partials = Object.fromEntries(templates.map((template) => [
    path.basename(template, '.mustache'),
    fs.readFileSync(template, 'utf8')
  ]));
  const skinLegacy = partials['skin-legacy'];
  assert.ok(skinLegacy, 'The locked Vector skin-legacy template is missing');
  const rendered = Mustache.render(skinLegacy, {
    'html-user-language-attributes': 'lang="ko"',
    'data-footer': {
      'data-info': {
        id: 'footer-info',
        className: null,
        'array-items': [{ id: 'footer-info-contract', html: 'info' }]
      },
      'data-places': {
        id: 'footer-places',
        className: null,
        'array-items': [{ id: 'footer-places-contract', html: 'place' }]
      },
      'data-icons': {
        id: 'footer-icons',
        className: null,
        'array-items': [{ id: 'footer-icons-contract', html: 'icon' }]
      }
    }
  }, partials);
  assert.match(rendered, /<footer id="footer" class="mw-footer" lang="ko">/);
  assert.match(rendered, /id="footer-info-contract">info<\/li>/);
  assert.match(rendered, /id="footer-places-contract">place<\/li>/);
  assert.match(rendered, /id="footer-icons-contract">icon<\/li>/);
}

const generator = fs.readFileSync(path.join(root, 'tools', 'mustache-vue-origin-engine.mjs'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'lib', 'mustacheVueRuntime.js'), 'utf8');
assert.match(generator, /from 'mustache'/);
assert.match(runtime, /from 'mustache'/);
assert.match(runtime, /from 'parse5'/);
assert.doesNotMatch(generator + runtime, /mustacheTemplateEngine/);

console.log('Mustache origin contract passed.');
