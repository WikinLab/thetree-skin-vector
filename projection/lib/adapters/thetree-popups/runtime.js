/*
 * Popups runtime host wiring for the Vector legacy shell.
 *
 * The renderer/template/gateway logic lives in adapters/thetree-popups/sourceBridge.js.
 * This module mirrors the upstream Popups action/reducer hover lifecycle at
 * the host boundary: link dwell, preview dwell, abandon start/end, target
 * switching, fetch abort, active preview render/hide, and cleanup.
 */
import { installTheTreeMediaWikiRuntime } from '../../../../lib/adapters/thetree-mediawiki/runtime.js';
import { createTheTreePopupsSettingsAdapter } from './settings.js';
import { createSettingsDialogRenderer } from './settingsDialog.js';
import createFooterLinkChangeListener from './footerLink.js';
import {
  previewActionTypes,
  previewReducer,
  createInitialPreviewState,
  createInitialSettingsState,
  settingsReducer,
  enabledPreviewTypesDiffer
} from './runtimeState.js';
import { createPopupsRuntimeTimers } from './runtimeTimers.js';
import { installPopupsRuntimeListeners } from './runtimeListeners.js';
import {
  FETCH_START_DELAY,
  FETCH_COMPLETE_TARGET_DELAY,
  ABANDON_END_DELAY,
  PREVIEW_SEEN_DURATION,
  PREVIEW_BEHAVIOR_BIND_DELAY,
  theTreePopupsSourceBridge
} from './sourceBridge.js';

export { FETCH_START_DELAY, FETCH_COMPLETE_TARGET_DELAY, ABANDON_END_DELAY, PREVIEW_SEEN_DURATION, PREVIEW_BEHAVIOR_BIND_DELAY };

