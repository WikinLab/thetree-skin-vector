import { installTheTreeMediaWikiRuntime } from '../adapters/thetree-mediawiki/runtime.js';
import { createTheTreeVectorRuntime } from '../adapters/thetree-vector/skin-legacy.js';
import { createExtensionRuntimeHost } from './createExtensionRuntimeHost.js';

function noop() {}

export function createSkinRuntimeController({
  createContentRuntime = null,
  getContentRuntimeOptions = () => ({}),
  getMediaWikiRuntimeData = () => ({}),
  getMediaWikiRuntimeOptions = () => ({}),
  extensions = [],
  getCapabilities = () => [],
  onContentTransform = noop,
  schedule = (callback) => callback()
} = {}) {
  let theTreeMediaWikiRuntime = null;
  let theTreeVectorRuntime = null;
  let contentRuntime = null;
  let generation = 0;
  const extensionRuntimeHost = createExtensionRuntimeHost(extensions);

  function destroyRuntimes() {
    extensionRuntimeHost.destroy();
    if (contentRuntime) {
      contentRuntime.destroy();
      contentRuntime = null;
    }
    if (theTreeVectorRuntime) {
      theTreeVectorRuntime.destroy();
      theTreeVectorRuntime = null;
    }
    if (theTreeMediaWikiRuntime) {
      theTreeMediaWikiRuntime.destroy();
      theTreeMediaWikiRuntime = null;
    }
  }

  function initNow() {
    if (typeof window === 'undefined') return null;
    destroyRuntimes();

    theTreeMediaWikiRuntime = installTheTreeMediaWikiRuntime(
      getMediaWikiRuntimeData(),
      getMediaWikiRuntimeOptions()
    );
    theTreeVectorRuntime = createTheTreeVectorRuntime();
    theTreeVectorRuntime.init();

    const contentResult = typeof createContentRuntime === 'function'
      ? (() => {
        contentRuntime = createContentRuntime(getContentRuntimeOptions);
        return contentRuntime.init();
      })()
      : null;
    onContentTransform(contentResult);

    const activeExtensions = extensionRuntimeHost.init(getCapabilities(), {
      mediaWikiRuntime: theTreeMediaWikiRuntime
    });
    return Object.freeze({ contentTransform: contentResult, activeExtensions });
  }

  function init() {
    generation += 1;
    return initNow();
  }

  function destroy() {
    generation += 1;
    destroyRuntimes();
  }

  function reset() {
    const requestedGeneration = ++generation;
    schedule(() => {
      if (requestedGeneration !== generation) return;
      initNow();
    });
  }

  return Object.freeze({ init, destroy, reset });
}
