/* thetree SPA lifecycle adapter around the generated upstream Popups listener. */

import createUpstreamFooterLink from '../../generated/mediawiki-popups/src/changeListeners/footerLink.js';

const FOOTER_LINK_OWNER_ATTR = 'data-tt-popups-footer-link';

function footerLists() {
  return [
    document.querySelector('#footer-places'),
    document.querySelector('#f-list'),
    document.querySelector('#footer li')?.parentNode || null
  ].filter(Boolean);
}

function childSnapshots() {
  return new Map(footerLists().map((footer) => [footer, new Set(footer.children)]));
}

function findAppendedFooterItem(before) {
  for (const [footer, children] of before) {
    const appended = [...footer.children].find((child) => !children.has(child));
    if (appended) return appended;
  }
  return null;
}

export default function createFooterLinkChangeListener(boundActions) {
  let upstreamListener = createUpstreamFooterLink(boundActions);
  let ownedNode = null;

  const listener = (oldState, newState) => {
    if (ownedNode && !ownedNode.isConnected) {
      upstreamListener = createUpstreamFooterLink(boundActions);
      ownedNode = null;
    }
    const before = ownedNode ? null : childSnapshots();
    upstreamListener(oldState, newState);
    if (!ownedNode && before) {
      ownedNode = findAppendedFooterItem(before);
      if (ownedNode) ownedNode.setAttribute(FOOTER_LINK_OWNER_ATTR, '1');
    }
  };

  listener.destroy = () => {
    if (ownedNode) ownedNode.remove();
    ownedNode = null;
  };

  return listener;
}