export function createTheTreePopupsRuntime(popupsData = {}, options = {}) {
  let mediaWikiRuntime = options.mediaWikiRuntime || null;
  let ownsMediaWikiRuntime = false;
  let pageGateway = null;
  let referenceGateway = null;
  let activeTarget = null;
  let activePopup = null;
  let activePreview = null;
  let activePreviewOwner = null;
  let activeController = null;
  let activeTitleReservation = null;
  let activePreviewCleanup = null;
  let pendingTarget = null;
  let runtimeTimers = null;
  let runtimeListeners = null;
  let settingsAdapter = null;
  let settingsState = createInitialSettingsState();
  let settingsDialogRenderer = null;
  let settingsDialog = null;
  let footerLinkChangeListener = null;
  let destroyed = false;
  let token = 0;
  let previewState = createInitialPreviewState();
  const managedPreviews = new Set();

  function destroySettingsDialog() {
    if (settingsDialog && typeof settingsDialog.destroy === 'function') {
      settingsDialog.destroy();
    }
    if (footerLinkChangeListener && typeof footerLinkChangeListener.destroy === 'function') {
      footerLinkChangeListener.destroy();
    }
    settingsDialog = null;
    settingsDialogRenderer = null;
    footerLinkChangeListener = null;
  }

  function cleanupActivePreviewBehavior() {
    if (runtimeTimers) runtimeTimers.clear('behavior');
    if (activePreviewCleanup) {
      activePreviewCleanup();
      activePreviewCleanup = null;
    }
  }

  function releaseActiveTargetTitle() {
    if (activeTitleReservation) {
      theTreePopupsSourceBridge.releaseReservedTitle(activeTitleReservation);
      activeTitleReservation = null;
    }
  }

  function reserveActiveTargetTitle(target) {
    if (activeTitleReservation && activeTitleReservation.target === target) return;
    releaseActiveTargetTitle();
    activeTitleReservation = theTreePopupsSourceBridge.reserveTargetTitle(target);
  }

  function removeManagedPreviews() {
    Array.from(managedPreviews).forEach((preview) => {
      managedPreviews.delete(preview);
      if (preview && preview.el && typeof preview.el.remove === 'function') {
        preview.el.remove();
      }
    });
  }

  function removePopup() {
    cleanupActivePreviewBehavior();
    if (activePreview && activePreview.el && typeof activePreview.el.remove === 'function') {
      managedPreviews.delete(activePreview);
      activePreview.el.remove();
    } else if (activePopup && typeof activePopup.remove === 'function') {
      activePopup.remove();
    }
    activePreview = null;
    activePopup = null;
    activePreviewOwner = null;
  }

  function hideActivePopup() {
    if (!activePreview) {
      activePopup = null;
      activePreviewOwner = null;
      return;
    }
    cleanupActivePreviewBehavior();
    const preview = activePreview;
    managedPreviews.add(preview);
    activePreview = null;
    activePopup = null;
    activePreviewOwner = null;
    theTreePopupsSourceBridge.hidePreview(preview).then(() => {
      managedPreviews.delete(preview);
    }).catch((error) => {
      managedPreviews.delete(preview);
      if (window.mw && window.mw.errorLogger) {
        window.mw.errorLogger.logError(error, 'thetree.popups.hide');
      }
      if (preview.el && typeof preview.el.remove === 'function') {
        preview.el.remove();
      }
    });
  }

  function abortFetch() {
    pendingTarget = null;
    if (activeController) {
      activeController.abort();
      activeController = null;
    }
  }

  function hasPendingOrVisibleTarget(target) {
    return previewState.activeLink === target && Boolean(activePopup || (runtimeTimers && runtimeTimers.isActive('dwell')) || activeController || pendingTarget === target);
  }

  function transitionActiveTarget(target, owner) {
    if (activeTarget && activeTarget !== target) {
      hideActivePopup();
    }
    activePreviewOwner = owner || activePreviewOwner;
  }

  function bindActivePreviewBehavior(preview, target, currentToken) {
    cleanupActivePreviewBehavior();

    const bind = () => {
      if (destroyed || currentToken !== previewState.activeToken || activePreview !== preview || previewState.activeLink !== target) return;

      const popup = preview.el;
      const settingsButton = popup.querySelector('a.mwe-popups-settings-button');
      const handlePreviewEnter = () => {
        if (activePreview === preview && previewState.activeLink === target) {
          previewDwell();
        }
      };
      const handlePreviewLeave = () => {
        if (activePreview === preview && previewState.activeLink === target) {
          abandon();
        }
      };
      const handlePreviewClick = () => {
        if (activePreview === preview && previewState.activeLink === target) {
          linkClick(target);
        }
      };
      const handleSettingsButtonClick = (event) => {
        event.stopPropagation();
        showSettings(event);
      };
      popup.addEventListener('mouseenter', handlePreviewEnter);
      popup.addEventListener('mouseleave', handlePreviewLeave);
      popup.addEventListener('click', handlePreviewClick);
      if (settingsButton) {
        settingsButton.href = '#';
        settingsButton.addEventListener('click', handleSettingsButtonClick);
      }
      activePreviewCleanup = () => {
        popup.removeEventListener('mouseenter', handlePreviewEnter);
        popup.removeEventListener('mouseleave', handlePreviewLeave);
        popup.removeEventListener('click', handlePreviewClick);
        if (settingsButton) {
          settingsButton.removeEventListener('click', handleSettingsButtonClick);
        }
      };
    };

    const delay = options.previewBehaviorBindDelay ?? PREVIEW_BEHAVIOR_BIND_DELAY;
    if (delay > 0) {
      runtimeTimers.set('behavior', bind, delay);
    } else {
      bind();
    }
  }

  function previewShow(currentToken) {
    dispatch({ type: previewActionTypes.PREVIEW_SHOW, token: currentToken });
    runtimeTimers.clear('seen');
    runtimeTimers.set('seen', () => {
      if (previewState.activeToken === currentToken && previewState.fetchResponse) {
        dispatch({ type: previewActionTypes.PREVIEW_SEEN, token: currentToken });
      }
    }, PREVIEW_SEEN_DURATION);
  }

  function showModelForTarget(target, model, measures, currentToken) {
    if (destroyed || currentToken !== previewState.activeToken || previewState.activeLink !== target || !previewState.shouldShow) return;
    removePopup();
    removeManagedPreviews();
    const preview = theTreePopupsSourceBridge.createPreviewWithType(model, popupsData);
    const popup = preview.el;
    popup.setAttribute('data-tt-popups-runtime', 'legacy');
    managedPreviews.add(preview);
    pendingTarget = null;
    activePreview = preview;
    activePreviewOwner = preview.type || model.type || null;
    activePopup = popup;
    document.body.appendChild(popup);
    theTreePopupsSourceBridge.layoutPreview(preview, measures, popupsData.languageDirection);
    popup.style.display = 'block';
    if (popup.classList.contains('mwe-popups-type-reference')) {
      const scroll = popup.querySelector('.mwe-popups-scroll');
      if (scroll) scroll.dispatchEvent(new Event('scroll'));
    }
    bindActivePreviewBehavior(preview, target, currentToken);
    previewShow(currentToken);
  }

  function reconcilePreviewState(oldState, newState) {
    if (oldState.shouldShow && !newState.shouldShow && activePreview) {
      hideActivePopup();
    }

    if (newState.activeLink !== oldState.activeLink) {
      activeTarget = newState.activeLink || null;
    }

    if (!newState.activeLink && oldState.activeLink) {
      pendingTarget = null;
      activeTarget = null;
      releaseActiveTargetTitle();
      if (runtimeTimers) runtimeTimers.clear('seen');
    }

    if (newState.shouldShow && !activePreview && newState.fetchResponse && newState.activeLink && newState.measures) {
      showModelForTarget(newState.activeLink, newState.fetchResponse, newState.measures, newState.activeToken);
    }
  }

  function reconcileSettingsState(oldRootState, newRootState) {
    const oldSettings = oldRootState.settings;
    const newSettings = newRootState.settings;
    const oldEnabled = oldRootState.preview.enabled || {};
    const newEnabled = newRootState.preview.enabled || {};

    if (footerLinkChangeListener) {
      footerLinkChangeListener(oldRootState, newRootState);
    }
    if (!settingsDialogRenderer) return;

    if (settingsDialog && Object.keys(oldSettings.previewTypesEnabled || {}).length !== Object.keys(newSettings.previewTypesEnabled || {}).length) {
      settingsDialog.refresh(newSettings.previewTypesEnabled);
    }

    if (!oldSettings.shouldShow && newSettings.shouldShow) {
      if (!settingsDialog) {
        settingsDialog = settingsDialogRenderer({
          saveSettings,
          hideSettings
        }, newSettings.previewTypesEnabled);
        settingsDialog.appendTo(document.body);
      }
      settingsDialog.setEnabled(newEnabled);
      settingsDialog.show();
    } else if (oldSettings.shouldShow && !newSettings.shouldShow && settingsDialog) {
      settingsDialog.hide();
    } else if (settingsDialog && newSettings.shouldShow && enabledPreviewTypesDiffer(oldEnabled, newEnabled)) {
      settingsDialog.setEnabled(newEnabled);
    }

    if (settingsDialog && oldSettings.showHelp !== newSettings.showHelp) {
      settingsDialog.toggleHelp(newSettings.showHelp);
    }
  }

  function syncUserSettings(oldRootState, newRootState, action) {
    if (!settingsAdapter || !action || action.type !== previewActionTypes.SETTINGS_CHANGE) return;
    const oldEnabled = (oldRootState.preview && oldRootState.preview.enabled) || {};
    const newEnabled = (newRootState.preview && newRootState.preview.enabled) || {};
    if (!enabledPreviewTypesDiffer(oldEnabled, newEnabled)) return;
    Object.keys(newEnabled).forEach((type) => {
      if (oldEnabled[type] !== newEnabled[type]) {
        settingsAdapter.storePreviewTypeEnabled(type, newEnabled[type]);
      }
    });
  }

  function dispatch(action) {
    const oldRootState = Object.freeze({
      preview: previewState,
      settings: settingsState
    });
    previewState = previewReducer(previewState, action);
    settingsState = settingsReducer(settingsState, action);
    const newRootState = Object.freeze({
      preview: previewState,
      settings: settingsState
    });
    if (newRootState.preview !== oldRootState.preview) {
      reconcilePreviewState(oldRootState.preview, newRootState.preview);
    }
    if (newRootState.settings !== oldRootState.settings || newRootState.preview !== oldRootState.preview) {
      reconcileSettingsState(oldRootState, newRootState);
      syncUserSettings(oldRootState, newRootState, action);
    }
  }

  function abandon() {
    const currentToken = previewState.activeToken;
    if (!currentToken) return;
    runtimeTimers.clear('dwell');
    abortFetch();
    dispatch({ type: previewActionTypes.ABANDON_START, token: currentToken });
    runtimeTimers.set('hide', () => {
      dispatch({ type: previewActionTypes.ABANDON_END, token: currentToken });
    }, ABANDON_END_DELAY);
  }

  function previewDwell() {
    dispatch({ type: previewActionTypes.PREVIEW_DWELL });
  }

  function linkClick(target) {
    dispatch({ type: previewActionTypes.LINK_CLICK, el: target });
  }

  function showSettings(event) {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    dispatch({ type: previewActionTypes.SETTINGS_SHOW });
  }

  function hideSettings() {
    dispatch({ type: previewActionTypes.SETTINGS_HIDE });
  }

  function normalizeEnabledSettings(enabled = {}) {
    const normalized = {};
    for (const type of Object.keys(settingsState.previewTypesEnabled || {})) {
      normalized[type] = enabled[type] !== false;
    }
    return Object.freeze(normalized);
  }

  function saveSettings(enabled) {
    dispatch({
      type: previewActionTypes.SETTINGS_CHANGE,
      oldValue: previewState.enabled,
      newValue: normalizeEnabledSettings(enabled)
    });
  }

  function isPreviewTypeEnabled(previewType) {
    return previewState.enabled && previewState.enabled[previewType] !== false;
  }

  async function fetchPageForTarget(target, mwTitle, currentToken) {
    const controller = new AbortController();
    activeController = controller;
    const started = Date.now();
    dispatch({ type: previewActionTypes.FETCH_START, token: currentToken, promise: controller });
    try {
      const model = await pageGateway.fetchPreviewForTitle(mwTitle, controller.signal, target);
      const remaining = Math.max(FETCH_COMPLETE_TARGET_DELAY - (Date.now() - started), 0);
      if (remaining) await theTreePopupsSourceBridge.wait(remaining);
      dispatch({ type: previewActionTypes.FETCH_COMPLETE, el: target, result: model, token: currentToken });
    } catch (error) {
      if (error && error.name === 'AbortError') {
        dispatch({ type: previewActionTypes.FETCH_ABORTED, token: currentToken });
        return;
      }
      if (window.mw && window.mw.errorLogger) {
        window.mw.errorLogger.logError(error, 'thetree.popups');
      }
    } finally {
      if (activeController === controller) {
        activeController = null;
      }
      if (currentToken === previewState.activeToken && previewState.activeLink === target && !activePopup) {
        pendingTarget = null;
      }
    }
  }

  async function fetchReferenceForTarget(target, mwTitle, currentToken) {
    const started = Date.now();
    const promise = referenceGateway.fetchPreviewForTitle(mwTitle, target);
    dispatch({ type: previewActionTypes.FETCH_START, token: currentToken, promise });
    try {
      const model = await promise;
      const remaining = Math.max(FETCH_COMPLETE_TARGET_DELAY - (Date.now() - started), 0);
      if (remaining) await theTreePopupsSourceBridge.wait(remaining);
      dispatch({ type: previewActionTypes.FETCH_COMPLETE, el: target, result: model, token: currentToken });
    } catch (error) {
      if (error && error.textStatus === 'abort') {
        dispatch({ type: previewActionTypes.FETCH_ABORTED, token: currentToken });
        return;
      }
      if (window.mw && window.mw.errorLogger) {
        window.mw.errorLogger.logError(error, 'thetree.referencePreviews');
      }
    } finally {
      if (currentToken === previewState.activeToken && previewState.activeLink === target && !activePopup) {
        pendingTarget = null;
      }
    }
  }

  function showPageForTarget(target, mwTitle, measures, currentToken) {
    return fetchPageForTarget(target, mwTitle, currentToken);
  }

  function showReferenceForTarget(target, mwTitle, measures, currentToken) {
    return fetchReferenceForTarget(target, mwTitle, currentToken);
  }

  function armTarget(target, owner, measures, show) {
    runtimeTimers.clear('dwell');
    transitionActiveTarget(target, owner);
    activeTarget = target;
    activePreviewOwner = owner || activePreviewOwner;
    pendingTarget = target;
    token += 1;
    const currentToken = token;
    const promise = theTreePopupsSourceBridge.wait(options.fetchStartDelay ?? FETCH_START_DELAY);
    dispatch({
      type: previewActionTypes.LINK_DWELL,
      el: target,
      previewType: owner,
      measures,
      token: currentToken,
      promise
    });
    runtimeTimers.set('dwell', () => {
      if (previewState.activeToken === currentToken && previewState.activeLink === target) {
        show(currentToken);
      }
    }, options.fetchStartDelay ?? FETCH_START_DELAY);
  }

  function handleHover(event) {
    if (!popupsData.enabled) return;
    const referenceTarget = theTreePopupsSourceBridge.eventReferenceTarget(event);
    if (referenceTarget) {
      if (!isPreviewTypeEnabled('reference')) return;
      const mwTitle = theTreePopupsSourceBridge.titleFromReferenceElement(referenceTarget, popupsData);
      if (!mwTitle || !mwTitle.getFragment()) return;
      reserveActiveTargetTitle(referenceTarget);
      if (hasPendingOrVisibleTarget(referenceTarget)) {
        previewDwell();
        return;
      }
      const measures = theTreePopupsSourceBridge.createMeasures(referenceTarget, event);
      armTarget(referenceTarget, 'reference', measures, (currentToken) => {
        showReferenceForTarget(referenceTarget, mwTitle, measures, currentToken);
      });
      return;
    }

    const target = theTreePopupsSourceBridge.eventPageTarget(event);
    if (!target || !isPreviewTypeEnabled('page')) return;
    const mwTitle = theTreePopupsSourceBridge.titleFromElement(target, popupsData);
    if (!mwTitle) return;
    reserveActiveTargetTitle(target);
    if (hasPendingOrVisibleTarget(target)) {
      previewDwell();
      return;
    }
    const measures = theTreePopupsSourceBridge.createMeasures(target, event);
    armTarget(target, 'page', measures, (currentToken) => {
      showPageForTarget(target, mwTitle, measures, currentToken);
    });
  }

  function handleOut(event) {
    if (theTreePopupsSourceBridge.eventLeavesTarget(event, activeTarget)) {
      abandon();
    }
  }

  function handleClick(event) {
    if (theTreePopupsSourceBridge.eventContainsTarget(event, activeTarget)) {
      linkClick(activeTarget);
      abandon();
    }
  }

  function init() {
    if (typeof window === 'undefined' || destroyed) return;
    if (!popupsData.enabled) return;
    runtimeTimers = createPopupsRuntimeTimers(window);
    if (!mediaWikiRuntime) {
      mediaWikiRuntime = installTheTreeMediaWikiRuntime(popupsData, options);
      ownsMediaWikiRuntime = true;
    }
    settingsAdapter = createTheTreePopupsSettingsAdapter(options.theTreeSettings || {});
    settingsAdapter.migrateOldPreferences();
    const initiallyEnabled = settingsAdapter.getPreviewTypesEnabled();
    previewState = createInitialPreviewState();
    settingsState = createInitialSettingsState();
    settingsDialogRenderer = createSettingsDialogRenderer(popupsData.messages || {});
    footerLinkChangeListener = createFooterLinkChangeListener({ showSettings }, popupsData.messages || {});
    dispatch({
      type: previewActionTypes.BOOT,
      initiallyEnabled,
      user: { isAnon: true }
    });
    pageGateway = theTreePopupsSourceBridge.createTheTreePopupsGateway(popupsData, options);
    referenceGateway = theTreePopupsSourceBridge.createReferenceGateway();
    runtimeListeners = installPopupsRuntimeListeners(document, {
      handleHover,
      handleOut,
      handleClick,
      abandon
    });
  }

  function destroy() {
    destroyed = true;
    if (runtimeListeners) {
      runtimeListeners.destroy();
      runtimeListeners = null;
    }
    if (runtimeTimers) {
      runtimeTimers.clearAll();
    }
    destroySettingsDialog();
    abortFetch();
    releaseActiveTargetTitle();
    removePopup();
    removeManagedPreviews();
    previewState = createInitialPreviewState();
    settingsState = createInitialSettingsState();
    activeTarget = null;
    pendingTarget = null;
    activePreview = null;
    activePreviewOwner = null;
    pageGateway = null;
    referenceGateway = null;
    settingsAdapter = null;
    footerLinkChangeListener = null;
    runtimeTimers = null;
    if (mediaWikiRuntime && ownsMediaWikiRuntime) {
      mediaWikiRuntime.destroy();
      mediaWikiRuntime = null;
      ownsMediaWikiRuntime = false;
    }
  }

  return Object.freeze({
    init,
    destroy,
    get selector() {
      return theTreePopupsSourceBridge.eligibleLinkSelector;
    }
  });
}
