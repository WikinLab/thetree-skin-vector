/*
 * thetree host adapter for the MediaWiki browser services consumed by the
 * imported Vector JavaScript modules.
 *
 * This is the single host boundary for the `mw` global. Ported upstream modules
 * must not read thetree stores, routers, or request helpers directly.
 */

function escapeRegExp(value) {
  return String(value).replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function makeConfigMap(values = {}) {
  const snapshot = Object.freeze({ ...values });
  return Object.freeze({
    get(key, fallback = undefined) {
      return Object.prototype.hasOwnProperty.call(snapshot, key) ? snapshot[key] : fallback;
    },
    set() {
      throw new Error('thetree MediaWiki compatibility config is read-only.');
    }
  });
}

function parseNamespaceId(title, namespaceIds = {}) {
  const text = String(title || '');
  const separator = text.indexOf(':');
  if (separator === -1) return 0;
  const prefix = text.slice(0, separator);
  return Object.prototype.hasOwnProperty.call(namespaceIds, prefix) ? namespaceIds[prefix] : 0;
}

function makeTitleFactory(namespaceIds = {}) {
  return Object.freeze({
    newFromText(value) {
      if (typeof value !== 'string' || value.trim() === '') return null;
      const hashIndex = value.indexOf('#');
      const prefixedText = hashIndex === -1 ? value : value.slice(0, hashIndex);
      const rawFragment = hashIndex === -1 ? '' : value.slice(hashIndex + 1);
      let fragment = rawFragment;
      try {
        fragment = decodeURIComponent(rawFragment);
      } catch (error) {
        fragment = rawFragment;
      }
      const namespace = parseNamespaceId(prefixedText, namespaceIds);
      return Object.freeze({
        namespace,
        getPrefixedDb() {
          return prefixedText.replace(/ /g, '_');
        },
        getPrefixedText() {
          return prefixedText.replace(/_/g, ' ');
        },
        getFragment() {
          return fragment;
        }
      });
    }
  });
}

function makeStorage(storage) {
  if (storage && typeof storage.get === 'function' && typeof storage.set === 'function') {
    return storage;
  }
  return Object.freeze({
    get(key) {
      try {
        return window.localStorage.getItem(key);
      } catch (error) {
        return null;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, value);
        return true;
      } catch (error) {
        return false;
      }
    },
    remove(key) {
      try {
        window.localStorage.removeItem(key);
        return true;
      } catch (error) {
        return false;
      }
    }
  });
}

function makeHookRegistry() {
  const records = new Map();

  function getRecord(name) {
    if (!records.has(name)) {
      records.set(name, {
        callbacks: new Set(),
        fired: false,
        memory: []
      });
    }
    return records.get(name);
  }

  function hook(name) {
    const record = getRecord(String(name));
    const api = {
      add(...callbacks) {
        callbacks.flat().forEach((callback) => {
          if (typeof callback !== 'function') return;
          record.callbacks.add(callback);
          if (record.fired) callback(...record.memory);
        });
        return api;
      },
      remove(...callbacks) {
        callbacks.flat().forEach((callback) => record.callbacks.delete(callback));
        return api;
      },
      fire(...args) {
        record.fired = true;
        record.memory = args;
        Array.from(record.callbacks).forEach((callback) => callback(...args));
        return api;
      }
    };
    return Object.freeze(api);
  }

  function clear() {
    records.clear();
  }

  return Object.freeze({ hook, clear });
}

function debounce(callback, wait = 0, immediate = false) {
  let timeout = null;
  return function debounced(...args) {
    const context = this;
    const callImmediately = immediate && timeout === null;
    if (timeout !== null) window.clearTimeout(timeout);
    timeout = window.setTimeout(() => {
      timeout = null;
      if (!immediate) callback.apply(context, args);
    }, wait);
    if (callImmediately) return callback.apply(context, args);
    return undefined;
  };
}

function isPortletVisible(id) {
  const portlet = document.getElementById(id);
  return Boolean(portlet && !portlet.classList.contains('emptyPortlet'));
}

function showPortlet(id) {
  const portlet = document.getElementById(id);
  if (portlet) portlet.classList.remove('emptyPortlet');
}

function hidePortlet(id) {
  const portlet = document.getElementById(id);
  if (portlet) portlet.classList.add('emptyPortlet');
}

