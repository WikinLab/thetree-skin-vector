/*
 * Popups runtime host listener attachment.
 *
 * The listener list mirrors the ResourceLoader Popups hover lifecycle boundary:
 * target dwell starts from mouseover/keyboard focus, abandon runs on mouseout or
 * document blur, and clicks mark the active target before the abandon transition.
 */
export function installPopupsRuntimeListeners(documentObject, handlers) {
  documentObject.addEventListener('mouseover', handlers.handleHover);
  documentObject.addEventListener('keyup', handlers.handleHover);
  documentObject.addEventListener('mouseout', handlers.handleOut);
  documentObject.addEventListener('blur', handlers.abandon, true);
  documentObject.addEventListener('click', handlers.handleClick);

  return Object.freeze({
    destroy() {
      documentObject.removeEventListener('mouseover', handlers.handleHover);
      documentObject.removeEventListener('keyup', handlers.handleHover);
      documentObject.removeEventListener('mouseout', handlers.handleOut);
      documentObject.removeEventListener('blur', handlers.abandon, true);
      documentObject.removeEventListener('click', handlers.handleClick);
    }
  });
}
