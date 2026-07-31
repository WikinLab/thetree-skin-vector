#!/usr/bin/env node
import assert from 'node:assert/strict';

globalThis.document = {
  createElement(tagName) {
    return { nodeType: 1, tagName: String(tagName).toUpperCase(), textContent: '' };
  },
  createTextNode(textContent) {
    return { nodeType: 3, textContent };
  }
};
globalThis.window = {
  devicePixelRatio: 1,
  location: { origin: 'https://example.test' }
};

try {
  const {
    formatPlainTextExtract,
    makeMediaWikiApiRequestUrl
  } = await import('../lib/ports/mediawiki-popups/src/preview/model.js');

  const extract = formatPlainTextExtract('Before   Main Page after', 'Main Page');
  assert.deepEqual(
    extract.map((node) => [node.nodeType, node.tagName || '', node.textContent]),
    [
      [3, '', 'Before '],
      [1, 'B', 'Main Page'],
      [3, '', ' after']
    ]
  );
  assert.deepEqual(
    formatPlainTextExtract('Main Pages', 'Main Page').map((node) => node.textContent),
    ['Main Pages']
  );

  const requestUrl = new URL(makeMediaWikiApiRequestUrl('/w/api.php', {
    getPrefixedDb() {
      return 'Main_Page';
    }
  }, {
    textExtractsIntroOnly: true,
    extractLength: 525,
    thumbnailSize: 320
  }));
  const properties = requestUrl.searchParams.get('prop').split('|');
  assert.equal(new Set(properties).size, properties.length);
  assert.equal(requestUrl.searchParams.get('titles'), 'Main_Page');
  console.log('Popups model contract test passed.');
} finally {
  delete globalThis.document;
  delete globalThis.window;
}
