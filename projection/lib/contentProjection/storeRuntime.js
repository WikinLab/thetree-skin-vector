function callSignatureUpdate(onUpdate, result) {
  if (typeof onUpdate === 'function' && result && typeof result.signature === 'string') {
    onUpdate(result.signature, result);
  }
}

export function createLegacyParserOutputStoreRuntime({
  getState = () => null,
  transformState = () => ({
    changed: 0,
    signature: 'transform-unavailable',
    visitedPaths: [],
    changedPaths: []
  }),
  onUpdate
} = {}) {

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
    const result = transformState(currentState);
    callSignatureUpdate(onUpdate, result);
    return result;
  }

  function init() {
    return sync();
  }

  function destroy() {}

  return Object.freeze({
    init,
    sync,
    destroy
  });
}
