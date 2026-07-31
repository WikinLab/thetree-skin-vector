/*
 * Vector Legacy content projection branch entry.
 *
 * The host Nuxt content is the invariant input. This module owns every
 * operation that projects that input into MediaWiki content semantics. The
 * Vector chrome imports only this public entry. The base branch omits this
 * directory entirely.
 */

import { getLegacyPageContract } from '../legacyPageContract.js';
import { SURFACE_TYPE_INTERFACE } from '../legacySpecialPageContract.js';
import { RUNTIME_CAPABILITIES } from '../runtime/capabilities.js';
import { makeLegacyCategoryData } from './categoryData.js';
import { createLegacyParserOutputFragmentNavigationRuntime } from './fragmentNavigation.js';
import { createLegacyProjectionSurfaceRuntime } from './mounted.js';
import { createLegacyParserOutputStoreRuntime } from './storeRuntime.js';

export const CONTENT_PROJECTION_ID = 'vector-legacy-projection';

function resolveOptions(optionsSource = {}) {
  const options = typeof optionsSource === 'function' ? optionsSource() : optionsSource;
  return options && typeof options === 'object' ? options : {};
}

function resolveMountedRoot(optionsSource = {}) {
  const options = resolveOptions(optionsSource);
  return typeof options.getRoot === 'function' ? options.getRoot() : options.root || null;
}

function createMountedContentProjectionRuntime(optionsSource = {}) {
  let projectionRuntime = null;
  let fragmentNavigationRuntime = null;

  function init() {
    destroy();
    try {
      fragmentNavigationRuntime = createLegacyParserOutputFragmentNavigationRuntime({
        root: resolveMountedRoot(optionsSource)
      });
      fragmentNavigationRuntime.init();

      projectionRuntime = createLegacyProjectionSurfaceRuntime(optionsSource);
      const result = projectionRuntime.init();
      return result;
    } catch (error) {
      destroy();
      throw error;
    }
  }

  function destroy() {
    if (projectionRuntime) projectionRuntime.destroy();
    projectionRuntime = null;
    if (fragmentNavigationRuntime) fragmentNavigationRuntime.destroy();
    fragmentNavigationRuntime = null;
  }

  return Object.freeze({ init, destroy });
}

function resolveProjectedSurface(context = {}) {
  const pageContract = getLegacyPageContract(context);
  const projection = pageContract.projection;
  const root = projection.root;
  return Object.freeze({
    projection,
    root,
    isArticle: pageContract.isArticle,
    isInterface: root.type === SURFACE_TYPE_INTERFACE,
    featureMappingId: pageContract.featureMappingId,
    featureEquivalence: pageContract.featureEquivalence
  });
}

export const vectorContentProjection = Object.freeze({
  id: CONTENT_PROJECTION_ID,
  capabilities: Object.freeze([RUNTIME_CAPABILITIES.MEDIAWIKI_CONTENT_SURFACE]),
  resolveSurface: resolveProjectedSurface,
  makeCategoryData: makeLegacyCategoryData,
  createStoreRuntime: createLegacyParserOutputStoreRuntime,
  createMountedRuntime: createMountedContentProjectionRuntime
});

export default vectorContentProjection;
