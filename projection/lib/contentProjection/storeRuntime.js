import { applyLegacyParserOutputTransformToStore, subscribeLegacyParserOutputTransformToStore } from '../legacyParserOutputTransform.js';

function callSignatureUpdate(onUpdate, result) {
  if (typeof onUpdate === 'function' && result && typeof result.signature === 'string') {
    onUpdate(result.signature, result);
  }
}

export function createLegacyParserOutputStoreRuntime({ store, state, onUpdate } = {}) {
  let unsubscribe = null;
  const getState = () => state || store?.state || null;

  function sync() {
    const currentState = getState();
    if (!currentState) {
      const result = {
        changed: 0,
        signature: 'store-unavailable',
        visitedPaths: [],
        changedPaths: []
      };
      callSignatureUpdate(onUpdate, result);
      return result;
    }
    const result = applyLegacyParserOutputTransformToStore(currentState);
    callSignatureUpdate(onUpdate, result);
    return result;
  }

  function init() {
    const result = sync();
    if (!unsubscribe && store) {
      unsubscribe = subscribeLegacyParserOutputTransformToStore(
        store,
        getState(),
        (nextResult) => callSignatureUpdate(onUpdate, nextResult)
      );
    }
    return result;
  }

  function destroy() {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
    unsubscribe = null;
  }

  return Object.freeze({
    init,
    sync,
    destroy
  });
}
