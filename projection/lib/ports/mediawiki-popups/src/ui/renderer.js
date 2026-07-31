/*
 * SPDX-License-Identifier: GPL-2.0-or-later
 * Modified by thetree-skin-vector, 2026-07-29 and 2026-07-30.
 * Source provenance: ORIGIN-MANIFEST.json and NOTICE.
 *
 * Popups page and reference preview rendering.
 */
import { SIZES, pointerSize, previewTypes, TYPE_REFERENCE } from '../constants.js';
import {
  createLayout,
  getClasses,
  hasPointerOnImage
} from '../../../../generated/mediawiki-popups/src/ui/renderer.layout.js';

export { getClasses, hasPointerOnImage };
import { wait } from '../wait.js';
import { createThumbnail, getExtractWidth, supportsCSSClipPath } from './thumbnail.js';
import {
  createNodeFromTemplate,
  escapeHtml,
  genericPreviewTemplateHTML,
  pagePreviewTemplateHTML,
  referencePreviewTemplateHTML,
  renderPopup,
  replaceWith
} from './templates/index.js';

export function renderPagePreview(model, thumbnail, withCSSClipPath, linkTitle) {
  const el = renderPopup(model.type, createNodeFromTemplate(pagePreviewTemplateHTML));
  const linkDiscreet = el.querySelector('.mwe-popups-discreet');
  const extract = el.querySelector('.mwe-popups-extract');
  extract.setAttribute('href', model.url);
  linkDiscreet.setAttribute('href', model.url);
  extract.setAttribute('dir', model.languageDirection);
  extract.setAttribute('lang', model.languageCode);
  el.querySelector('.mwe-popups-settings-button').setAttribute('title', linkTitle);
  const label = el.querySelector('.mwe-popups-settings-button-label');
  label.textContent = window.mw.msg('popups-settings-icon-gear-title');

  if (thumbnail) {
    linkDiscreet.appendChild(thumbnail.el);
  } else {
    linkDiscreet.remove();
  }

  if (model.extract) {
    if (typeof model.extract === 'string') {
      extract.innerHTML = model.extract;
    } else {
      extract.append(...model.extract);
    }
    const extractWidth = getExtractWidth(thumbnail);
    if (!withCSSClipPath) {
      extract.style.width = extractWidth;
      el.querySelector('footer').style.width = extractWidth;
    }
  }

  return el;
}

export function renderPreview(model, message, linkMsg) {
  const popup = renderPopup(model.type, createNodeFromTemplate(genericPreviewTemplateHTML));
  const msg = popup.querySelector('.mwe-popups-message');
  const extract = popup.querySelector('.mwe-popups-extract');
  const icon = popup.querySelector('.popups-icon');
  const readLink = popup.querySelector('.mwe-popups-read-link');
  readLink.setAttribute('href', model.url);
  readLink.textContent = linkMsg;

  if (model.type === previewTypes.TYPE_GENERIC) {
    extract.setAttribute('href', model.url);
    if (!message) {
      msg.append(...model.extract);
    } else {
      msg.innerHTML = message;
    }
    icon.classList.add('popups-icon--preview-generic');
  } else if (model.type === previewTypes.TYPE_DISAMBIGUATION) {
    extract.setAttribute('href', model.url);
    msg.append(...model.extract);
    icon.classList.add('popups-icon--preview-disambiguation');
  }

  const title = popup.querySelector('.mwe-popups-title');
  title.innerHTML += escapeHtml(model.title);
  return popup;
}

