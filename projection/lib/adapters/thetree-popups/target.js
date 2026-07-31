/* thetree host target lifecycle for the Popups title port. */
import {
  eligiblePageLinkSelector,
  eligibleReferenceLinkSelector
} from '../../ports/mediawiki-popups/src/constants.js';

export const RESERVED_TITLE_ATTRIBUTE = 'data-tt-popups-reserved-title';

function eventBaseTarget(event) {
  let target = event && event.target;
  if (!target) return null;
  if (target.nodeType === 3) target = target.parentNode;
  if (target === document || !target.closest) return null;
  return target;
}

export function eventPageTarget(event) {
  const target = eventBaseTarget(event);
  return target ? target.closest(eligiblePageLinkSelector) : null;
}

export function eventReferenceTarget(event) {
  const target = eventBaseTarget(event);
  return target ? target.closest(eligibleReferenceLinkSelector) : null;
}

export function eventTargetElement(event) {
  return eventReferenceTarget(event) || eventPageTarget(event);
}

export function reserveTargetTitle(target) {
  if (!target || typeof target.hasAttribute !== 'function' || !target.hasAttribute('title')) {
    return null;
  }
  if (!target.hasAttribute(RESERVED_TITLE_ATTRIBUTE)) {
    target.setAttribute(RESERVED_TITLE_ATTRIBUTE, target.getAttribute('title') || '');
  }
  target.removeAttribute('title');
  return Object.freeze({ target });
}

export function releaseReservedTitle(reservationOrTarget) {
  const target = reservationOrTarget && reservationOrTarget.target
    ? reservationOrTarget.target
    : reservationOrTarget;
  if (!target || typeof target.hasAttribute !== 'function' || !target.hasAttribute(RESERVED_TITLE_ATTRIBUTE)) {
    return;
  }
  target.setAttribute('title', target.getAttribute(RESERVED_TITLE_ATTRIBUTE) || '');
  target.removeAttribute(RESERVED_TITLE_ATTRIBUTE);
}

export function eventContainsTarget(event, target) {
  const base = eventBaseTarget(event);
  return Boolean(target && base && (base === target || (typeof target.contains === 'function' && target.contains(base))));
}

export function eventLeavesTarget(event, target) {
  if (!eventContainsTarget(event, target)) return false;
  const related = event.relatedTarget;
  return !(related && typeof target.contains === 'function' && target.contains(related));
}
