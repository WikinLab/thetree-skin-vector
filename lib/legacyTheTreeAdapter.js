/*
 * the tree -> REL1_46 Vector legacy data adapter boundary.
 *
 * Components should not infer MediaWiki template data directly from Pinia store
 * shapes.  They should first build this normalized context, then call the
 * upstream-shaped adapter helpers below.  This keeps unavoidable the tree
 * differences in one compatibility layer instead of spreading them across
 * Mustache-shaped Vue component ports.
 */

import {
  DOCUMENT_ACTION_MAP,
  NAMESPACE_MAP,
  PERSONAL_TOOL_MAP,
  SEARCH_TARGET_POLICY,
  SIDEBAR_NAVIGATION_MAP,
  SIDEBAR_TOOLBOX_MAP,
  featureRowsForPortlet,
  getConfiguredString
} from './legacyHostAdapterPolicy';
import { getLegacyPageContract, makeLegacyPageContract } from './legacyPageContract';
import { insertDarkModePersonalTool } from './adapters/mediawiki-darkmode';
import skinProfile from './skinProfile';

export function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function makeTheTreeAdapterContext({ storeState = {}, route = {}, linkBuilders = {} } = {}) {
  const page = storeState.page || {};
  const pageData = page.data || {};
  const config = storeState.config || {};
  const session = storeState.session || {};
  const baseContext = {
    page,
    pageData,
    viewData: storeState.viewData || {},
    config,
    session,
    localConfig: storeState.localConfig || {},
    currentTheme: storeState.currentTheme || 'light',
    route,
    linkBuilders
  };

  return {
    ...baseContext,
    pageContract: makeLegacyPageContract(baseContext)
  };
}

export function getLegacyPageData(context = {}) {
  return context.pageData || context.page?.data || {};
}


export function getLegacyDocument(context = {}) {
  return getLegacyPageData(context).document || null;
}

export function hasLegacyDocument(context = {}) {
  return !!getLegacyDocument(context);
}

export function getLegacyAccount(context = {}) {
  return context.session?.account || {};
}

export function isLegacyAccountLoggedIn(context = {}) {
  return getLegacyAccount(context).type === 1;
}

export function getRedirectPath(context = {}) {
  return context.route?.fullPath || '/';
}

export function getLegacySearchQuery(context = {}) {
  return context.route?.query?.q || '';
}

function callBuilder(context, name, ...args) {
  const fn = context.linkBuilders?.[name];
  return typeof fn === 'function' ? fn(...args) : null;
}

function hasItemTarget(item = {}) {
  return !!(item.to || item.href || item.arrayLinks?.length);
}

function normalizeAdapterItem(item = {}, index = 0, prefix = 'item') {
  if (!item || item.hidden === true || item.disabled === true) return null;
  const label = typeof item.label === 'string' ? item.label : '';
  if (!label) return null;

  const normalized = {
    ...item,
    id: item.id || `${prefix}-${index}`,
    label,
    text: item.text || label,
    to: item.to || null,
    href: item.href || null,
    selected: !!item.selected,
    collapsible: !!item.collapsible,
    watchlink: !!item.watchlink,
    watchlinkTemp: !!item.watchlinkTemp
  };

  if (!hasItemTarget(normalized)) {
    delete normalized.to;
    delete normalized.href;
  }

  return normalized;
}