export function renderReferencePreview(model) {
  const type = model.referenceType || 'generic';
  let titleMsg = window.mw.message(`cite-reference-previews-${type}`);
  if (!titleMsg.exists()) {
    titleMsg = window.mw.message('cite-reference-previews-reference');
  }

  const el = createNodeFromTemplate(referencePreviewTemplateHTML);

  replaceWith(
    el.querySelector('.mwe-popups-title-placeholder'),
    window.mw.html.escape(titleMsg.text())
  );
  el.querySelector('.mwe-popups-title .popups-icon')
    .classList.add(`popups-icon--reference-${type}`);
  el.querySelector('.mw-parser-output')
    .innerHTML = model.extract;

  Array.prototype.forEach.call(
    el.querySelectorAll('.mwe-popups-extract a[href][class~="external"]:not([target])'),
    (a) => {
      a.target = '_blank';
      a.rel = `${a.rel ? `${a.rel} ` : ''}noopener`;
    }
  );

  Array.prototype.forEach.call(el.querySelectorAll('.mw-collapsible'), (node) => {
    const otherNode = document.createElement('div');
    otherNode.classList.add('mwe-collapsible-placeholder');
    const icon = document.createElement('span');
    icon.classList.add('popups-icon', 'popups-icon--infoFilled');
    const label = document.createElement('span');
    label.classList.add('mwe-collapsible-placeholder-label');
    label.textContent = window.mw.msg('cite-reference-previews-collapsible-placeholder');
    otherNode.appendChild(icon);
    otherNode.appendChild(label);
    replaceWith(node, otherNode);
  });

  const undoHeaderSort = (headerSort) => {
    headerSort.classList.remove('headerSort');
    headerSort.removeAttribute('tabindex');
    headerSort.removeAttribute('title');
  };
  Array.prototype.forEach.call(el.querySelectorAll('table.sortable'), (node) => {
    node.classList.remove('sortable', 'jquery-tablesorter');
    Array.prototype.forEach.call(node.querySelectorAll('.headerSort'), undoHeaderSort);
  });

  const settingsButton = document.createElement('a');
  settingsButton.classList.add('cdx-button', 'cdx-button--fake-button', 'cdx-button--fake-button--enabled', 'cdx-button--weight-quiet', 'cdx-button--icon-only', 'mwe-popups-settings-button');
  const settingsIcon = document.createElement('span');
  settingsIcon.classList.add('popups-icon', 'popups-icon--size-small', 'popups-icon--settings');
  const settingsButtonLabel = document.createElement('span');
  settingsButtonLabel.textContent = window.mw.msg('popups-settings-icon-gear-title');
  settingsButton.append(settingsIcon);
  settingsButton.append(settingsButtonLabel);
  el.querySelector('.mwe-popups-settings').appendChild(settingsButton);

  function getExperiment() {
    return window.mw.loader.using('ext.testKitchen').then(
      () => window.mw.testKitchen.getExperiment('cite-footnote-content-interaction-experiment')
    );
  }

  if (!window.mw.config.get('wgMFMode')) {
    getExperiment().then((experiment) => {
      if (experiment && experiment.getAssignedGroup() === 'treatment') {
        const reflistLink = el.querySelector('.mwe-popups-reflist-link');
        reflistLink.textContent = window.mw.msg('cite-reference-previews-reflist-link');
        reflistLink.addEventListener('click', () => {
          experiment.send('click-goto-references');
          const targetId = model.url ? model.url.slice(1) : null;
          const targetElement = document.getElementById(targetId);
          const previousHighlight = document.querySelector('.mwe-popups-ref-highlight');
          if (previousHighlight) {
            previousHighlight.classList.remove('mwe-popups-ref-highlight');
          }
          if (targetElement) {
            targetElement.scrollIntoView();
            targetElement.classList.add('mwe-popups-ref-highlight');
          }
        });
      }
    });
  }

  el.querySelector('.mwe-popups-scroll').addEventListener('scroll', (e) => {
    const element = e.target;
    const scrolledToBottom = element.scrollTop >= element.scrollHeight - element.clientHeight - 1;

    if (!scrolledToBottom && element.isScrolling) {
      return;
    }

    const extract = element.parentNode;
    const hasHorizontalScroll = element.scrollWidth > element.clientWidth;
    const scrollbarHeight = element.offsetHeight - element.clientHeight;
    const hasVerticalScroll = element.scrollHeight > element.clientHeight;
    const scrollbarWidth = element.offsetWidth - element.clientWidth;
    const fade = extract.querySelector('.mwe-popups-fade');
    fade.style.bottom = hasHorizontalScroll ? `${scrollbarHeight}px` : 0;
    fade.style.right = hasVerticalScroll ? `${scrollbarWidth}px` : 0;

    element.isScrolling = !scrolledToBottom;
    extract.classList.toggle('mwe-popups-fade-out', element.isScrolling);
    extract.setAttribute('lang', window.mw.config.get('wgPageContentLanguage'));
  });

  return el;
}

