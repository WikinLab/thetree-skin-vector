/* thetree event-measure adapter around the upstream Popups layout functions. */
export {
  createLayout,
  getClosestYPosition
} from '../../generated/mediawiki-popups/src/ui/renderer.layout.js';

export function createMeasures(target, event) {
  const bbox = target.getBoundingClientRect();
  const scrollTop = window.scrollY;
  return Object.freeze({
    pageX: event.pageX,
    pageY: event.pageY,
    clientY: event.clientY,
    width: target.offsetWidth,
    height: target.offsetHeight,
    offset: Object.freeze({
      top: scrollTop + bbox.y,
      left: window.scrollX + bbox.x
    }),
    clientRects: target.getClientRects(),
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    scrollTop
  });
}