function normalizeAdapterItems(items = [], prefix = 'item') {
  const seen = new Set();
  return ensureArray(items)
    .map((item, index) => normalizeAdapterItem(item, index, prefix))
    .filter(Boolean)
    .filter((item) => {
      const key = item.id || `${item.text}-${item.href || item.to || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function makeUserDocumentTarget(context, userName) {
  return callBuilder(context, 'userDocument', userName) || { namespace: '사용자', title: userName || '' };
}

export function makeDocumentActionTarget(context, documentOrTitle, action) {
  return callBuilder(context, 'documentAction', documentOrTitle, action) || '/';
}

export function makeContributionTarget(context, uuid) {
  return callBuilder(context, 'contribution', uuid) || '/RecentChanges';
}

function mappedLabel(mapping, accountName = '') {
  if (mapping.target.labelSource === 'accountName') return accountName;
  return mapping.target.labelFallback || '';
}

function mappedPersonalTarget(context, mapping, account) {
  switch (mapping.transform.kind) {
    case 'no-target':
      return null;
    case 'login-with-redirect':
      return { path: mapping.source.route, query: { redirect: getRedirectPath(context) } };
    case 'logout-with-redirect':
      return { path: mapping.source.route, query: { redirect: getRedirectPath(context) } };
    case 'static-route':
      return mapping.source.route;
    case 'user-document':
      return makeDocumentActionTarget(
        context,
        makeUserDocumentTarget(context, account.name || account.username || ''),
        SEARCH_TARGET_POLICY.goAction
      );
    case 'contribution':
      return makeContributionTarget(context, account.uuid);
    default:
      return null;
  }
}

export function makePersonalToolsItems(context = {}) {
  const account = getLegacyAccount(context);
  const accountType = isLegacyAccountLoggedIn(context) ? 'logged-in' : 'anonymous';
  const accountName = account.name || account.username || '';
  const baseItems = PERSONAL_TOOL_MAP.map((mapping) => {
    if (mapping.source.accountType !== accountType) return null;
    if (mapping.source.requires === 'uuid' && !account.uuid) return null;
    if (mapping.target.labelSource === 'accountName' && !accountName) return null;

    return {
      id: mapping.target.itemId,
      label: mappedLabel(mapping, accountName),
      to: mappedPersonalTarget(context, mapping, account)
    };
  });

  const withProfile = skinProfile.decoratePersonalTools(baseItems, context);
  const withDarkMode = insertDarkModePersonalTool(withProfile, {
    theme: context.currentTheme || 'light',
    lang: context.config?.lang || context.config?.['wiki.lang'] || 'ko'
  });
  return normalizeAdapterItems(withDarkMode, `pt-${accountType}`);
}

function makeDocumentMappedItems(context, featureMap, portletKey, isSelected) {
  const document = getLegacyDocument(context);
  if (!document) return [];

  return normalizeAdapterItems(featureRowsForPortlet(featureMap, portletKey).map((mapping) => ({
    id: mapping.target.itemId,
    label: mapping.target.labelFallback,
    to: makeDocumentActionTarget(context, document, mapping.source.action),
    selected: isSelected(mapping),
    collapsible: !!mapping.target.collapsible
  })), `mapped-${portletKey}`);
}

export function makeNamespaceItems(context = {}) {
  const pageContract = getLegacyPageContract(context);
  return makeDocumentMappedItems(
    context,
    NAMESPACE_MAP,
    'data-associated-pages',
    (mapping) => mapping.target.namespaceKind === pageContract.namespaceKind
  );
}

export function makeViewItems(context = {}) {
  const pageContract = getLegacyPageContract(context);
  return makeDocumentMappedItems(
    context,
    DOCUMENT_ACTION_MAP,
    'data-views',
    (mapping) => mapping.target.itemId === pageContract.selectedActionItemId
  );
}

export function makeActionItems(context = {}) {
  const pageContract = getLegacyPageContract(context);
  return makeDocumentMappedItems(
    context,
    DOCUMENT_ACTION_MAP,
    'data-actions',
    (mapping) => mapping.target.itemId === pageContract.selectedActionItemId
  );
}

function makeStaticFeatureItems(featureMap, prefix) {
  return normalizeAdapterItems(featureMap.map((mapping) => ({
    id: mapping.target.itemId,
    label: mapping.target.labelFallback,
    to: mapping.source.route
  })), prefix);
}

export function makeSidebarNavigationItems() {
  return makeStaticFeatureItems(SIDEBAR_NAVIGATION_MAP, 'n-navigation');
}

export function makeSidebarToolboxItems() {
  return makeStaticFeatureItems(SIDEBAR_TOOLBOX_MAP, 't-toolbox');
}

function makeHostSessionMenuItem(item = {}, index = 0) {
  if (!item || item.disabled === true || item.hidden === true) return null;
  const label = typeof item.t === 'string' ? item.t : '';
  if (!label) return null;
  return {
    id: item.id || `pt-user-${index}`,
    label,
    to: item.l || null
  };
}

export function makeSidebarPersonalItems(context = {}) {
  return normalizeAdapterItems(ensureArray(context.session?.menus).map(makeHostSessionMenuItem), 'pt-user');
}

export function makeLanguageItems() {
  return [];
}

export function makeFooterPlacesHtml(context = {}) {
  return getConfiguredString(context.config || {}, 'footerPlacesHtml', '');
}


function parseFooterPlaceItemsFromHtml(html) {
  const raw = String(html || '').trim();
  if (!raw) return [];

  const itemPattern = /<li\b([^>]*)>([\s\S]*?)<\/li>/gi;
  const items = [];
  let match;
  while ((match = itemPattern.exec(raw))) {
    const attrs = match[1] || '';
    const idMatch = /\bid=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i.exec(attrs);
    items.push({
      id: idMatch?.[1] || idMatch?.[2] || idMatch?.[3] || `footer-places-item-${items.length}`,
      html: match[2] || ''
    });
  }

  if (items.length) return items;
  return [{ id: 'footer-places-the-tree', html: raw }];
}

export function makeFooterPlacesData(context = {}) {
  const html = makeFooterPlacesHtml(context);
  const arrayItems = parseFooterPlaceItemsFromHtml(html);
  if (!arrayItems.length) return null;

  return {
    id: 'footer-places',
    className: null,
    'array-items': arrayItems
  };
}

export function makeIndicatorsData(pageState = {}) {
  const pageData = pageState.data || {};
  return ensureArray(pageData.indicators).map((indicator, index) => ({
    id: indicator?.id || `mw-indicator-${index}`,
    class: indicator?.class || 'mw-indicator',
    html: indicator?.html || ''
  }));
}

export function makeDockBottomData(pageState = {}) {
  const pageData = pageState.data || {};
  const dock = pageData.dockBottom;
  if (!dock) return null;

  return {
    id: dock.id || 'mw-dock-bottom',
    class: dock.class || '',
    'array-items': ensureArray(dock.arrayItems).filter(Boolean).map((item) => {
      if (item['html-item']) return { 'html-item': item['html-item'] };
      if (item.htmlItem) return { 'html-item': item.htmlItem };
      if (!item.html) return { 'html-item': '' };
      const id = item.id ? ` id="${escapeHtml(item.id)}"` : '';
      return { 'html-item': `<li${id}>${item.html}</li>` };
    })
  };
}

export function makeLegacyFooterIconData() {
  return {
    id: 'footer-icons',
    className: null,
    'array-items': [
      { id: 'footer-poweredbyico', html: 'Vector for the tree' }
    ]
  };
}