export function createReferencePreview(model) {
  return Object.freeze({
    el: renderReferencePreview(model),
    hasThumbnail: false,
    isTall: false,
    type: TYPE_REFERENCE
  });
}

function createEmptyPreview(model, popupsData) {
  const genericModel = Object.freeze({
    ...model,
    type: previewTypes.TYPE_GENERIC,
    title: popupsData.messages.noPreview,
    extract: []
  });
  return Object.freeze({
    el: renderPreview(genericModel, null, popupsData.messages.read),
    hasThumbnail: false,
    thumbnail: null,
    isTall: false,
    type: previewTypes.TYPE_GENERIC
  });
}

function createPagePreview(model) {
  const withCSSClipPath = supportsCSSClipPath();
  const thumbnail = createThumbnail(model.thumbnail, withCSSClipPath);
  const hasThumbnail = thumbnail !== null;
  return Object.freeze({
    el: renderPagePreview(
      model,
      thumbnail,
      withCSSClipPath,
      window.mw.msg('popups-settings-icon-gear-title')
    ),
    hasThumbnail,
    thumbnail,
    isTall: hasThumbnail && thumbnail.isTall,
    type: previewTypes.TYPE_PAGE
  });
}

export function createPreviewWithType(model, popupsData) {
  if (model.type === TYPE_REFERENCE) {
    return createReferencePreview(model);
  }
  if (model.type === previewTypes.TYPE_PAGE && model.extract && model.extract.length) {
    return createPagePreview(model);
  }
  return createEmptyPreview(model, popupsData);
}

export function createPreviewElement(model, popupsData) {
  return createPreviewWithType(model, popupsData).el;
}

export function layoutPreview(preview, measures, dir) {
  const layout = createLayout(preview.isTall, measures, pointerSize, dir || 'ltr');
  const popup = preview.el;
  popup.classList.remove(
    'flipped-x',
    'flipped-y',
    'flipped-x-y',
    'mwe-popups-fade-in-up',
    'mwe-popups-fade-in-down',
    'mwe-popups-fade-out-up',
    'mwe-popups-fade-out-down',
    'mwe-popups-image-pointer',
    'mwe-popups-no-image-pointer',
    'mwe-popups-is-tall',
    'mwe-popups-is-not-tall'
  );

  if (!layout.flippedY
    && !preview.isTall
    && preview.hasThumbnail
    && preview.thumbnail.height < SIZES.landscapeImage.h
    && !supportsCSSClipPath()) {
    const popupExtract = popup.querySelector('.mwe-popups-extract');
    if (popupExtract) {
      popupExtract.style.marginTop = `${preview.thumbnail.height - pointerSize}px`;
    }
  }

  popup.classList.add(...getClasses(preview, layout));
  popup.style.left = `${layout.offset.left}px`;
  popup.style.top = layout.flippedY ? 'auto' : `${layout.offset.top}px`;
  popup.style.bottom = layout.flippedY ? `${measures.windowHeight - layout.offset.top}px` : 'auto';
}

export function hidePreview(preview) {
  const fadeInClass = preview.el.classList.contains('mwe-popups-fade-in-up')
    ? 'mwe-popups-fade-in-up'
    : 'mwe-popups-fade-in-down';
  const fadeOutClass = fadeInClass === 'mwe-popups-fade-in-up'
    ? 'mwe-popups-fade-out-down'
    : 'mwe-popups-fade-out-up';

  preview.el.classList.remove(fadeInClass);
  preview.el.classList.add(fadeOutClass);

  return wait(150).then(() => {
    preview.el.remove();
  });
}
