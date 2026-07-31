#!/usr/bin/env node
import assert from 'node:assert/strict';
import { SKIN_VARIANT_ID, UPSTREAM_SKIN_NAME } from '../../lib/skinVariant.js';
import {
  CONTENT_PROJECTION_PROTOCOL,
  CONTENT_PROJECTION_SERVER_DATA_KEY,
  insertContentProjectionPersonalTool,
  resolveContentProjectionPreference,
  serializeContentProjectionCookie,
  toggleTheTreeContentProjection
} from '../lib/adapters/thetree-content-projection.js';
import { RUNTIME_CAPABILITIES } from '../lib/runtime/capabilities.js';
import { createExtensionRuntimeHost } from '../lib/runtime/createExtensionRuntimeHost.js';
import { normalizeLegacyStructuredCategory } from '../lib/legacyCategoryContract.js';
import { LINK_SEMANTICS } from '../lib/linkSemantics.js';
import { createLegacyParserOutputStoreRuntime } from '../lib/contentProjection/storeRuntime.js';
import { getClasses, parseHtmlFragment, serializeHtml } from '../lib/parserOutput/domAst.js';
import { isInternalWikiLink, transformExternalLink, transformInternalWikiLink } from '../lib/parserOutput/links.js';

function contextWith(enabled) {
  return {
    config: { lang: 'ko' },
    viewData: {
      [CONTENT_PROJECTION_SERVER_DATA_KEY]: {
        protocol: CONTENT_PROJECTION_PROTOCOL,
        enabled
      }
    }
  };
}

assert.equal(SKIN_VARIANT_ID, 'vector-legacy');
assert.equal(UPSTREAM_SKIN_NAME, 'vector');
assert.deepEqual(resolveContentProjectionPreference({}), {
  available: false,
  enabled: true,
  source: 'projection-default'
});
assert.equal(resolveContentProjectionPreference(contextWith(true)).enabled, true);
assert.equal(resolveContentProjectionPreference(contextWith(false)).enabled, false);
assert.equal(resolveContentProjectionPreference({ localConfig: { 'vector.content_projection': false } }).enabled, false);
assert.equal(insertContentProjectionPersonalTool([], {}).length, 1);
assert.equal(insertContentProjectionPersonalTool([], contextWith(true))[0].label, '스킨 본문 끄기');
assert.equal(insertContentProjectionPersonalTool([], contextWith(false))[0].label, '스킨 본문 켜기');
assert.match(serializeContentProjectionCookie(false), /thetree_vector_content_projection=off/);
assert.match(serializeContentProjectionCookie(true, { secure: true }), /; Secure$/);

let reloads = 0;
let storedPreference = null;
globalThis.document = { cookie: '' };
globalThis.window = {
  location: {
    protocol: 'https:',
    reload() { reloads += 1; }
  }
};
assert.equal(toggleTheTreeContentProjection(contextWith(false), {
  localConfigSetValue(key, value) {
    storedPreference = { key, value };
  }
}), true);
assert.match(globalThis.document.cookie, /thetree_vector_content_projection=on/);
assert.deepEqual(storedPreference, { key: 'vector.content_projection', value: true });
assert.equal(reloads, 1);
delete globalThis.document;
delete globalThis.window;

let extensionCreates = 0;
let extensionInits = 0;
let extensionDestroys = 0;
const extensionHost = createExtensionRuntimeHost([{
  id: 'mediawiki-popups',
  requires: [RUNTIME_CAPABILITIES.MEDIAWIKI_CONTENT_SURFACE],
  create() {
    extensionCreates += 1;
    return {
      init() { extensionInits += 1; },
      destroy() { extensionDestroys += 1; }
    };
  }
}]);
assert.deepEqual(extensionHost.init([]), []);
assert.equal(extensionCreates, 0);
assert.deepEqual(
  extensionHost.init([RUNTIME_CAPABILITIES.MEDIAWIKI_CONTENT_SURFACE]),
  ['mediawiki-popups']
);
assert.equal(extensionCreates, 1);
assert.equal(extensionInits, 1);
extensionHost.destroy();
assert.equal(extensionDestroys, 1);

