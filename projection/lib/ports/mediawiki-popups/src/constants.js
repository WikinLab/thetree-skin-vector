/*
 * SPDX-License-Identifier: GPL-2.0-or-later
 * Modified by thetree-skin-vector, 2026-07-29 and 2026-07-30.
 * Source provenance: ORIGIN-MANIFEST.json and NOTICE.
 *
 * Popups/Cite source bridge constants.
 *
 * This module keeps upstream-like Popups timing, selector, geometry, and model
 * constants out of the host runtime bridge. The thetree-specific adapter remains
 * in gateway modules, not in renderer/template/layout constants.
 */
export const FETCH_START_DELAY = 150;
export const FETCH_COMPLETE_TARGET_DELAY = 350 + FETCH_START_DELAY;
export const ABANDON_END_DELAY = 300;
export const PREVIEW_SEEN_DURATION = 1000;
export const PREVIEW_BEHAVIOR_BIND_DELAY = 0;

export const EXCLUDED_LINK_SELECTORS = Object.freeze([
  '.extiw',
  '.mw-selflink',
  '.image',
  '.new',
  '.internal',
  '.external',
  '.mw-cite-backlink a',
  '.oo-ui-buttonElement-button',
  '.ve-ce-surface a',
  '.ext-discussiontools-init-timestamplink',
  '.cancelLink a',
  '.mw-selflink-fragment',
  '[href^="#"]'
]);

export const rootSelector = '#mw-content-text';
export const TYPE_REFERENCE = 'reference';
export const eligiblePageLinkSelector = `${rootSelector} a[href][title]:not(${EXCLUDED_LINK_SELECTORS.join(', ')})`;
export const eligibleReferenceLinkSelector = `${rootSelector} .reference a[ href*="#" ]`;
export const eligibleLinkSelector = `${eligiblePageLinkSelector}, ${eligibleReferenceLinkSelector}`;

export const landscapePopupWidth = 450;
export const portraitPopupWidth = 320;
export const pointerSize = 8;
export const maxLinkWidthForCenteredPointer = 28;
export const defaultExtractWidth = 215;
export const CACHE_LIFETIME = 300;
export const EXTRACT_LENGTH = 525;

export const SIZES = Object.freeze({
  portraitImage: Object.freeze({ h: 250, w: 203 }),
  landscapeImage: Object.freeze({ h: 200, w: 320 })
});

export const previewTypes = Object.freeze({
  TYPE_GENERIC: 'generic',
  TYPE_PAGE: 'page',
  TYPE_DISAMBIGUATION: 'disambiguation'
});

export const allowedPreviewTypes = Object.freeze(Object.values(previewTypes));
