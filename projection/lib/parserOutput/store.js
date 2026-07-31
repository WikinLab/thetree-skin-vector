/*
 * Store-owned ordinary article HTML transform boundary.
 *
 * The the tree frontend ordinary wiki view reads all WikiContent HTML from
 * $store.state.viewData with the exact mapping:
 *
 *   viewData.contentHtml    -> WikiContent.content
 *   viewData.topDocument    -> WikiContent.topHtml
 *   viewData.bottomDocument -> WikiContent.bottomHtml
 *
 * The layout installs this compiler in created() and synchronizes it before
 * updates, so those three source fields are compiled before WikiContent v-html
 * renders them. No page.data/document fallback target is part of this contract.
 */

import { makeLegacyMediaWikiLanguageContext } from '../../../lib/legacyMediaWikiMessages.js';
import { hasLegacyStructuredCategoriesFromStore } from '../legacyCategoryContract.js';
import { CONTENT_HTML_FIELDS } from './grammar.js';
import { stableHtmlSignature } from './signature.js';

const STORE_TRANSFORM_CACHE = new WeakMap();

function mediaWikiLanguageContext(lang, options = {}) {
  return makeLegacyMediaWikiLanguageContext({ lang, ...options });
}

function transformOptionsSignature(options = {}) {
  const languageContext = mediaWikiLanguageContext(options.lang || 'ko', {
    config: options.config || {},
    messages: options.messages || null
  });
  const messages = languageContext.messages || {};
  return [
    options.parserOutputRoot ? 'root' : 'fragment',
    options.hasStructuredCategories ? 'structured-categories' : 'source-categories',
    options.textExtractsMode ? 'extracts' : 'article',
    languageContext.htmlCode,
    languageContext.dir,
    messages.tocTitle,
    messages.hide,
    messages.show,
    messages.edit,
    messages.backlink,
    messages.categories
  ].map((value) => String(value ?? '')).join('\u001f');
}

function cacheBucketForTarget(target) {
  let bucket = STORE_TRANSFORM_CACHE.get(target);
  if (!bucket) {
    bucket = new Map();
    STORE_TRANSFORM_CACHE.set(target, bucket);
  }
  return bucket;
}

function readStoreTransformCache(target, field) {
  const bucket = STORE_TRANSFORM_CACHE.get(target);
  return bucket ? bucket.get(field) || null : null;
}

function writeStoreTransformCache(target, field, entry) {
  cacheBucketForTarget(target).set(field, Object.freeze({ ...entry }));
}

function getStoreLang(storeState) {
  const config = storeState?.config || {};
  return config.lang || config['wiki.lang'] || storeState?.viewData?.lang || storeState?.page?.data?.lang || 'ko';
}

export const STORE_ARTICLE_HTML_TARGETS = Object.freeze([
  Object.freeze(['viewData'])
]);

function readPath(root, path) {
  return path.reduce((node, key) => (node && typeof node === 'object' ? node[key] : null), root);
}

function pathLabel(path, field) {
  return `$store.state.${[...path, field].join('.')}`;
}

function writeTransformedFields(target, path, options, transformHtmlFragment) {
  const result = { changed: 0, visited: [], changedPaths: [] };
  if (!target || typeof target !== 'object') return result;
  for (const field of CONTENT_HTML_FIELDS) {
    if (typeof target[field] !== 'string') continue;
    const label = pathLabel(path, field);
    result.visited.push(label);
    const fieldOptions = {
      ...options,
      config: options.config || {},
      messages: options.messages || null,
      parserOutputRoot: field === 'contentHtml'
    };
    const before = target[field];
    const beforeSignature = stableHtmlSignature(before);
    const optionsSignature = transformOptionsSignature(fieldOptions);
    const cached = readStoreTransformCache(target, field);
    if (cached
      && cached.outputSignature === beforeSignature
      && cached.optionsSignature === optionsSignature) {
      continue;
    }
    const next = transformHtmlFragment(before, fieldOptions);
    const afterSignature = stableHtmlSignature(next);
    writeStoreTransformCache(target, field, {
      outputSignature: afterSignature,
      optionsSignature
    });
    if (next !== before) {
      target[field] = next;
      result.changed += 1;
      result.changedPaths.push(label);
    }
  }
  return result;
}

export function collectLegacyParserOutputStoreTargets(storeState) {
  if (!storeState || typeof storeState !== 'object') return [];
  const seen = new WeakSet();
  return STORE_ARTICLE_HTML_TARGETS
    .map((path) => ({ path, target: readPath(storeState, path) }))
    .filter(({ target }) => {
      if (!target || typeof target !== 'object') return false;
      if (seen.has(target)) return false;
      seen.add(target);
      return CONTENT_HTML_FIELDS.some((field) => typeof target[field] === 'string');
    });
}

export function applyLegacyParserOutputTransformToStore(storeState, transformHtmlFragment) {
  if (!storeState || typeof storeState !== 'object') {
    return { changed: 0, signature: 'none', visitedPaths: [], changedPaths: [] };
  }
  const config = storeState?.config || {};
  const options = {
    lang: getStoreLang(storeState),
    config,
    messages: config.mediaWikiMessages || config.mediawikiMessages || config.messages || config.i18nMessages || config['wiki.messages'] || null,
    hasStructuredCategories: hasLegacyStructuredCategoriesFromStore(storeState)
  };
  const aggregate = { changed: 0, visitedPaths: [], changedPaths: [] };
  for (const { target, path } of collectLegacyParserOutputStoreTargets(storeState)) {
    const result = writeTransformedFields(target, path, options, transformHtmlFragment);
    aggregate.changed += result.changed;
    aggregate.visitedPaths.push(...result.visited);
    aggregate.changedPaths.push(...result.changedPaths);
  }
  const scope = aggregate.visitedPaths.length ? aggregate.visitedPaths.length : 0;
  return {
    changed: aggregate.changed,
    signature: aggregate.changed ? `compiler-changed-${aggregate.changed}-of-${scope}` : `compiler-stable-${scope}`,
    visitedPaths: aggregate.visitedPaths,
    changedPaths: aggregate.changedPaths
  };
}

export function subscribeLegacyParserOutputTransformToStore(store, storeState, onResult, transformHtmlFragment) {
  if (!store || typeof store.subscribe !== 'function') return null;
  let running = false;
  const run = () => {
    if (running) return { changed: 0, signature: 'compiler-reentrant-skip', visitedPaths: [], changedPaths: [] };
    running = true;
    try {
      const result = applyLegacyParserOutputTransformToStore(storeState || store.state, transformHtmlFragment);
      if (typeof onResult === 'function') onResult(result);
      return result;
    } finally {
      running = false;
    }
  };
  return store.subscribe(() => {
    run();
  });
}
