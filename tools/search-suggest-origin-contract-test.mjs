#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFirstPhpArrayAfter } from './php-array-literal.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(read(relativePath));

const contract = readJson('contracts/resource-loader-origin-contract.json');
assert.equal(contract.schema, 12);

const records = Object.fromEntries(contract.modules.map((record) => [record.name, record]));
for (const name of ['jquery.suggestions', 'mediawiki.searchSuggest']) {
  assert.equal(records[name].metadata, 'vendor/mediawiki-core/resources/Resources.php');
  assert.equal(records[name].metadataFormat, 'php-array');
  assert.equal(records[name].ownership, 'global');
}

const resources = read('vendor/mediawiki-core/resources/Resources.php');
const jqueryModule = parseFirstPhpArrayAfter(resources, "'jquery.suggestions' =>");
const searchModule = parseFirstPhpArrayAfter(resources, "'mediawiki.searchSuggest' =>");
assert.equal(jqueryModule.styles, 'resources/src/jquery/jquery.suggestions.less');
assert.equal(jqueryModule.dependencies, 'jquery.highlightText');
assert.equal(searchModule.styles, 'resources/src/mediawiki.searchSuggest/searchSuggest.css');
assert.ok(searchModule.dependencies.includes('jquery.suggestions'));
assert.ok(searchModule.messages.includes('searchsuggest-containing'));

const runtimePhase = contract.pageStyleQueue.phases.find((phase) => phase.id === 'runtime-on-demand-module-styles');
assert.ok(runtimePhase.sources.some((source) => source.kind === 'php-module-definition' && source.module === 'mediawiki.searchSuggest'));
assert.ok(contract.messageCatalog.includeMessages.includes('searchsuggest-containing'));

const jqueryCss = read('css/vendor/resource-loader/jquery.suggestions.css');
const searchCss = read('css/vendor/resource-loader/mediawiki.searchSuggest.css');
const pageStyles = read('css/vendor/resource-loader/page-styles.css');
assert.match(jqueryCss, /\.suggestions\s*\{/);
assert.match(jqueryCss, /padding:\s*0\.01em 0\.25em/);
assert.match(jqueryCss, /background-color:\s*#2a4b8d/);
assert.match(jqueryCss, /\.highlight\s*\{[^}]*font-weight:\s*bold/s);
assert.match(searchCss, /a\.mw-searchSuggest-link/);
assert.ok(pageStyles.indexOf('jquery.suggestions.css') < pageStyles.indexOf('mediawiki.searchSuggest.css'));

const adapterCss = read('css/vector-adapter.css');
assert.doesNotMatch(adapterCss, /\.suggestions(?:-|\s|\{)/);

const runtime = read('lib/adapters/thetree-search-suggest.js');
for (const token of [
  'mw-searchSuggest-link',
  'special-label',
  'special-query',
  'suggestions-result-current',
  "createElement('span')",
  'documentRoot.body.appendChild(container)',
  "addEventListener('input'"
]) assert.match(runtime, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.doesNotMatch(runtime, /suggestions-special-item/);

const messages = readJson('lib/generated/mediawiki-less-messages.json');
assert.equal(messages.languages.ko.messages['searchsuggest-containing'], '다음 어구를 포함하는 문서 검색');

const manifest = readJson('ORIGIN-MANIFEST.json');
const vendorPaths = new Set(manifest.sourceInventory.vendorFiles.map((entry) => entry.path));
for (const source of [
  'vendor/mediawiki-core/resources/src/jquery/jquery.highlightText.js',
  'vendor/mediawiki-core/resources/src/jquery/jquery.suggestions.js',
  'vendor/mediawiki-core/resources/src/jquery/jquery.suggestions.less',
  'vendor/mediawiki-core/resources/src/mediawiki.searchSuggest/searchSuggest.js',
  'vendor/mediawiki-core/resources/src/mediawiki.searchSuggest/searchSuggest.css'
]) assert.ok(vendorPaths.has(source));
const runtimePort = manifest.sourceInventory.portedFiles.find((entry) => entry.path === 'lib/adapters/thetree-search-suggest.js');
assert.equal(runtimePort.relation, 'many-upstream-files-to-one-local-port');
assert.ok(runtimePort.differenceClasses.includes('host-search-api'));
assert.ok(runtimePort.differenceClasses.includes('ime-input-compatibility'));

console.log('Search suggestion origin contract passed.');
