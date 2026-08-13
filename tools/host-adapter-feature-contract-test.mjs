#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DOCUMENT_ACTION_MAP,
  NAMESPACE_MAP,
  PERSONAL_TOOL_MAP,
  SIDEBAR_TOOLBOX_MAP
} from '../lib/legacyHostAdapterPolicy.js';
import {
  SEARCH_SUGGEST_CONTAINER_ID,
  normalizeTheTreeSuggestions
} from '../lib/adapters/thetree-search-suggest.js';
import {
  SETTINGS_TOGGLE_ATTRIBUTE,
  isSettingsToggleTarget,
  settingsToggleAttributes
} from '../lib/adapters/thetree-settings.js';
import { makeLegacyFooterTemplateData } from '../lib/legacyFooterData.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const row = (map, id) => map.find((candidate) => candidate.id === id);

assert.deepEqual(PERSONAL_TOOL_MAP.map((mapping) => mapping.id), [
  'personal.anonymous-user',
  'personal.anonymous-talk',
  'personal.anonymous-settings',
  'personal.anonymous-contributions',
  'personal.login',
  'personal.userpage',
  'personal.notifications',
  'personal.user-talk',
  'personal.settings',
  'personal.member-info',
  'personal.watchlist',
  'personal.contributions',
  'personal.logout'
]);
assert.equal(row(PERSONAL_TOOL_MAP, 'personal.notifications').source.route, '/member/notifications');
assert.equal(row(PERSONAL_TOOL_MAP, 'personal.anonymous-talk').transform.kind, 'user-discussion');
assert.equal(row(PERSONAL_TOOL_MAP, 'personal.settings').transform.kind, 'settings-action');
assert.equal(row(PERSONAL_TOOL_MAP, 'personal.anonymous-contributions').source.requires, 'uuid');

const revisionContexts = Object.fromEntries([
  ...DOCUMENT_ACTION_MAP,
  ...NAMESPACE_MAP
].map((mapping) => [mapping.id, mapping.transform.revisionContext || null]));
assert.deepEqual(revisionContexts, {
  'document.action.view': 'uuid',
  'document.action.edit': null,
  'document.action.history': 'from',
  'document.action.watchstar': null,
  'document.action.backlink': null,
  'document.action.acl': null,
  'document.action.raw': 'uuid',
  'document.action.blame': 'uuid',
  'document.action.move': null,
  'document.action.delete': null,
  'namespace.subject': 'uuid',
  'namespace.talk': null
});

assert.ok(row(SIDEBAR_TOOLBOX_MAP, 'toolbox.orphanedcategories'));
assert.equal(row(SIDEBAR_TOOLBOX_MAP, 'toolbox.randompage-list').source.route, '/RandomPage');
assert.equal(
  row(SIDEBAR_TOOLBOX_MAP, 'toolbox.relevant-user-contributions').transform.kind,
  'relevant-user-contribution'
);
assert.deepEqual(row(SIDEBAR_TOOLBOX_MAP, 'toolbox.relevant-user-contributions').source.fields, [
  'page.data.user.uuid',
  'page.data.account.uuid',
  'session.account.uuid for own user document'
]);

const settingsAttributes = settingsToggleAttributes();
assert.ok(settingsAttributes.some(({ key, value }) => key === SETTINGS_TOGGLE_ATTRIBUTE && value === '1'));
const settingsAnchor = { marker: 'settings' };
assert.equal(isSettingsToggleTarget({ closest: () => settingsAnchor }), settingsAnchor);
assert.equal(isSettingsToggleTarget(null), null);

assert.deepEqual(
  normalizeTheTreeSuggestions([' 문서 ', '', '문서', '분류:테스트', null], 10),
  ['문서', '분류:테스트']
);
assert.deepEqual(normalizeTheTreeSuggestions({ 0: '가', 1: '나' }, 1), ['가']);
assert.equal(SEARCH_SUGGEST_CONTAINER_ID, 'tt-vector-search-suggestions');

const footerInfo = { id: 'footer-info', 'array-items': [] };
const footerPlaces = { id: 'footer-places', 'array-items': [] };
const footerIcons = { id: 'footer-icons', 'array-items': [] };
assert.deepEqual(makeLegacyFooterTemplateData({
  info: footerInfo,
  places: footerPlaces,
  icons: footerIcons
}), {
  'data-info': footerInfo,
  'data-places': footerPlaces,
  'data-icons': footerIcons
});

const adapterSource = read('lib/legacyTheTreeAdapter.js');
assert.match(adapterSource, /makeUserDocumentTarget\(context, userName, accountType = 1\)/);
assert.match(adapterSource, /accountType === 1 \? '사용자' : '아이피사용자'/);
assert.match(adapterSource, /revisionContext === 'uuid'/);
assert.match(adapterSource, /revisionContext === 'from'/);
assert.match(adapterSource, /pageData\.discuss_progress/);
assert.match(adapterSource, /getRelevantUserUuid/);
assert.match(adapterSource, /settingsToggleAttributes\(\)/);
assert.match(adapterSource, /context\.session\?\.notifications/);

const skinDataSource = read('lib/legacySkinData.js');
assert.match(skinDataSource, /'data-footer': footerData/);
assert.doesNotMatch(skinDataSource, /'data-footer-(?:info|places|icons)'/);

const skinSource = read('components/SkinLegacy.vue');
assert.match(skinSource, /this\.\$vfm\.show\(\{ component: VectorSettingModal \}\)/);
assert.match(skinSource, /wiki\.hide_user_document_discuss/);
assert.match(skinSource, /createTheTreeSearchSuggestRuntime/);
assert.match(skinSource, /`\/Complete\?q=\$\{encodeURIComponent\(query\)\}`/);

const vectorControllerSource = read('lib/runtime/createVectorRuntimeController.js');
assert.match(vectorControllerSource, /getVectorRuntimeOptions/);
const skinLegacyPortSource = read('lib/ports/mediawiki-vector-legacy/resources/skins.vector.legacy.js/skin-legacy.js');
assert.match(skinLegacyPortSource, /searchRuntime\.destroy\(\)/);

console.log('Host adapter feature contract passed.');
