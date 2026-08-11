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
  './host-content.css',
  './host-modal.css'
]);

const skinLegacySource = read('components/SkinLegacy.vue');
assert.equal(fs.existsSync(path.join(root, 'lib/runtime/createVectorRuntimeController.js')), true);
assert.match(skinLegacySource, /createVectorRuntimeController/);
assert.match(skinLegacySource, /<div v-if="siteNoticeHtml" id="siteNotice">/);
assert.match(skinLegacySource, /<div id="localNotice" data-nosnippet>/);
assert.match(skinLegacySource, /<div class="sitenotice">\s*<p v-html="siteNoticeHtml"><\/p>/);
assert.doesNotMatch(skinLegacySource, /id="siteNotice"[^>]*\bmw-body-content\b/);

assert.deepEqual(imports(read('css/host-content.css')), [
  './host-content/foundation.css',
  './host-content/links.css'
]);

const foundationSource = read('css/host-content/foundation.css');
const foundationRules = rules('css/host-content/foundation.css');
assert.ok(foundationRules.length > 0);
for (const rule of foundationRules) assert.match(rule.selector, /\[data-tt-host-content="1"\]/);
assert.match(foundationSource, /box-sizing:\s*border-box/);
const floatContainmentRule = foundationRules.find(
  (rule) => rule.selector === ':where(#mw-content-text[data-tt-host-content="1"])::after'
);
assert.ok(floatContainmentRule);
assert.deepEqual(
  Object.fromEntries(floatContainmentRule.nodes.map((node) => [node.prop, node.value])),
  { clear: 'both', content: '""', display: 'block' }
);
assert.doesNotMatch(foundationSource, /!important/);
assert.doesNotMatch(foundationSource, /data-tt-vector/);
assert.doesNotMatch(foundationSource, /submit-button|discussion|thread/);

const linksSource = read('css/host-content/links.css');
const linkRules = rules('css/host-content/links.css');
assert.equal(linkRules.length, 1);
const linkSelectors = selectorParser().astSync(linkRules[0].selector).nodes;
assert.equal(linkSelectors.length, 5);
for (const state of ['', ':hover', ':focus', ':active', ':visited']) {
  assert.ok(linkSelectors.some((selector) => selector.toString().includes(`:where(a${state})`)));
}
assert.equal(linkRules[0].nodes.length, 1);
assert.equal(linkRules[0].nodes[0].prop, 'text-decoration');
assert.equal(linkRules[0].nodes[0].value, 'none');
assert.doesNotMatch(linksSource, /\bcolor\s*:|background|content\s*:|!important/);
assert.doesNotMatch(linksSource, /data-tt-vector/);

const hostModalSource = read('css/host-modal.css');
const hostModalRules = rules('css/host-modal.css');
assert.equal(hostModalRules.length, 1);
const hostModalSelectors = selectorParser().astSync(hostModalRules[0].selector).nodes;
assert.equal(hostModalSelectors.length, 4);
for (const selector of hostModalSelectors) {
  assert.match(selector.toString(), /\.thetree-modal-container/);
}
assert.equal(hostModalRules[0].nodes.length, 1);
assert.equal(hostModalRules[0].nodes[0].prop, 'box-sizing');
assert.equal(hostModalRules[0].nodes[0].value, 'border-box');
assert.doesNotMatch(hostModalSource, /!important/);
assert.doesNotMatch(hostModalSource, /setting-block|\bheader\b|\bul\b/);

const rawResourceLoaderContract = JSON.parse(read('contracts/resource-loader-origin-contract.json'));
const resourceLoaderContract = resolveResourceLoaderOriginContract(root, rawResourceLoaderContract);
const skinVariantContract = JSON.parse(read('contracts/skin-variant-contract.json'));
const generatedVectorCss = read('css/vendor/resource-loader/skins.vector.styles.legacy.css');

assert.equal(skinVariantContract.id, 'vector-legacy');
assert.deepEqual(resourceLoaderContract.shared.hostSurfaces, {
  hostContent: '#mw-content-text[data-tt-host-content="1"]',
  hostModal: '.thetree-modal-container'
});
assert.deepEqual(resourceLoaderContract.shared.ownershipPolicies.skin, {
  isolateHostContent: true,
  excludedSurfaces: ['hostModal']
});
assert.equal(resourceLoaderContract.pageStyleQueue.profile, 'vector-legacy');
assert.match(
  generatedVectorCss,
  /:where\(:not\(#mw-content-text\[data-tt-host-content="1"\], \.thetree-modal-container, #mw-content-text\[data-tt-host-content="1"\] \*, \.thetree-modal-container \*\)\)/
);

const generatedRules = rules('css/vendor/resource-loader/skins.vector.styles.legacy.css');
const documentTitleRule = generatedRules.find((rule) => (
  rule.selector.includes('h1:where(')
  && rule.nodes.some((node) => node.type === 'decl' && node.prop === 'border-bottom')
));
assert.ok(documentTitleRule, 'Vector document title border rule must remain generated');
assert.match(documentTitleRule.selector, /\.thetree-modal-container/);
assert.doesNotMatch(documentTitleRule.selector, /\.tt-vector/);

const listIndentRule = generatedRules.find((rule) => (
  rule.selector.startsWith('ul:where(')
  && rule.nodes.some((node) => node.type === 'decl' && node.prop === 'margin-inline-start')
));
assert.ok(listIndentRule, 'Vector list indentation must remain generated for owned chrome');
assert.match(listIndentRule.selector, /\.thetree-modal-container/);

assert.doesNotMatch(
  read('css/vendor/resource-loader/ext.DarkMode.styles.css'),
  /\.thetree-modal-container/
);

const generatedResourceLoaderCss = fs.readdirSync(path.join(root, 'css', 'vendor', 'resource-loader'))
  .filter((name) => name.endsWith('.css'))
  .map((name) => read(`css/vendor/resource-loader/${name}`))
  .join('\n');
assert.doesNotMatch(generatedResourceLoaderCss, /:(?:not|where)\(\s+/);

console.log('checked host content, modal ownership, and Vector chrome contract');
