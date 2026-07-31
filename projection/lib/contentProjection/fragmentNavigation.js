/*
 * MediaWiki parser-output fragment navigation bridge.
 *
 * REL1_46 parser output relies on browser same-document fragment navigation for
 * behaviours such as Cite target highlighting:
 *
 *   sup.reference:target
 *   ol.references li:target
 *
 * The tree frontend owns generic dynamic-content link handling for v-html
 * surfaces and routes hash-only anchors through the Vue router. That is correct
 * for host application links, but compiled MediaWiki parser-output anchors are
 * already browser-handled fragment links. This bridge restores that ownership
 * boundary by letting hash-only links inside #mw-content-text .mw-parser-output
 * keep their default action while stopping the host dynamic-content
 * router handler from consuming the click event.
 *
 * It does not synthesize highlight classes, scroll positions, or Cite-specific
 * state. The browser updates the fragment target and the origin Cite CSS remains
 * responsible for the visible highlight.
 */

const CONTENT_ROOT_SELECTOR = '#mw-content-text';
const PARSER_OUTPUT_SELECTOR = '#mw-content-text .mw-parser-output';
const FRAGMENT_LINK_SELECTOR = 'a[href^="#"]';

function eventTargetElement(target) {
  if (!target) return null;
  if (target.nodeType === 1) return target;
  return target.parentElement || null;
}

function closestAnchor(target) {
  const element = eventTargetElement(target);
  if (!element || typeof element.closest !== 'function') return null;
  return element.closest(FRAGMENT_LINK_SELECTOR);
}

function isHashOnlyHref(href) {
  return typeof href === 'string'
    && href.length > 1
    && href.charAt(0) === '#';
}

function isParserOutputFragmentAnchor(anchor) {
  if (!anchor || anchor.nodeType !== 1) return false;
  if (!isHashOnlyHref(anchor.getAttribute('href'))) return false;
  if (anchor.getAttribute('target') && anchor.getAttribute('target') !== '_self') return false;
  return !!anchor.closest(PARSER_OUTPUT_SELECTOR);
}

function shouldPreserveBrowserFragmentNavigation(event) {
  if (!event || event.defaultPrevented) return false;
  const anchor = closestAnchor(event.target);
  return isParserOutputFragmentAnchor(anchor);
}

export function createLegacyParserOutputFragmentNavigationRuntime(options = {}) {
  let root = null;
  let installed = false;

  const listener = (event) => {
    if (!shouldPreserveBrowserFragmentNavigation(event)) return;
    event.stopPropagation();
  };

  function getRoot() {
    if (options.root) return options.root;
    if (typeof document === 'undefined') return null;
    return document.querySelector(CONTENT_ROOT_SELECTOR);
  }

  function init() {
    if (installed || typeof document === 'undefined') return false;
    root = getRoot();
    if (!root || typeof root.addEventListener !== 'function') return false;
    root.addEventListener('click', listener, true);
    installed = true;
    return true;
  }

  function destroy() {
    if (root && installed && typeof root.removeEventListener === 'function') {
      root.removeEventListener('click', listener, true);
    }
    root = null;
    installed = false;
  }

  return Object.freeze({
    init,
    destroy,
    get installed() {
      return installed;
    }
  });
}
