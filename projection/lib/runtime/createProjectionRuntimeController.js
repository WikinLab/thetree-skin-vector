import { createVectorRuntimeController } from '../../../lib/runtime/createVectorRuntimeController.js';
import { createExtensionRuntimeHost } from './createExtensionRuntimeHost.js';

function noop() {}

export function createProjectionRuntimeController({
  createContentRuntime = null,
  getContentRuntimeOptions = () => ({}),
  getMediaWikiRuntimeData = () => ({}),
  getMediaWikiRuntimeOptions = () => ({}),
  extensions = [],
  getCapabilities = () => [],
  onContentTransform = noop,
  schedule = (callback) => callback()
} = {}) {
  let contentRuntime = null;
  let generation = 0;
  const extensionRuntimeHost = createExtensionRuntimeHost(extensions);
  const vectorRuntimeController = createVectorRuntimeController({
    getMediaWikiRuntimeData,
    getMediaWikiRuntimeOptions
  });

  function destroyRuntimes() {
    extensionRuntimeHost.destroy();
    if (contentRuntime) {
      contentRuntime.destroy();
      contentRuntime = null;
    }
    vectorRuntimeController.destroy();
  }

  function initNow() {
    if (typeof window === 'undefined') return null;
    destroyRuntimes();
    const vectorRuntime = vectorRuntimeController.init();

    const contentResult = typeof createContentRuntime === 'function'
      ? (() => {
        contentRuntime = createContentRuntime(getContentRuntimeOptions);
        return contentRuntime.init();
      })()
      : null;
    onContentTransform(contentResult);

    const activeExtensions = extensionRuntimeHost.init(getCapabilities(), {
      mediaWikiRuntime: vectorRuntime.mediaWikiRuntime
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
