import { installTheTreeMediaWikiRuntime } from '../adapters/thetree-mediawiki/runtime.js';
import { createTheTreeVectorRuntime } from '../adapters/thetree-vector/skin-legacy.js';
import { createExtensionRuntimeHost } from '../../projection/lib/runtime/createExtensionRuntimeHost.js';

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
  const extensionRuntimeHost = createExtensionRuntimeHost(extensions);

  function destroy() {
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

  function init() {
    if (typeof window === 'undefined') return null;
    destroy();

    const mediaWikiRuntimeData = getMediaWikiRuntimeData();
    const mediaWikiRuntimeOptions = getMediaWikiRuntimeOptions();

    // MediaWiki services must exist before Vector registers util.addPortlet and
    // util.addPortletLink hooks. Registered extensions consume this namespace.
    theTreeMediaWikiRuntime = installTheTreeMediaWikiRuntime(mediaWikiRuntimeData, mediaWikiRuntimeOptions);

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

    return Object.freeze({
      contentTransform: contentResult,
      activeExtensions
    });
  }

  function reset() {
    schedule(() => {
      init();
    });
  }

  return Object.freeze({
    init,
    destroy,
    reset
  });
}
