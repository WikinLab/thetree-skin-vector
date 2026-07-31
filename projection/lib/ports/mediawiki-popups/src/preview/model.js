/*
 * SPDX-License-Identifier: GPL-2.0-or-later
 * Modified by thetree-skin-vector, 2026-07-29 and 2026-07-30.
 * Source provenance: ORIGIN-MANIFEST.json and NOTICE.
 *
 * Popups preview model conversion.
 */
import { allowedPreviewTypes, CACHE_LIFETIME, EXTRACT_LENGTH, previewTypes } from '../constants.js';
import { bracketedPixelRatio } from '../ui/thumbnail.js';
import { titleDb, titleText } from '../../../../adapters/thetree-popups/title.js';

function escapeRegExp(value) {
  return String(value).replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

function makeTitleInExtractBold(extract, title) {
  const elements = [];
  const normalizedExtract = String(extract || '').replace(/\s+/g, ' ');
  const normalizedTitle = String(title || '').replace(/\s+/g, ' ').trim();
  if (!normalizedTitle) return [document.createTextNode(normalizedExtract)];

  const escapedTitle = escapeRegExp(normalizedTitle);
  const match = new RegExp(`(^|\\s)(${escapedTitle})(?=\\s|$)`, 'i').exec(normalizedExtract);
  if (!match) return [document.createTextNode(normalizedExtract)];

  const titleStart = match.index + match[1].length;
  const titleEnd = titleStart + match[2].length;
  if (titleStart > 0) elements.push(document.createTextNode(normalizedExtract.slice(0, titleStart)));
  const highlightNode = document.createElement('b');
  highlightNode.textContent = normalizedExtract.slice(titleStart, titleEnd);
  elements.push(highlightNode);
  if (titleEnd < normalizedExtract.length) {
    elements.push(document.createTextNode(normalizedExtract.slice(titleEnd)));
  }
  return elements;
}

export function formatPlainTextExtract(plainTextExtract, title) {
  if (plainTextExtract === undefined) return [];
  const extract = String(plainTextExtract);
  if (extract.length === 0) return [];
  return makeTitleInExtractBold(extract, title);
}

export function processExtract(extract) {
  if (extract === undefined || extract === null || extract.length === 0) {
    return undefined;
  }
  return extract;
}

function requiresSummary(type) {
  return type !== previewTypes.TYPE_GENERIC && type !== previewTypes.TYPE_DISAMBIGUATION;
}

export function getPagePreviewType(type, processedExtract) {
  if (processedExtract === undefined && requiresSummary(type)) {
    return previewTypes.TYPE_GENERIC;
  }
  switch (type) {
    case previewTypes.TYPE_GENERIC:
    case previewTypes.TYPE_DISAMBIGUATION:
    case previewTypes.TYPE_PAGE:
      return type;
    default:
      return previewTypes.TYPE_PAGE;
  }
}

export function createModel(title, url, languageCode, languageDirection, extract, type, thumbnail, pageId) {
  const processedExtract = processExtract(extract);
  const previewType = getPagePreviewType(type, processedExtract);
  return Object.freeze({
    title,
    url,
    languageCode,
    languageDirection,
    extract: processedExtract,
    type: previewType,
    thumbnail,
    pageId
  });
}

export function makeNullModel(mwTitle, popupsData, target = null) {
  return createModel(
    titleText(mwTitle),
    target && typeof target.href === 'string' ? target.href : '',
    '',
    '',
    [],
    '',
    undefined,
    undefined
  );
}

function isNodeLike(value) {
  return Boolean(value && typeof value === 'object' && typeof value.nodeType === 'number');
}

function isExtractValue(value) {
  return value === undefined
    || value === null
    || typeof value === 'string'
    || (Array.isArray(value) && value.every(isNodeLike));
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function normalizeThumbnailValue(thumbnail) {
  if (thumbnail === undefined || thumbnail === null) return undefined;
  if (typeof thumbnail !== 'object' || Array.isArray(thumbnail)) return null;
  if (typeof thumbnail.source !== 'string') return null;
  if (!isFiniteNumber(thumbnail.width) || !isFiniteNumber(thumbnail.height)) return null;
  return Object.freeze({
    source: thumbnail.source,
    width: thumbnail.width,
    height: thumbnail.height
  });
}

export function validateExternalPreviewModel(model) {
  if (!model || typeof model !== 'object' || Array.isArray(model)) return null;
  if (typeof model.title !== 'string' || model.title === '') return null;
  if (typeof model.url !== 'string' || model.url === '') return null;
  if (typeof model.languageCode !== 'string') return null;
  if (!['', 'ltr', 'rtl'].includes(model.languageDirection)) return null;
  if (typeof model.type !== 'string' || !allowedPreviewTypes.includes(model.type)) return null;
  if (!isExtractValue(model.extract)) return null;
  const thumbnail = normalizeThumbnailValue(model.thumbnail);
  if (thumbnail === null) return null;
  if (model.pageId !== undefined && !isFiniteNumber(model.pageId)) return null;
  return createModel(
    model.title,
    model.url,
    model.languageCode,
    model.languageDirection,
    model.extract,
    model.type,
    thumbnail,
    model.pageId
  );
}

export function isMediaWikiSummaryResponse(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (typeof data.title !== 'string' || data.title === '') return false;
  if (typeof data.extract !== 'string') return false;
  const desktop = data.content_urls && data.content_urls.desktop;
  if (!desktop || typeof desktop.page !== 'string' || desktop.page === '') return false;
  if (data.thumbnail !== undefined && data.thumbnail !== null && normalizeThumbnailValue(data.thumbnail) === null) {
    return false;
  }
  return true;
}

export function modelFromSummaryResponse(data, mwTitle, popupsData, target = null) {
  if (!isMediaWikiSummaryResponse(data)) return makeNullModel(mwTitle, popupsData, target);
  const extract = formatPlainTextExtract(data.extract, data.title);
  return createModel(
    data.title,
    data.content_urls.desktop.page,
    popupsData.languageCode,
    popupsData.languageDirection,
    extract,
    extract.length ? previewTypes.TYPE_PAGE : previewTypes.TYPE_GENERIC,
    normalizeThumbnailValue(data.thumbnail),
    undefined
  );
}

export function isMediaWikiApiQueryResponse(data) {
  return Boolean(
    data
      && typeof data === 'object'
      && !Array.isArray(data)
      && data.query
      && Array.isArray(data.query.pages)
      && data.query.pages.length
  );
}

export function extractPageFromMediaWikiApiResponse(data) {
  if (!isMediaWikiApiQueryResponse(data)) return null;
  return data.query.pages[0] || null;
}

function isMediaWikiApiPage(page) {
  if (!page || typeof page !== 'object' || Array.isArray(page)) return false;
  if (typeof page.title !== 'string' || page.title === '') return false;
  if (typeof page.canonicalurl !== 'string' || page.canonicalurl === '') return false;
  if (page.extract !== undefined && typeof page.extract !== 'string') return false;
  if (page.pagelanguagehtmlcode !== undefined && typeof page.pagelanguagehtmlcode !== 'string') return false;
  if (page.pagelanguagedir !== undefined && !['', 'ltr', 'rtl'].includes(page.pagelanguagedir)) return false;
  if (page.thumbnail !== undefined && page.thumbnail !== null && normalizeThumbnailValue(page.thumbnail) === null) return false;
  if (page.pageid !== undefined && !isFiniteNumber(page.pageid)) return false;
  return true;
}

export function modelFromMediaWikiApiResponse(data, mwTitle, popupsData, target = null) {
  const page = extractPageFromMediaWikiApiResponse(data);
  if (!isMediaWikiApiPage(page)) return makeNullModel(mwTitle, popupsData, target);
  const extract = formatPlainTextExtract(page.extract, page.title);
  return createModel(
    page.title,
    page.canonicalurl,
    page.pagelanguagehtmlcode || popupsData.languageCode,
    page.pagelanguagedir || popupsData.languageDirection,
    extract,
    page.type,
    normalizeThumbnailValue(page.thumbnail),
    page.pageid
  );
}

function appendQueryParam(url, key, value) {
  url.searchParams.set(key, value);
}

export function makeMediaWikiApiRequestUrl(endpoint, mwTitle, popupsData) {
  const requestUrl = new URL(endpoint, window.location.origin);
  const thumbnailSize = 320 * Math.max(bracketedPixelRatio(), 1.5);
  const params = Object.freeze({
    action: 'query',
    prop: 'info|extracts|pageimages|revisions',
    formatversion: '2',
    redirects: 'true',
    exintro: String(popupsData.textExtractsIntroOnly !== false),
    exchars: String(popupsData.extractLength || EXTRACT_LENGTH),
    explaintext: 'true',
    exsectionformat: 'plain',
    piprop: 'thumbnail',
    pithumbsize: String(popupsData.thumbnailSize || thumbnailSize),
    pilicense: 'any',
    rvprop: 'timestamp',
    inprop: 'url',
    titles: titleDb(mwTitle),
    smaxage: String(CACHE_LIFETIME),
    maxage: String(CACHE_LIFETIME),
    uselang: 'content'
  });
  Object.keys(params).forEach((key) => appendQueryParam(requestUrl, key, params[key]));
  return requestUrl.toString();
}