function makeUtil() {
  return Object.freeze({
    debounce,
    escapeRegExp,
    isPortletVisible,
    showPortlet,
    hidePortlet
  });
}

function nextFrame() {
  return new Promise((resolve) => {
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => resolve());
      return;
    }
    window.setTimeout(resolve, 0);
  });
}

function makeLoader(options = {}) {
  const loadedModules = new Set([
    'codex-styles',
    'ext.testKitchen',
    ...(Array.isArray(options.loadedModules) ? options.loadedModules : [])
  ]);
  return Object.freeze({
    using(modules) {
      const requested = Array.isArray(modules) ? modules : [modules];
      const unsupported = requested.filter((moduleName) => !loadedModules.has(moduleName));
      if (unsupported.length) {
        return Promise.reject(new Error(
          `Unsupported thetree MediaWiki ResourceLoader module(s): ${unsupported.join(', ')}`
        ));
      }
      return nextFrame();
    }
  });
}

function makeUser(options = {}) {
  return Object.freeze({
    generateRandomSessionId() {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
      const bytes = new Uint8Array(16);
      if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
        window.crypto.getRandomValues(bytes);
        return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
      }
      return String(Date.now());
    },
    isAnon() {
      return options.isAnon !== false;
    },
    options: makeConfigMap(options.userOptions || {})
  });
}

function makeRequestIdleCallback() {
  return (callback) => {
    if (typeof window.requestIdleCallback === 'function') {
      return window.requestIdleCallback(callback);
    }
    return window.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 0 }), 0);
  };
}

export function makeTheTreeMediaWikiConfig(runtimeData = {}) {
  return Object.freeze({
    debug: false,
    wgArticlePath: runtimeData.articlePath,
    wgScript: runtimeData.scriptPath,
    wgPageName: runtimeData.pageName,
    wgContentNamespaces: runtimeData.contentNamespaces,
    wgPageContentLanguage: runtimeData.languageCode,
    wgMFMode: false,
    ...(runtimeData.config || {})
  });
}

export function installTheTreeMediaWikiRuntime(runtimeData = {}, options = {}) {
  if (typeof window === 'undefined') {
    return Object.freeze({
      mw: null,
      hook() { return null; },
      fireHook() {},
      destroy() {}
    });
  }

  const previousMw = window.mw;
  const mw = previousMw && typeof previousMw === 'object' ? previousMw : {};
  const values = makeTheTreeMediaWikiConfig(runtimeData);
  const messages = runtimeData.messages || {};
  const hookRegistry = makeHookRegistry();
  const assignedKeys = [];

  function assignMissing(key, value) {
    if (!Object.prototype.hasOwnProperty.call(mw, key)) {
      mw[key] = value;
      assignedKeys.push(key);
    }
  }

  assignMissing('config', makeConfigMap(values));
  assignMissing('Title', makeTitleFactory(runtimeData.namespaceIds || {}));
  assignMissing('storage', makeStorage(options.storage));
  assignMissing('user', makeUser(options));
  assignMissing('hook', hookRegistry.hook);
  assignMissing('track', () => {});
  assignMissing('experiments', Object.freeze({ getBucket() { return 'control'; } }));
  assignMissing('loader', makeLoader(options));
  assignMissing('testKitchen', Object.freeze({ getExperiment() { return null; } }));
  assignMissing('errorLogger', Object.freeze({
    logError(error) {
      if (window.console && typeof window.console.error === 'function') window.console.error(error);
    }
  }));
  assignMissing('util', makeUtil());
  assignMissing('msg', (key) => messages[key] || key);
  assignMissing('message', (key) => Object.freeze({
    exists() {
      return Object.prototype.hasOwnProperty.call(messages, key);
    },
    text() {
      return messages[key] || key;
    }
  }));
  assignMissing('html', Object.freeze({ escape: escapeHtml }));
  assignMissing('requestIdleCallback', makeRequestIdleCallback());

  window.mw = mw;

  return Object.freeze({
    mw,
    hook: mw.hook,
    fireHook(name, ...args) {
      if (typeof mw.hook === 'function') mw.hook(name).fire(...args);
    },
    destroy() {
      hookRegistry.clear();
      if (previousMw) {
        assignedKeys.forEach((key) => delete mw[key]);
        window.mw = previousMw;
      } else {
        delete window.mw;
      }
    }
  });
}
