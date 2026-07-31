/*
 * Edit-preview category surface adapter.
 *
 * This module owns only conversion of the tree edit-preview category sibling
 * surfaces into preview-local MediaWiki catlinks. Mounted article surface
 * discovery and runtime scheduling remain outside this module.
 */
import { projectParserOutputHtml } from '../legacyParserOutputTransform.js';
import {
  CATLINKS_SURFACE_ATTRIBUTE,
  EXCLUDED_CONTENT_ANCESTORS,
  OUTPUT_SIGNATURE_ATTRIBUTE,
  SOURCE_SIGNATURE_ATTRIBUTE,
  markParserOutputSurface,
  stableHtmlSignature
} from './mountedSurface.js';

export const EDIT_PREVIEW_CATEGORY_SOURCE_SELECTOR = ':scope > :is(.category, [data-tt-vector-category-source="1"])';
export const EDIT_PREVIEW_CATEGORY_OUTPUT_SELECTOR = ':scope > :is(#catlinks.catlinks, .catlinks)[data-tt-article-compiler="categories"]';
export const EDIT_PREVIEW_CATEGORY_ATTRIBUTE = 'data-tt-vector-edit-preview-category';

function parseHtmlNodes(html) {
  const template = document.createElement('template');
  template.innerHTML = String(html || '').trim();
  return Array.from(template.content.childNodes || []);
}

function findCatlinksElement(nodes) {
  for (const node of nodes) {
    if (node.nodeType !== 1) continue;
    if (node.matches?.('#catlinks.catlinks, .catlinks')) return node;
    const nested = node.querySelector?.('#catlinks.catlinks, .catlinks');
    if (nested) return nested;
  }
  return null;
}

function sanitizeEditPreviewCatlinks(catlinks, sourceSignature, outputSignature) {
  if (!catlinks || catlinks.nodeType !== 1) return null;
  catlinks.removeAttribute('id');
  catlinks.classList.add('catlinks');
  catlinks.setAttribute(EDIT_PREVIEW_CATEGORY_ATTRIBUTE, '1');
  catlinks.setAttribute(CATLINKS_SURFACE_ATTRIBUTE, '1');
  catlinks.setAttribute(SOURCE_SIGNATURE_ATTRIBUTE, sourceSignature);
  catlinks.setAttribute(OUTPUT_SIGNATURE_ATTRIBUTE, outputSignature);
  const normal = catlinks.querySelector('#mw-normal-catlinks, .mw-normal-catlinks');
  if (normal) {
    normal.removeAttribute('id');
    normal.classList.add('mw-normal-catlinks');
  }
  return catlinks;
}

function categoryItemsFromCatlinks(catlinks) {
  if (!catlinks || catlinks.nodeType !== 1) return [];
  const list = catlinks.querySelector('.mw-normal-catlinks ul, #mw-normal-catlinks ul, ul');
  if (!list) return [];
  return Array.from(list.children || [])
    .filter((child) => child.nodeType === 1 && child.tagName.toLowerCase() === 'li')
    .map((item) => item.cloneNode(true));
}

function categoryItemKey(item) {
  const anchor = item.querySelector?.('a[href]');
  const href = anchor?.getAttribute('href') || '';
  return `${href}\u0000${(item.textContent || '').replace(/\s+/g, ' ').trim()}`;
}

function mergePreviewCatlinksOutputs(outputs) {
  const first = outputs.find((output) => output.catlinks);
  if (!first) return null;
  const catlinks = first.catlinks.cloneNode(true);
  sanitizeEditPreviewCatlinks(catlinks, first.sourceSignature, first.outputSignature);
  const list = catlinks.querySelector('.mw-normal-catlinks ul, ul');
  if (!list) return catlinks;
  while (list.firstChild) list.removeChild(list.firstChild);
  const seen = new Set();
  for (const output of outputs) {
    for (const item of output.items) {
      const key = categoryItemKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      list.appendChild(item);
    }
  }
  catlinks.setAttribute(SOURCE_SIGNATURE_ATTRIBUTE, outputs.map((output) => output.sourceSignature).join('|'));
  catlinks.setAttribute(OUTPUT_SIGNATURE_ATTRIBUTE, outputs.map((output) => output.outputSignature).join('|'));
  return catlinks;
}

