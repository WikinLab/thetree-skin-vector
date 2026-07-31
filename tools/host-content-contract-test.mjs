#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { resolveResourceLoaderOriginContract } from './resource-loader-contract.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function imports(source) {
  return [...source.matchAll(/@import\s+["']([^"']+)["']\s*;/g)].map((match) => match[1]);
}

function rules(relativePath) {
  const result = [];
  postcss.parse(read(relativePath), { from: relativePath }).walkRules((rule) => {
    selectorParser().processSync(rule.selector);
    result.push(rule);
  });
  return result;
}

assert.deepEqual(imports(read('css/screen.css')), [
  './vendor/resource-loader/page-styles.css',
  './vector-adapter.css',
  './host-content.css'
]);

for (const relativePath of ['layout.vue', 'components/SkinLegacy.vue', 'lib/legacyTheTreeAdapter.js']) {
  assert.doesNotMatch(read(relativePath), /\b(?:skinProfile|contentProfile|activeContentProfile)\b/);
}
for (const relativePath of [
  'css/profile.css',
  'lib/skinProfile.js',
  'lib/runtime/createExtensionRuntimeHost.js',
  'lib/runtime/createSkinRuntimeController.js'
]) {
  assert.equal(fs.existsSync(path.join(root, relativePath)), false);
}
assert.equal(fs.existsSync(path.join(root, 'lib/runtime/createVectorRuntimeController.js')), true);
assert.match(read('components/SkinLegacy.vue'), /createVectorRuntimeController/);

assert.deepEqual(imports(read('css/host-content.css')), [
  './host-content/foundation.css',
  './host-content/links.css'
]);

const foundationSource = read('css/host-content/foundation.css');
const foundationRules = rules('css/host-content/foundation.css');
assert.ok(foundationRules.length > 0);
for (const rule of foundationRules) assert.match(rule.selector, /\[data-tt-host-content="1"\]/);
assert.match(foundationSource, /box-sizing:\s*border-box/);
assert.doesNotMatch(foundationSource, /!important/);
assert.doesNotMatch(foundationSource, /data-tt-vector/);

const linksSource = read('css/host-content/links.css');
const linkRules = rules('css/host-content/links.css');
assert.equal(linkRules.length, 1);
const linkSelectors = selectorParser().astSync(linkRules[0].selector).nodes;
assert.equal(linkSelectors.length, 5);
for (const state of ['', ':hover', ':focus', ':active', ':visited']) {
  assert.ok(linkSelectors.some((selector) => selector.toString().includes(`:where(a${state}:not(`)));
}
assert.equal(linkRules[0].nodes.length, 1);
assert.equal(linkRules[0].nodes[0].prop, 'text-decoration');
assert.equal(linkRules[0].nodes[0].value, 'none');
assert.doesNotMatch(linksSource, /\bcolor\s*:|background|content\s*:|!important/);
assert.doesNotMatch(linksSource, /data-tt-vector/);

const rawResourceLoaderContract = JSON.parse(read('contracts/resource-loader-origin-contract.json'));
const resourceLoaderContract = resolveResourceLoaderOriginContract(root, rawResourceLoaderContract);
const skinVariantContract = JSON.parse(read('contracts/skin-variant-contract.json'));
const generatedVectorCss = read('css/vendor/resource-loader/skins.vector.styles.legacy.css');

assert.equal(skinVariantContract.id, 'vector-legacy');
assert.deepEqual(resourceLoaderContract.shared.hostSurfaces, {
  hostContent: '#mw-content-text[data-tt-host-content="1"]'
});
assert.deepEqual(resourceLoaderContract.shared.ownershipPolicies.skin, {
  isolateHostContent: true
});
assert.equal(resourceLoaderContract.pageStyleQueue.profile, 'vector-legacy');
assert.match(
  generatedVectorCss,
  /:where\(:not\(#mw-content-text\[data-tt-host-content="1"\], #mw-content-text\[data-tt-host-content="1"\] \*\)\)/
);

console.log('checked host ownership and Vector chrome contract');
