/*
 * Popups source bridge for the Vector legacy shell.
 *
 * This thetree adapter composes source-aligned Popups/Cite ports with host-only
 * gateway, model, target-reservation, settings, and runtime lifecycle modules.
 * Upstream-path files under lib/ports do not import this adapter namespace.
 */
import {
  ABANDON_END_DELAY,
  EXCLUDED_LINK_SELECTORS,
  FETCH_COMPLETE_TARGET_DELAY,
  FETCH_START_DELAY,
  PREVIEW_BEHAVIOR_BIND_DELAY,
  PREVIEW_SEEN_DURATION,
  eligibleLinkSelector,
  eligiblePageLinkSelector,
  eligibleReferenceLinkSelector
} from '../../ports/mediawiki-popups/src/constants.js';
import {
  getTitleFromHref,
  titleDb,
  titleFromElement,
  titleFromReferenceElement,
  titleText
} from './title.js';
import {
  eventContainsTarget,
  eventLeavesTarget,
  eventPageTarget,
  eventReferenceTarget,
  eventTargetElement,
  releaseReservedTitle,
  reserveTargetTitle
} from './target.js';
import { createMeasures, createLayout, getClosestYPosition } from './layout.js';
import { createTheTreePopupsGateway } from './gateway.js';
import { createReferenceGateway } from '../../ports/mediawiki-cite/modules/ext.cite.referencePreviews/createReferenceGateway.js';
import { createNodeFromTemplate, renderPopup } from '../../ports/mediawiki-popups/src/ui/templates/index.js';
import {
  createReferencePreview,
  createPreviewWithType,
  getClasses,
  hasPointerOnImage,
  hidePreview,
  layoutPreview,
  renderPagePreview,
  renderPreview,
  renderReferencePreview
} from '../../ports/mediawiki-popups/src/ui/renderer.js';
import { createThumbnail, previewHasThumbnail, thumbnailIsTall } from '../../ports/mediawiki-popups/src/ui/thumbnail.js';
import {
  createModel,
  extractPageFromMediaWikiApiResponse,
  formatPlainTextExtract,
  getPagePreviewType,
  isMediaWikiApiQueryResponse,
  isMediaWikiSummaryResponse,
  makeMediaWikiApiRequestUrl,
  makeNullModel,
  modelFromMediaWikiApiResponse,
  modelFromSummaryResponse,
  processExtract,
  validateExternalPreviewModel
} from '../../ports/mediawiki-popups/src/preview/model.js';
import { modelFromTheTreeInternalPageData } from './model.js';
import { wait } from '../../ports/mediawiki-popups/src/wait.js';

export { FETCH_START_DELAY, FETCH_COMPLETE_TARGET_DELAY, ABANDON_END_DELAY, PREVIEW_SEEN_DURATION, PREVIEW_BEHAVIOR_BIND_DELAY };


export const theTreePopupsSourceBridge = Object.freeze({
  EXCLUDED_LINK_SELECTORS,
  eligibleLinkSelector,
  eligiblePageLinkSelector,
  eligibleReferenceLinkSelector,
  getTitleFromHref,
  titleFromElement,
  titleFromReferenceElement,
  eventReferenceTarget,
  eventPageTarget,
  eventTargetElement,
  eventContainsTarget,
  eventLeavesTarget,
  reserveTargetTitle,
  releaseReservedTitle,
  createMeasures,
  createLayout,
  getClosestYPosition,
  thumbnailIsTall,
  previewHasThumbnail,
  hasPointerOnImage,
  getClasses,
  createNodeFromTemplate,
  renderPopup,
  renderPreview,
  renderPagePreview,
  renderReferencePreview,
  createReferencePreview,
  createReferenceGateway,
  createTheTreePopupsGateway,
  createThumbnail,
  createPreviewWithType,
  PREVIEW_BEHAVIOR_BIND_DELAY,
  layoutPreview,
  hidePreview,
  formatPlainTextExtract,
  modelFromSummaryResponse,
  modelFromMediaWikiApiResponse,
  modelFromTheTreeInternalPageData,
  makeMediaWikiApiRequestUrl,
  extractPageFromMediaWikiApiResponse,
  isMediaWikiApiQueryResponse,
  validateExternalPreviewModel,
  isMediaWikiSummaryResponse,
  createModel,
  processExtract,
  getPagePreviewType,
  makeNullModel,
  wait
});
