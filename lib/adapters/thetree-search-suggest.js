/*
 * SPDX-License-Identifier: GPL-2.0-or-later
 * Modified by thetree-skin-vector, 2026-08-01.
 * Source provenance: ORIGIN-MANIFEST.json and NOTICE.
 *
 * DOM port of REL1_46 jquery.suggestions, jquery.highlightText, and
 * mediawiki.searchSuggest. Vector and the MediaWiki ResourceLoader modules
 * retain ownership of the suggestion markup classes and presentation. This
 * adapter replaces only the host API, routing, IME-safe input event, and SPA
 * lifecycle boundaries.
 */

export const SEARCH_SUGGEST_CONTAINER_ID = 'tt-vector-search-suggestions';

const CACHE_MAX_AGE = 60000;
const MAX_EXPAND_FACTOR = 3;

export function normalizeTheTreeSuggestions(value, limit = 10) {
  const source = Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : [];
  const seen = new Set();
  const result = [];
  for (const candidate of source) {
    const title = String(candidate ?? '').trim();
    if (!title || seen.has(title)) continue;
    seen.add(title);
    result.push(title);
    if (result.length >= limit) break;
  }
  return result;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function appendPrefixHighlight(documentRoot, parent, title, query) {
  const match = query
    ? title.match(new RegExp(`^${escapeRegExp(query)}\\p{M}*`, 'iu'))
    : null;
  if (!match || !match[0]) {
    parent.textContent = title;
    return;
  }
  const highlight = documentRoot.createElement('span');
  highlight.className = 'highlight';
  highlight.textContent = match[0];
  parent.append(highlight, documentRoot.createTextNode(title.slice(match[0].length)));
}

function isModifiedActivation(event) {
  return event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}

export function createTheTreeSearchSuggestRuntime(options = {}) {
  const documentRoot = options.documentRoot || (typeof document === 'undefined' ? null : document);
  const requestSuggestions = options.requestSuggestions || (() => Promise.resolve([]));
  const navigateDocument = options.navigateDocument || (() => {});
  const navigateSearch = options.navigateSearch || (() => {});
  const documentHref = options.documentHref || (() => '#');
  const searchHref = options.searchHref || (() => '#');
  const specialLabel = String(options.specialLabel || 'Search for pages containing');
  const wait = Number.isFinite(options.wait) ? options.wait : 120;
  const limit = Number.isFinite(options.limit) ? options.limit : 10;
  let input = null;
  let searchRoot = null;
  let container = null;
  let resultsRoot = null;
  let specialRoot = null;
  let suggestions = [];
  let renderedQuery = '';
  let activeIndex = -1;
  let timer = null;
  let controller = null;
  let requestGeneration = 0;
  let mouseDownTarget = null;
  const cache = new Map();
  const windowRoot = documentRoot && documentRoot.defaultView;

  function clearTimer() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }

  function isOpen() {
    return !!container && container.style.display !== 'none';
  }

  function clearActive() {
    activeIndex = -1;
    if (!container) return;
    container.querySelectorAll('.suggestions-result-current').forEach((row) => {
      row.classList.remove('suggestions-result-current');
      row.setAttribute('aria-selected', 'false');
    });
    if (input) input.removeAttribute('aria-activedescendant');
  }

  function closeSuggestions({ restoreQuery = false } = {}) {
    if (restoreQuery && input) input.value = renderedQuery;
    clearActive();
    if (container) container.style.display = 'none';
    if (input) input.setAttribute('aria-expanded', 'false');
  }

  function regionIsFixed() {
    let element = searchRoot;
    while (element && element !== documentRoot.documentElement) {
      if (windowRoot && windowRoot.getComputedStyle(element).position === 'fixed') return true;
      element = element.offsetParent;
    }
    return false;
  }

  function resolveExpandFrom(regionLeft, regionWidth, documentWidth) {
    const direction = windowRoot
      ? windowRoot.getComputedStyle(documentRoot.documentElement).direction
      : documentRoot.documentElement.dir;
    if (regionWidth > 0.85 * documentWidth) return direction === 'rtl' ? 'right' : 'left';
    const regionCenter = regionLeft + regionWidth / 2;
    const documentCenter = documentWidth / 2;
    if (Math.abs(regionCenter - documentCenter) < 0.10 * documentCenter) {
      return direction === 'rtl' ? 'right' : 'left';
    }
    return regionCenter > documentCenter ? 'right' : 'left';
  }

  function positionSuggestions() {
    if (!container || !searchRoot || !windowRoot) return;
    const fixed = regionIsFixed();
    const region = searchRoot.getBoundingClientRect();
    const scrollX = fixed ? 0 : windowRoot.pageXOffset;
    const scrollY = fixed ? 0 : windowRoot.pageYOffset;
    const regionLeft = region.left + scrollX;
    const documentWidth = fixed
      ? documentRoot.documentElement.clientWidth
      : Math.max(documentRoot.documentElement.scrollWidth, documentRoot.documentElement.clientWidth);
    const expandFrom = resolveExpandFrom(regionLeft, region.width, documentWidth);

    Object.assign(container.style, {
      position: fixed ? 'fixed' : 'absolute',
      top: `${region.bottom + scrollY}px`,
      bottom: 'auto',
      width: `${region.width}px`,
      height: 'auto',
      fontSize: windowRoot.getComputedStyle(input).fontSize
    });
    if (expandFrom === 'left') {
      container.style.left = `${regionLeft}px`;
      container.style.right = 'auto';
    } else {
      container.style.left = 'auto';
      container.style.right = `${Math.max(0, documentRoot.documentElement.clientWidth - (regionLeft + region.width))}px`;
    }

    const requiredWidth = [...resultsRoot.querySelectorAll('.suggestions-result')]
      .reduce((width, row) => Math.max(width, row.scrollWidth), region.width);
    const maxWidth = MAX_EXPAND_FACTOR * input.getBoundingClientRect().width;
    if (requiredWidth > region.width) container.style.width = `${Math.min(requiredWidth, maxWidth)}px`;
  }

  function setExpanded(expanded) {
    if (!input || !container) return;
    input.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    container.style.display = expanded ? 'block' : 'none';
    if (expanded) positionSuggestions();
  }

  function activeCount() {
    return suggestions.length + (renderedQuery ? 1 : 0);
  }

  function activate(index, { updateInput = false } = {}) {
    const count = activeCount();
    if (!container || count === 0) return;
    const normalized = ((index % count) + count) % count;
    clearActive();
    activeIndex = normalized;
    const row = normalized < suggestions.length
      ? resultsRoot.querySelector(`[rel="${normalized}"]`)
      : specialRoot;
    if (!row) return;
    row.classList.add('suggestions-result-current');
    row.setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', row.id);
    if (updateInput) input.value = normalized < suggestions.length ? suggestions[normalized] : renderedQuery;
  }

  function selectTitle(title) {
    if (!title) return;
    input.value = title;
    closeSuggestions();
    navigateDocument(title);
  }

  function selectSearch(query) {
    if (!query) return;
    input.value = query;
    closeSuggestions();
    navigateSearch(query);
  }

  function bindAnchor(anchor, row, select) {
    row.addEventListener('mousemove', () => {
      const index = row === specialRoot ? suggestions.length : Number(row.getAttribute('rel'));
      activate(index);
    });
    anchor.addEventListener('click', (event) => {
      if (isModifiedActivation(event)) return;
      event.preventDefault();
      select();
    });
  }

  function makeResult(title, index, query) {
    const anchor = documentRoot.createElement('a');
    anchor.className = 'mw-searchSuggest-link';
    anchor.href = String(documentHref(title) || '#');
    anchor.title = title;
    const row = documentRoot.createElement('div');
    row.id = `${SEARCH_SUGGEST_CONTAINER_ID}-option-${index}`;
    row.className = 'suggestions-result';
    row.setAttribute('rel', String(index));
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', 'false');
    appendPrefixHighlight(documentRoot, row, title, query);
    anchor.appendChild(row);
    bindAnchor(anchor, row, () => selectTitle(title));
    return anchor;
  }

  function render(query, items) {
    if (!resultsRoot || !specialRoot) return;
    if (specialRoot.parentNode !== container) {
      const specialAnchor = specialRoot.parentNode;
      container.insertBefore(specialRoot, specialAnchor);
      specialAnchor.remove();
    }
    suggestions = items;
    renderedQuery = query;
    clearActive();
    resultsRoot.replaceChildren(...suggestions.map((title, index) => makeResult(title, index, query)));
    specialRoot.replaceChildren();
    specialRoot.style.display = 'none';

    if (query) {
      const label = documentRoot.createElement('div');
      label.className = 'special-label';
      label.textContent = specialLabel;
      const specialQuery = documentRoot.createElement('div');
      specialQuery.className = 'special-query';
      specialQuery.textContent = query;
      specialRoot.append(label, specialQuery);
      specialRoot.style.display = 'block';
      const anchor = documentRoot.createElement('a');
      anchor.className = 'mw-searchSuggest-link';
      anchor.href = String(searchHref(query) || '#');
      specialRoot.parentNode.insertBefore(anchor, specialRoot);
      anchor.appendChild(specialRoot);
      bindAnchor(anchor, specialRoot, () => selectSearch(query));
    }

    setExpanded(!!query && (suggestions.length > 0 || specialRoot.childNodes.length > 0));
  }

  async function updateSuggestions(query, generation) {
    const cached = cache.get(query);
    if (cached && Date.now() - cached.timestamp < CACHE_MAX_AGE) {
      if (generation === requestGeneration && input && input.value.trim() === query) render(query, cached.suggestions);
      return;
    }
    if (controller) controller.abort();
    controller = typeof AbortController === 'undefined' ? null : new AbortController();
    try {
      const response = await requestSuggestions(query, controller ? controller.signal : undefined);
      if (generation !== requestGeneration || !input || input.value.trim() !== query) return;
      const normalized = normalizeTheTreeSuggestions(response, limit);
      cache.set(query, { suggestions: normalized, timestamp: Date.now() });
      render(query, normalized);
    } catch (error) {
      if (error && error.name === 'AbortError') return;
      if (generation === requestGeneration) render(query, []);
    } finally {
      if (generation === requestGeneration) controller = null;
    }
  }

  function scheduleUpdate({ immediate = false } = {}) {
    clearTimer();
    requestGeneration += 1;
    const generation = requestGeneration;
    const query = input ? input.value.trim() : '';
    if (!query) {
      if (controller) controller.abort();
      controller = null;
      render('', []);
      return;
    }
    timer = setTimeout(() => {
      timer = null;
      updateSuggestions(query, generation);
    }, immediate ? 0 : wait);
  }

  function onFocus() {
    if (input && input.value.trim() && !isOpen()) scheduleUpdate({ immediate: true });
  }

  function onBlur() {
    if (mouseDownTarget) return;
    closeSuggestions();
    if (controller) controller.abort();
    controller = null;
  }

  function onKeydown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      if (!isOpen()) scheduleUpdate({ immediate: true });
      else activate(activeIndex + 1, { updateInput: true });
    } else if (event.key === 'ArrowUp' && isOpen()) {
      event.preventDefault();
      event.stopPropagation();
      activate(activeIndex - 1, { updateInput: true });
    } else if (event.key === 'Enter' && isOpen() && activeIndex >= 0) {
      event.preventDefault();
      event.stopPropagation();
      if (activeIndex < suggestions.length) selectTitle(suggestions[activeIndex]);
      else selectSearch(renderedQuery);
    } else if (event.key === 'Escape' && isOpen()) {
      event.preventDefault();
      event.stopPropagation();
      closeSuggestions({ restoreQuery: true });
      if (controller) controller.abort();
      controller = null;
    }
  }

  function onMouseDown(event) {
    mouseDownTarget = event.target.closest('.suggestions-result, .suggestions-special');
  }

  function onMouseUp() {
    mouseDownTarget = null;
    if (input) input.focus();
  }

  function init() {
    if (!documentRoot || !documentRoot.body) return false;
    input = documentRoot.getElementById('searchInput');
    searchRoot = documentRoot.getElementById('simpleSearch') || input;
    if (!input || !searchRoot) return false;

    container = documentRoot.createElement('div');
    container.id = SEARCH_SUGGEST_CONTAINER_ID;
    container.className = 'suggestions tt-vector-search-suggestions';
    container.style.display = 'none';
    container.setAttribute('role', 'listbox');
    resultsRoot = documentRoot.createElement('div');
    resultsRoot.className = 'suggestions-results';
    specialRoot = documentRoot.createElement('div');
    specialRoot.id = `${SEARCH_SUGGEST_CONTAINER_ID}-special`;
    specialRoot.className = 'suggestions-special';
    specialRoot.setAttribute('role', 'option');
    specialRoot.setAttribute('aria-selected', 'false');
    container.append(resultsRoot, specialRoot);
    documentRoot.body.appendChild(container);

    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', SEARCH_SUGGEST_CONTAINER_ID);
    input.setAttribute('aria-expanded', 'false');
    // Native input covers paste, cut, drop, mobile keyboards, and Korean IME
    // composition without the upstream keypress gap (MediaWiki T177251).
    input.addEventListener('input', scheduleUpdate);
    input.addEventListener('focus', onFocus);
    input.addEventListener('blur', onBlur);
    input.addEventListener('keydown', onKeydown);
    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mouseup', onMouseUp);
    if (windowRoot) {
      windowRoot.addEventListener('resize', positionSuggestions);
      windowRoot.addEventListener('scroll', positionSuggestions, true);
    }
    if (documentRoot.activeElement === input && input.value !== input.defaultValue) scheduleUpdate({ immediate: true });
    return true;
  }

  function destroy() {
    requestGeneration += 1;
    clearTimer();
    if (controller) controller.abort();
    controller = null;
    if (input) {
      input.removeEventListener('input', scheduleUpdate);
      input.removeEventListener('focus', onFocus);
      input.removeEventListener('blur', onBlur);
      input.removeEventListener('keydown', onKeydown);
      input.removeAttribute('aria-autocomplete');
      input.removeAttribute('aria-controls');
      input.removeAttribute('aria-expanded');
      input.removeAttribute('aria-activedescendant');
    }
    if (container) {
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('mouseup', onMouseUp);
      container.remove();
    }
    if (windowRoot) {
      windowRoot.removeEventListener('resize', positionSuggestions);
      windowRoot.removeEventListener('scroll', positionSuggestions, true);
    }
    input = null;
    searchRoot = null;
    container = null;
    resultsRoot = null;
    specialRoot = null;
    suggestions = [];
    renderedQuery = '';
    activeIndex = -1;
    mouseDownTarget = null;
    cache.clear();
  }

  return Object.freeze({ init, destroy });
}
