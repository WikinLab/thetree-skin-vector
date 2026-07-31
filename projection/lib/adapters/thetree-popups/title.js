/* thetree host adapters around the generated upstream Popups title module. */
import {
  getTitle,
  isValid,
  fromElement
} from '../../generated/mediawiki-popups/src/title.js';
import {
  EXCLUDED_LINK_SELECTORS,
  eligibleLinkSelector,
  eligiblePageLinkSelector,
  eligibleReferenceLinkSelector
} from '../../ports/mediawiki-popups/src/constants.js';

export {
  getTitle,
  isValid,
  fromElement,
  EXCLUDED_LINK_SELECTORS,
  eligibleLinkSelector,
  eligiblePageLinkSelector,
  eligibleReferenceLinkSelector
};

function makeConfigView(config = {}) {
  const values = Object.freeze({
    wgArticlePath: config.articlePath,
    wgPageName: config.pageName,
    wgContentNamespaces: config.contentNamespaces
  });
  return Object.freeze({
    get(key, fallback = undefined) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : fallback;
    }
  });
}

function getRuntimeConfig(config = {}) {
  if (typeof window !== 'undefined' && window.mw && window.mw.config) {
    return window.mw.config;
  }
  return makeConfigView(config);
}

export function getTitleFromHref(href, config = {}) {
  return getTitle(href, getRuntimeConfig(config));
}

export function titleFromElement(element, config = {}) {
  return fromElement(element, getRuntimeConfig(config));
}

function fragmentFromElementHref(element) {
  if (!element) return '';
  let fragment = element.hash || '';
  if (!fragment && typeof element.getAttribute === 'function') {
    const href = element.getAttribute('href') || '';
    const hashIndex = href.indexOf('#');
    fragment = hashIndex === -1 ? '' : href.slice(hashIndex);
  }
  if (!fragment) return '';
  try {
    return decodeURIComponent(fragment);
  } catch (error) {
    return fragment;
  }
}

export function titleFromReferenceElement(element, config = {}) {
  const fragment = fragmentFromElementHref(element);
  if (!fragment || fragment === '#') return null;
  const titleFactory = typeof window !== 'undefined' && window.mw ? window.mw.Title : null;
  return titleFactory && typeof titleFactory.newFromText === 'function'
    ? titleFactory.newFromText(`${config.pageName || ''}${fragment}`)
    : null;
}

export function titleText(mwTitle) {
  return mwTitle && typeof mwTitle.getPrefixedText === 'function' ? mwTitle.getPrefixedText() : '';
}

export function titleDb(mwTitle) {
  return mwTitle && typeof mwTitle.getPrefixedDb === 'function'
    ? mwTitle.getPrefixedDb()
    : titleText(mwTitle).replace(/ /g, '_');
}
