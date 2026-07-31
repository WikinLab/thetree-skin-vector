/*
 * Port of Popups src/changeListeners/footerLink.js with the TheTree/Vue
 * lifecycle isolated to the footer mount adapter.  Upstream Popups owns the
 * change-listener contract: create one settings link, show it when
 * settings.shouldShowFooterLink is true, hide it otherwise, and call
 * showSettings() on click.  The adapter owns only locating and cleaning up the
 * runtime-owned DOM node in the tree-hosted Vector footer.
 */

const FOOTER_LINK_OWNER_ATTR = 'data-tt-popups-footer-link';

function messageText(messages, key) {
  return (messages && messages[key]) || key;
}

function mediaWikiFooterCandidates() {
  return [
    document.querySelector('#footer-places'),
    document.querySelector('#f-list'),
    (() => {
      const footerLegacy = document.querySelector('#footer li');
      return footerLegacy ? footerLegacy.parentNode : null;
    })()
  ].filter(Boolean);
}

function findFooterList() {
  return mediaWikiFooterCandidates()[0] || null;
}

function removeOwnedFooterLinks(footer) {
  if (!footer) return;
  footer.querySelectorAll(`li[${FOOTER_LINK_OWNER_ATTR}="1"]`).forEach((node) => node.remove());
}

export function createFooterLink(messages = {}) {
  const footer = findFooterList();
  if (!footer) return null;

  removeOwnedFooterLinks(footer);

  const footerListItem = document.createElement('li');
  footerListItem.setAttribute(FOOTER_LINK_OWNER_ATTR, '1');
  const footerLinkElement = document.createElement('a');
  footerLinkElement.href = '#';
  footerLinkElement.textContent = messageText(messages, 'popups-settings-enable');
  footerListItem.appendChild(footerLinkElement);
  footerListItem.style.display = 'none';
  footer.appendChild(footerListItem);
  return footerListItem;
}

export default function footerLink(boundActions, messages = {}) {
  let footerListItem;
  let handleClick;

  function ensureFooterLink() {
    if (footerListItem && footerListItem.isConnected) return footerListItem;
    footerListItem = createFooterLink(messages);
    if (!footerListItem) return null;
    const footerLinkElement = footerListItem.querySelector('a');
    handleClick = (event) => {
      event.preventDefault();
      boundActions.showSettings();
    };
    footerLinkElement.addEventListener('click', handleClick);
    return footerListItem;
  }

  const listener = (oldState, newState) => {
    const node = ensureFooterLink();
    if (!node) return;

    if (newState.settings.shouldShowFooterLink) {
      node.style.display = '';
    } else {
      node.style.display = 'none';
    }
  };

  listener.destroy = () => {
    if (footerListItem) {
      const footerLinkElement = footerListItem.querySelector('a');
      if (footerLinkElement && handleClick) {
        footerLinkElement.removeEventListener('click', handleClick);
      }
      footerListItem.remove();
    }
    footerListItem = null;
    handleClick = null;
  };

  return listener;
}
