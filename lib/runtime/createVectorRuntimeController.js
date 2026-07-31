import { installTheTreeMediaWikiRuntime } from '../adapters/thetree-mediawiki/runtime.js';
import { createTheTreeVectorRuntime } from '../adapters/thetree-vector/skin-legacy.js';

export function createVectorRuntimeController({
  getMediaWikiRuntimeData = () => ({}),
  getMediaWikiRuntimeOptions = () => ({}),
  schedule = (callback) => callback()
} = {}) {
  let mediaWikiRuntime = null;
  let vectorRuntime = null;
  let generation = 0;

  function destroyNow() {
    if (vectorRuntime) {
      vectorRuntime.destroy();
      vectorRuntime = null;
    }
    if (mediaWikiRuntime) {
      mediaWikiRuntime.destroy();
      mediaWikiRuntime = null;
    }
  }

  function initNow() {
    if (typeof window === 'undefined') return null;
    destroyNow();
    mediaWikiRuntime = installTheTreeMediaWikiRuntime(
      getMediaWikiRuntimeData(),
      getMediaWikiRuntimeOptions()
    );
    vectorRuntime = createTheTreeVectorRuntime();
    vectorRuntime.init();
    return Object.freeze({ mediaWikiRuntime, vectorRuntime });
  }

  function init() {
    generation += 1;
    return initNow();
  }

  function destroy() {
    generation += 1;
    destroyNow();
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
