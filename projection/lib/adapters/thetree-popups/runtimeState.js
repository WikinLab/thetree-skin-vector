/*
 * Popups runtime reducer state.
 *
 * This is the host-side equivalent of the Popups action/reducer lifecycle. It
 * does not know about DOM listeners, gateways, timers, or the tree settings
 * storage; those remain runtime bridge concerns.
 */
export const previewActionTypes = Object.freeze({
  LINK_DWELL: 'LINK_DWELL',
  ABANDON_START: 'ABANDON_START',
  ABANDON_END: 'ABANDON_END',
  LINK_CLICK: 'LINK_CLICK',
  FETCH_START: 'FETCH_START',
  FETCH_COMPLETE: 'FETCH_COMPLETE',
  FETCH_ABORTED: 'FETCH_ABORTED',
  PREVIEW_DWELL: 'PREVIEW_DWELL',
  PREVIEW_SHOW: 'PREVIEW_SHOW',
  PREVIEW_SEEN: 'PREVIEW_SEEN',
  SETTINGS_SHOW: 'SETTINGS_SHOW',
  SETTINGS_HIDE: 'SETTINGS_HIDE',
  SETTINGS_CHANGE: 'SETTINGS_CHANGE',
  REGISTER_SETTING: 'REGISTER_SETTING',
  BOOT: 'BOOT'
});

export function nextPreviewState(state, changes) {
  return Object.freeze({ ...state, ...changes });
}

export function createInitialPreviewState() {
  return Object.freeze({
    enabled: Object.freeze({}),
    activeLink: undefined,
    previewType: undefined,
    measures: undefined,
    activeToken: '',
    shouldShow: false,
    isUserDwelling: false,
    wasClicked: false,
    promise: undefined,
    fetchResponse: undefined
  });
}

export function previewReducer(state, action) {
  switch (action.type) {
    case previewActionTypes.BOOT:
      return nextPreviewState(state, {
        enabled: Object.freeze({ ...(action.initiallyEnabled || {}) })
      });

    case previewActionTypes.REGISTER_SETTING:
      return nextPreviewState(state, {
        enabled: Object.freeze({
          ...(state.enabled || {}),
          [action.name]: action.enabled
        })
      });

    case previewActionTypes.SETTINGS_CHANGE:
      return nextPreviewState(state, {
        enabled: Object.freeze({ ...(action.newValue || {}) })
      });

    case previewActionTypes.LINK_DWELL:
      if (action.el !== state.activeLink) {
        return nextPreviewState(state, {
          activeLink: action.el,
          previewType: action.previewType,
          measures: action.measures,
          activeToken: action.token,
          shouldShow: false,
          isUserDwelling: true,
          wasClicked: false,
          promise: action.promise,
          fetchResponse: undefined
        });
      }
      return nextPreviewState(state, { isUserDwelling: true });

    case previewActionTypes.FETCH_START:
      return nextPreviewState(state, {
        fetchResponse: undefined,
        promise: action.promise
      });

    case previewActionTypes.FETCH_COMPLETE:
      if (action.token === state.activeToken) {
        return nextPreviewState(state, {
          fetchResponse: action.result,
          shouldShow: state.isUserDwelling
        });
      }
      return state;

    case previewActionTypes.FETCH_ABORTED:
    case previewActionTypes.ABANDON_END:
      if (action.token === state.activeToken && !state.isUserDwelling) {
        return nextPreviewState(state, {
          activeLink: undefined,
          previewType: undefined,
          activeToken: undefined,
          measures: undefined,
          fetchResponse: undefined,
          shouldShow: false,
          promise: undefined
        });
      }
      return state;

    case previewActionTypes.PREVIEW_DWELL:
      return nextPreviewState(state, { isUserDwelling: true });

    case previewActionTypes.ABANDON_START:
      return nextPreviewState(state, {
        isUserDwelling: false,
        wasClicked: false
      });

    case previewActionTypes.LINK_CLICK:
      return nextPreviewState(state, { wasClicked: true });

    default:
      return state;
  }
}

export function createInitialSettingsState() {
  return Object.freeze({
    shouldShow: false,
    previewTypesEnabled: Object.freeze({}),
    showHelp: false,
    shouldShowFooterLink: false
  });
}

export function settingsReducer(state, action) {
  switch (action.type) {
    case previewActionTypes.SETTINGS_SHOW:
      return nextPreviewState(state, {
        shouldShow: true,
        showHelp: false
      });

    case previewActionTypes.SETTINGS_HIDE:
      return nextPreviewState(state, {
        shouldShow: false,
        showHelp: false
      });

    case previewActionTypes.SETTINGS_CHANGE: {
      const types = Object.keys(action.newValue || {});
      const nothingChanged = types.every((type) => action.oldValue && action.oldValue[type] === action.newValue[type]);
      const userOptedOut = types.some((type) => action.oldValue && action.oldValue[type] && !action.newValue[type]);
      const anyDisabled = types.some((type) => action.newValue[type] === false);
      if (nothingChanged) {
        return nextPreviewState(state, { shouldShow: false });
      }
      return nextPreviewState(state, {
        shouldShow: userOptedOut,
        showHelp: userOptedOut,
        shouldShowFooterLink: anyDisabled
      });
    }

    case previewActionTypes.REGISTER_SETTING: {
      const previewTypesEnabled = Object.freeze({
        ...state.previewTypesEnabled,
        [action.name]: action.enabled
      });
      return nextPreviewState(state, {
        previewTypesEnabled,
        shouldShowFooterLink: state.shouldShowFooterLink || !action.enabled
      });
    }

    case previewActionTypes.BOOT: {
      const initiallyEnabled = action.initiallyEnabled || {};
      const anyDisabled = Object.keys(initiallyEnabled).some((type) => initiallyEnabled[type] === false);
      return nextPreviewState(state, {
        previewTypesEnabled: Object.freeze({ ...initiallyEnabled }),
        shouldShowFooterLink: Boolean(action.user && action.user.isAnon) && anyDisabled
      });
    }

    default:
      return state;
  }
}

export function enabledPreviewTypesDiffer(oldEnabled = {}, newEnabled = {}) {
  const keys = new Set([...Object.keys(oldEnabled || {}), ...Object.keys(newEnabled || {})]);
  for (const key of keys) {
    if ((oldEnabled || {})[key] !== (newEnabled || {})[key]) return true;
  }
  return false;
}
