/*
 * Popups runtime timer registry.
 *
 * The host runtime owns timers because they bind Popups dwell/abandon behavior
 * to the browser event loop. Keeping timer slots here prevents those slots from
 * being mixed with reducer state or source bridge rendering code.
 */
export function createPopupsRuntimeTimers(windowObject) {
  const timerWindow = windowObject;
  const slots = {
    behavior: null,
    dwell: null,
    hide: null,
    seen: null
  };

  function clear(name) {
    if (slots[name]) {
      timerWindow.clearTimeout(slots[name]);
      slots[name] = null;
    }
  }

  function set(name, callback, delay) {
    clear(name);
    slots[name] = timerWindow.setTimeout(() => {
      slots[name] = null;
      callback();
    }, delay);
    return slots[name];
  }

  function isActive(name) {
    return Boolean(slots[name]);
  }

  function clearAll() {
    Object.keys(slots).forEach(clear);
  }

  return Object.freeze({
    clear,
    set,
    isActive,
    clearAll
  });
}
