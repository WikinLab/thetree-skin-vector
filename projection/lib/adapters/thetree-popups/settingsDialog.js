/* thetree SPA cleanup adapter around the generated upstream Popups renderer. */

import createUpstreamSettingsDialogRenderer from '../../generated/mediawiki-popups/src/ui/settingsDialogRenderer.js';

export function createSettingsDialogRenderer() {
  const renderUpstream = createUpstreamSettingsDialogRenderer();

  return (boundActions, previewTypesEnabled) => {
    const upstreamDialog = renderUpstream(boundActions, previewTypesEnabled);
    let ownedOverlay = null;

    return Object.freeze({
      ...upstreamDialog,
      appendTo(element) {
        const existingChildren = new Set(element.children);
        upstreamDialog.appendTo(element);
        ownedOverlay = [...element.children].find((child) => (
          !existingChildren.has(child) && child.classList?.contains('mwe-popups-overlay')
        )) || null;
      },
      destroy() {
        if (ownedOverlay) ownedOverlay.remove();
        ownedOverlay = null;
      }
    });
  };
}