const normalizedCategory = normalizeLegacyStructuredCategory({
  document: {
    namespace: '분류',
    title: '없는 분류'
  },
  notExist: true,
  blur: true
});
assert.deepEqual(normalizedCategory, {
  document: {
    namespace: '분류',
    title: '없는 분류'
  },
  notExist: true,
  blur: true
});

assert.deepEqual(LINK_SEMANTICS.missing, {
  hostClasses: ['not-exist'],
  upstreamClasses: ['new']
});
assert.deepEqual(LINK_SEMANTICS.external.hostClasses, ['wiki-link-external', 'wiki-link-whitelisted']);
assert.deepEqual(LINK_SEMANTICS.external.emittedClasses, ['external', 'text']);

const linkSources = parseHtmlFragment([
  '<a class="wiki-link-internal not-exist" href="/w/Missing">Missing</a>',
  '<a class="wiki-self-link" href="/w/Self">Self</a>',
  '<a class="wiki-link-external" href="https://example.test/">External</a>'
].join('')).children;
const preserveChild = (child) => child;
assert.equal(isInternalWikiLink(linkSources[0]), true);
assert.equal(isInternalWikiLink(linkSources[1]), true);
assert.deepEqual(getClasses(transformInternalWikiLink(linkSources[0], {}, preserveChild)), ['new']);
assert.deepEqual(getClasses(transformInternalWikiLink(linkSources[1], {}, preserveChild)), ['mw-selflink']);
assert.deepEqual(getClasses(transformExternalLink(linkSources[2], {}, preserveChild)), ['external', 'text']);

const entityRoundTrip = serializeHtml(parseHtmlFragment('<a href="/x?a=1&amp;b=2">x &amp; y</a>'));
assert.equal(entityRoundTrip, '<a href="/x?a=1&amp;b=2">x &amp; y</a>');
const quotedDelimiter = serializeHtml(parseHtmlFragment('<a title="1 > 0" href="/x">x</a>'));
assert.equal(quotedDelimiter, '<a title="1 &gt; 0" href="/x">x</a>');
assert.equal(
  serializeHtml(parseHtmlFragment('<div><p>one<div>two</div>')),
  '<div><p>one</p><div>two</div></div>'
);

let activeStoreState = {
  config: { lang: 'ko' },
  viewData: {
    contentHtml: '<p class="wiki-paragraph">첫 문서</p>',
    categories: []
  }
};
const storeRuntime = createLegacyParserOutputStoreRuntime({
  getState: () => activeStoreState,
  transformState(state) {
    const current = state.viewData.contentHtml;
    if (current.startsWith('<div data-tt-vector-parser-output="1">')) {
      return { changed: 0, signature: 'compiler-stable-1', visitedPaths: [], changedPaths: [] };
    }
    state.viewData.contentHtml = `<div data-tt-vector-parser-output="1">${current}</div>`;
    return { changed: 1, signature: 'compiler-changed-1-of-1', visitedPaths: [], changedPaths: [] };
  }
});
assert.equal(storeRuntime.init().changed, 1);
assert.match(activeStoreState.viewData.contentHtml, /data-tt-vector-parser-output="1"/);
activeStoreState = {
  config: { lang: 'ko' },
  viewData: {
    contentHtml: '<p class="wiki-paragraph">다음 문서</p>',
    categories: []
  }
};
assert.equal(storeRuntime.sync().changed, 1);
assert.match(activeStoreState.viewData.contentHtml, /data-tt-vector-parser-output="1"/);
assert.match(activeStoreState.viewData.contentHtml, /다음 문서/);
storeRuntime.destroy();

console.log('checked projection layer contract');
