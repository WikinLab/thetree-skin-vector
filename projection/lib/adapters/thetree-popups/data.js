/*
 * the tree -> Popups runtime data boundary.
 *
 * This file exposes only stable configuration values to the Popups bridge.  It
 * does not inspect rendered DOM and it does not try alternate host data shapes.
 */
import { getLegacyDocument } from '../../../../lib/legacyTheTreeAdapter.js';
import popupsMessagesEn from '../../../../vendor/mediawiki-popups/i18n/en.json';
import popupsMessagesKo from '../../../../vendor/mediawiki-popups/i18n/ko.json';
import citeReferencePreviewMessagesKo from '../../../../vendor/mediawiki-cite/i18n/ko-reference-previews.json';

function stripMessageMetadata(messages = {}) {
  return Object.fromEntries(
    Object.entries(messages).filter(([key]) => key !== '@metadata')
  );
}

const upstreamPopupsMessages = Object.freeze({
  ...stripMessageMetadata(popupsMessagesEn),
  ...stripMessageMetadata(popupsMessagesKo)
});

const upstreamCiteReferencePreviewMessages = Object.freeze(stripMessageMetadata(citeReferencePreviewMessagesKo));

const defaultMessages = Object.freeze({
  ...upstreamPopupsMessages,
  ...upstreamCiteReferencePreviewMessages,
  noPreview: upstreamPopupsMessages['popups-preview-no-preview'],
  read: upstreamPopupsMessages['popups-preview-footer-read'],
  settingsTitle: upstreamPopupsMessages['popups-settings-title']
});

function stringConfig(config = {}, key, fallback = '') {
  const value = config[key];
  return typeof value === 'string' ? value : fallback;
}

function arrayConfig(config = {}, key, fallback = []) {
  return Array.isArray(config[key]) ? config[key].slice() : fallback.slice();
}

function objectConfig(config = {}, key, fallback = {}) {
  const value = config[key];
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : { ...fallback };
}

function isMainDocumentNamespace(namespaceValue, context = {}) {
  if (namespaceValue === null || namespaceValue === undefined || namespaceValue === '') return true;
  if (typeof namespaceValue === 'number') return namespaceValue === 0;
  const namespaceText = String(namespaceValue);
  if (/^0$/.test(namespaceText)) return true;
  if (namespaceText === '문서' || namespaceText.toLowerCase() === 'main') return true;

  const namespaceIds = context.config?.namespaceIds;
  if (namespaceIds && Object.prototype.hasOwnProperty.call(namespaceIds, namespaceText)) {
    return namespaceIds[namespaceText] === 0;
  }

  return false;
}

function makeCurrentPageName(context = {}) {
  const document = getLegacyDocument(context);
  if (!document || typeof document.title !== 'string') return '';

  const namespaceValue = document.namespace
    ?? document.namespaceName
    ?? document.namespace_name
    ?? document.nsName
    ?? document.namespaceId
    ?? document.namespace_id
    ?? document.ns;

  if (isMainDocumentNamespace(namespaceValue, context)) {
    return document.title;
  }

  return `${String(namespaceValue)}:${document.title}`;
}

export function makeTheTreePopupsRuntimeData(context = {}) {
  const config = context.config || {};
  const pageContract = context.pageContract || {};
  const messages = objectConfig(config, 'popupsMessages', {});

  return Object.freeze({
    enabled: pageContract.isArticle === true,
    rootSelector: '#mw-content-text',
    articlePath: stringConfig(config, 'articlePath', '/w/$1'),
    scriptPath: stringConfig(config, 'scriptPath', '/w/index.php'),
    pageName: makeCurrentPageName(context),
    contentNamespaces: arrayConfig(config, 'contentNamespaces', [0]),
    namespaceIds: objectConfig(config, 'namespaceIds', {}),
    languageCode: stringConfig(config, 'contentLanguage', 'ko'),
    languageDirection: stringConfig(config, 'contentDirection', 'ltr'),
    summaryEndpoint: stringConfig(config, 'popupsSummaryEndpoint', ''),
    mediaWikiApiEndpoint: stringConfig(config, 'popupsMediaWikiApiEndpoint', ''),
    acceptLanguage: stringConfig(config, 'popupsAcceptLanguage', stringConfig(config, 'contentLanguage', 'ko')),
    textExtractsIntroOnly: config.popupsTextExtractsIntroOnly !== false,
    extractLength: Number.isFinite(config.popupsExtractLength) ? config.popupsExtractLength : 525,
    thumbnailSize: Number.isFinite(config.popupsThumbnailSize) ? config.popupsThumbnailSize : 0,
    messages: Object.freeze({ ...defaultMessages, ...messages }),
    config: Object.freeze({
      wgPopupsGateway: stringConfig(config, 'popupsSummaryEndpoint', '') ? 'theTreeSummary' : 'none',
      wgPopupsRestGatewayEndpoint: stringConfig(config, 'popupsSummaryEndpoint', ''),
      wgPopupsTextExtractsIntroOnly: config.popupsTextExtractsIntroOnly !== false,
      wgPopupsVirtualPageViews: false,
      wgCiteReferencePreviewsActive: pageContract.isArticle === true
    })
  });
}
