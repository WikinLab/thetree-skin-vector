import vectorContentProjection from './contentProjection/index.js';
import {
  insertContentProjectionPersonalTool,
  isContentProjectionToggleTarget,
  resolveContentProjectionPreference,
  toggleTheTreeContentProjection
} from './adapters/thetree-content-projection.js';
import { makeTheTreePopupsRuntimeData } from './adapters/thetree-popups/data.js';
import { createTheTreePopupsExtension } from './adapters/thetree-popups/extension.js';

function contentDirectionClass(context = {}) {
  const direction = context.config?.dir || context.config?.['wiki.dir'] || 'ltr';
  return direction === 'rtl' ? 'mw-content-rtl' : 'mw-content-ltr';
}

function contentRootBinding(surface, context) {
  const root = surface.root || {};
  const interfaceSurface = surface.isInterface === true;
  return Object.freeze({
    classList: {
      'mw-body-content': true,
      [contentDirectionClass(context)]: true,
      'wiki-article': surface.isArticle === true
    },
    attributes: {
      'data-tt-vector-surface': root.type || null,
      'data-tt-vector-surface-role': root.role || null,
      'data-tt-vector-interface-surface': interfaceSurface ? root.upstreamSurface : null,
      'data-tt-vector-interface-archetype': interfaceSurface ? root.archetype : null,
      'data-tt-vector-interface-equivalence': interfaceSurface ? surface.featureEquivalence : null,
      'data-tt-vector-page-contract': surface.featureMappingId || null,
      'data-tt-origin-content': root.type === 'parser-output' ? '1' : null,
      'data-tt-content-projection': vectorContentProjection.id
    }
  });
}

function makeCategoryData(context) {
  const data = vectorContentProjection.makeCategoryData(context);
  const language = String(context.config?.lang || context.config?.['wiki.lang'] || 'ko').toLowerCase();
  return Object.freeze({
    ...data,
    label: language.startsWith('ko') ? '분류' : 'Categories'
  });
}

function makeRuntimeContextData({ adapterContext, contentSurface }) {
  return makeTheTreePopupsRuntimeData({
    ...adapterContext,
    pageContract: {
      ...adapterContext.pageContract,
      isArticle: contentSurface.isArticle === true
    }
  });
}

function makeRuntimeOptions({ hostCapabilities, settings }) {
  return {
    theTreeHostCapabilities: hostCapabilities,
    theTreeSettings: settings
  };
}

function createMountedRuntime(optionsSource) {
  return vectorContentProjection.createMountedRuntime(() => {
    const options = typeof optionsSource === 'function' ? optionsSource() : optionsSource;
    return {
      getRoot: options.getRoot,
      getProjectionContract: () => options.contentSurface.projection,
      lang: options.lang,
      config: options.config,
      messages: options.messages
    };
  });
}

const contentProjectionLayer = Object.freeze({
  id: 'vector-legacy-projection',
  isEnabled: (context) => resolveContentProjectionPreference(context).enabled,
  resolveSurface: vectorContentProjection.resolveSurface,
  contentRootBinding,
  makeCategoryData,
  decoratePersonalTools: insertContentProjectionPersonalTool,
  handleClick(event, { adapterContext, storeState } = {}) {
    if (!isContentProjectionToggleTarget(event && event.target)) return false;
    event.preventDefault();
    event.stopPropagation();
    toggleTheTreeContentProjection(adapterContext, storeState);
    return true;
  },
  createStoreRuntime: vectorContentProjection.createStoreRuntime,
  createMountedRuntime,
  makeRuntimeData: makeRuntimeContextData,
  makeRuntimeOptions,
  createExtensions: ({ getData, getOptions }) => [createTheTreePopupsExtension({ getData, getOptions })],
  capabilities: vectorContentProjection.capabilities
});

export default contentProjectionLayer;
