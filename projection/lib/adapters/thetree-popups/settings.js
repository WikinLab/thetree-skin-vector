/*
 * the tree host adapter for upstream Popups settings storage.
 *
 * Upstream Popups owns settings UI, state transitions, footer link display,
 * message keys, and renderer behaviour.  This adapter owns only the
 * platform-dependent preference boundary: MediaWiki user options / mw.storage
 * are translated to the tree's localConfig + localStorage('thetree_settings').
 */

const THE_TREE_SETTINGS_STORAGE_KEY = 'thetree_settings';
const POPUPS_TYPE_PAGE = 'page';
const POPUPS_TYPE_REFERENCE = 'reference';
const PREVIEW_TYPES = Object.freeze([POPUPS_TYPE_PAGE, POPUPS_TYPE_REFERENCE]);

const PREVIEW_TYPE_STORAGE_KEYS = Object.freeze({
  [POPUPS_TYPE_PAGE]: 'mwe-popups-page-enabled',
  [POPUPS_TYPE_REFERENCE]: 'mwe-popups-reference-enabled'
});

const LEGACY_DISABLED_STORAGE_KEYS = Object.freeze({
  [POPUPS_TYPE_PAGE]: ['mwe-popups-enabled'],
  [POPUPS_TYPE_REFERENCE]: ['mwe-popups-referencePreviews-enabled']
});

function parseSettingsJson(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

function readStoredTheTreeSettings() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    return parseSettingsJson(window.localStorage.getItem(THE_TREE_SETTINGS_STORAGE_KEY));
  } catch (error) {
    return {};
  }
}

function writeStoredTheTreeSettings(settings) {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    window.localStorage.setItem(THE_TREE_SETTINGS_STORAGE_KEY, JSON.stringify(settings || {}));
    return true;
  } catch (error) {
    return false;
  }
}

function coercePreviewTypeEnabled(value) {
  if (value === undefined || value === null || value === '' || value === true || value === '1' || value === 1) return true;
  if (value === false || value === '0' || value === 0) return false;
  return Boolean(value);
}

function normalizePreviewType(previewType) {
  return PREVIEW_TYPES.includes(previewType) ? previewType : null;
}

function readLocalConfig(options = {}) {
  if (typeof options.getLocalConfig === 'function') {
    const value = options.getLocalConfig();
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  }
  if (options.localConfig && typeof options.localConfig === 'object' && !Array.isArray(options.localConfig)) {
    return options.localConfig;
  }
  return readStoredTheTreeSettings();
}

function setLocalConfigValue(options, key, value) {
  if (typeof options.setLocalConfigValue === 'function') {
    options.setLocalConfigValue(key, value);
    return true;
  }

  const settings = readStoredTheTreeSettings();
  if (value === undefined) {
    delete settings[key];
  } else {
    settings[key] = value;
  }
  return writeStoredTheTreeSettings(settings);
}

function removeLocalConfigValue(options, key) {
  if (options.localConfig && typeof options.localConfig === 'object' && !Array.isArray(options.localConfig)) {
    delete options.localConfig[key];
  }
  return setLocalConfigValue(options, key, undefined);
}

export function createTheTreePopupsSettingsAdapter(options = {}) {
  const adapterOptions = Object.freeze({ ...options });

  function localConfig() {
    return readLocalConfig(adapterOptions);
  }

  function isPreviewTypeEnabled(previewType) {
    const type = normalizePreviewType(previewType);
    if (!type) return true;
    const value = localConfig()[PREVIEW_TYPE_STORAGE_KEYS[type]];
    return coercePreviewTypeEnabled(value);
  }

  function getPreviewTypesEnabled() {
    return Object.freeze(PREVIEW_TYPES.reduce((enabled, previewType) => {
      enabled[previewType] = isPreviewTypeEnabled(previewType);
      return enabled;
    }, {}));
  }

  function storePreviewTypeEnabled(previewType, enabled) {
    const type = normalizePreviewType(previewType);
    if (!type) return;
    const key = PREVIEW_TYPE_STORAGE_KEYS[type];
    if (enabled) {
      removeLocalConfigValue(adapterOptions, key);
    } else {
      setLocalConfigValue(adapterOptions, key, '0');
    }
    if (typeof window !== 'undefined' && window.mw && typeof window.mw.track === 'function') {
      window.mw.track('Popups.SettingChange', {
        previewType: type,
        action: enabled ? 'anonymousEnabled' : 'anonymousDisabled'
      });
    }
  }

  function migrateOldPreferences() {
    for (const previewType of PREVIEW_TYPES) {
      for (const key of LEGACY_DISABLED_STORAGE_KEYS[previewType]) {
        const config = localConfig();
        if (coercePreviewTypeEnabled(config[key]) === false || config[key] === '0' || config[key] === true) {
          removeLocalConfigValue(adapterOptions, key);
          storePreviewTypeEnabled(previewType, false);
        }
      }
    }
  }

  return Object.freeze({
    previewTypes: PREVIEW_TYPES,
    storageKeys: PREVIEW_TYPE_STORAGE_KEYS,
    migrateOldPreferences,
    isPreviewTypeEnabled,
    storePreviewTypeEnabled,
    getPreviewTypesEnabled
  });
}