function editPreviewCategorySources(surface) {
  if (!surface || typeof surface.querySelectorAll !== 'function') return [];
  return Array.from(surface.querySelectorAll(EDIT_PREVIEW_CATEGORY_SOURCE_SELECTOR)).filter((element) => {
    if (!element || element.nodeType !== 1) return false;
    if (element.matches(EDIT_PREVIEW_CATEGORY_OUTPUT_SELECTOR)) return false;
    return !element.closest(EXCLUDED_CONTENT_ANCESTORS);
  });
}

function existingEditPreviewCategoryOutputs(surface) {
  if (!surface || typeof surface.querySelectorAll !== 'function') return [];
  return Array.from(surface.querySelectorAll(EDIT_PREVIEW_CATEGORY_OUTPUT_SELECTOR));
}

function insertPreviewCatlinks(surface, catlinks, surfaceContract = null) {
  if (!surface || !catlinks) return false;
  markParserOutputSurface(surface, surfaceContract);
  const content = Array.from(surface.children || []).find((child) => {
    if (child.nodeType !== 1) return false;
    return child.matches?.('.wiki-content, [data-tt-vector-wiki-content-host="1"]');
  });
  if (content) {
    content.insertAdjacentElement('afterend', catlinks);
  } else {
    surface.appendChild(catlinks);
  }
  return true;
}

function getLang(options = {}) {
  return options.lang
    || document.documentElement.getAttribute('lang')
    || 'ko';
}

function getConfig(options = {}) {
  return options.config && typeof options.config === 'object' ? options.config : {};
}

function getMessages(options = {}) {
  return options.messages && typeof options.messages === 'object' ? options.messages : null;
}

export function transformEditPreviewCategorySurface(surface, options = {}, surfaceContract = null) {
  markParserOutputSurface(surface, surfaceContract);
  const sources = editPreviewCategorySources(surface);
  if (!sources.length) {
    for (const output of existingEditPreviewCategoryOutputs(surface)) {
      output.setAttribute(CATLINKS_SURFACE_ATTRIBUTE, '1');
      output.setAttribute(EDIT_PREVIEW_CATEGORY_ATTRIBUTE, '1');
    }
    return { changed: 0, visited: 0, signature: 'preview-categories-none' };
  }

  const outputs = [];
  const signatures = [];
  for (const source of sources) {
    const before = source.outerHTML;
    const sourceSignature = stableHtmlSignature(before);
    const after = projectParserOutputHtml(before, {
      lang: getLang(options),
      config: getConfig(options),
      messages: getMessages(options),
      hasStructuredCategories: false,
      parserOutputRoot: false
    });
    const outputSignature = stableHtmlSignature(after);
    signatures.push(`${sourceSignature}:${outputSignature}`);
    const nodes = parseHtmlNodes(after);
    const catlinks = findCatlinksElement(nodes);
    if (!catlinks) continue;
    sanitizeEditPreviewCatlinks(catlinks, sourceSignature, outputSignature);
    outputs.push({
      catlinks,
      items: categoryItemsFromCatlinks(catlinks),
      sourceSignature,
      outputSignature
    });
  }

  if (!outputs.length) {
    for (const source of sources) {
      source.setAttribute(SOURCE_SIGNATURE_ATTRIBUTE, stableHtmlSignature(source.outerHTML));
    }
    return {
      changed: 0,
      visited: sources.length,
      signature: sources.length ? signatures.join('|') : 'preview-categories-none'
    };
  }

  for (const output of existingEditPreviewCategoryOutputs(surface)) output.remove();
  for (const source of sources) source.remove();

  const catlinks = mergePreviewCatlinksOutputs(outputs);
  if (catlinks) insertPreviewCatlinks(surface, catlinks, surfaceContract);

  return {
    changed: sources.length,
    visited: sources.length,
    signature: sources.length ? signatures.join('|') : 'preview-categories-none'
  };
}
