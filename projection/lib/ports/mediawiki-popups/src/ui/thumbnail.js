/*
 * SPDX-License-Identifier: GPL-2.0-or-later
 * Modified by thetree-skin-vector, 2026-07-29 and 2026-07-30.
 * Source provenance: ORIGIN-MANIFEST.json and NOTICE.
 *
 * Popups thumbnail rendering helpers.
 */
import { SIZES, defaultExtractWidth } from '../constants.js';

export function bracketedPixelRatio(dpr = window.devicePixelRatio) {
  if (!dpr) return 1;
  if (dpr > 1.5) return 2;
  if (dpr > 1) return 1.5;
  return 1;
}

export function supportsCSSClipPath() {
  return window.CSS
    && typeof CSS.supports === 'function'
    && CSS.supports('clip-path', 'polygon(1px 1px)');
}

function createThumbnailImg(url) {
  const img = document.createElement('img');
  img.className = 'mwe-popups-thumbnail';
  img.src = url;
  return img;
}

function addAttributes(node, attrs) {
  Object.keys(attrs).forEach((key) => {
    node.setAttribute(key, attrs[key]);
  });
}

function createThumbnailSVG(className, url, x, y, thumbnailWidth, thumbnailHeight, width, height) {
  const nsSvg = 'http://www.w3.org/2000/svg';
  const nsXlink = 'http://www.w3.org/1999/xlink';
  const line = document.createElementNS(nsSvg, 'polyline');
  const isTall = className.indexOf('not-tall') === -1;
  const points = isTall ? [0, 0, 0, height] : [0, height - 1, width, height - 1];

  line.setAttribute('stroke', 'rgba(0,0,0,0.1)');
  line.setAttribute('points', points.join(' '));
  line.setAttribute('stroke-width', 1);

  const thumbnailSVGImage = document.createElementNS(nsSvg, 'image');
  thumbnailSVGImage.setAttributeNS(nsXlink, 'href', url);
  thumbnailSVGImage.classList.add(className);
  addAttributes(thumbnailSVGImage, { x, y, width: thumbnailWidth, height: thumbnailHeight });

  const thumbnail = document.createElementNS(nsSvg, 'svg');
  addAttributes(thumbnail, { xmlns: nsSvg, width, height });
  thumbnail.appendChild(thumbnailSVGImage);
  thumbnail.appendChild(line);
  return thumbnail;
}

export function createThumbnail(rawThumbnail, useCSSClipPath) {
  const devicePixelRatio = bracketedPixelRatio();
  if (!rawThumbnail) return null;

  const thumbWidth = Number(rawThumbnail.width) / devicePixelRatio;
  const thumbHeight = Number(rawThumbnail.height) / devicePixelRatio;
  const source = String(rawThumbnail.source || '');
  const tall = Number(rawThumbnail.height) > Number(rawThumbnail.width) || thumbWidth < SIZES.landscapeImage.w;

  if ((tall && thumbHeight < SIZES.portraitImage.h && Number(rawThumbnail.height) < SIZES.portraitImage.h)
    || source.indexOf('\\') > -1
    || source.indexOf("'") > -1
    || source.indexOf('\"') > -1) {
    return null;
  }

  const aspectRatio = thumbWidth / thumbHeight;
  const isSquare = aspectRatio > 0.7 && aspectRatio < 1.3;
  let x;
  let y;
  let width;
  let height;

  if (tall) {
    x = thumbWidth > SIZES.portraitImage.w ? ((thumbWidth - SIZES.portraitImage.w) / -2) : (SIZES.portraitImage.w - thumbWidth);
    y = thumbHeight > SIZES.portraitImage.h ? ((thumbHeight - SIZES.portraitImage.h) / -2) : 0;
    width = SIZES.portraitImage.w;
    height = SIZES.portraitImage.h;
    if (thumbWidth < width) {
      x = 0;
      width = thumbWidth;
    }
  } else {
    x = 0;
    y = thumbHeight > SIZES.landscapeImage.h ? ((thumbHeight - SIZES.landscapeImage.h) / -2) : 0;
    width = SIZES.landscapeImage.w;
    height = thumbHeight > SIZES.landscapeImage.h ? SIZES.landscapeImage.h : thumbHeight;
  }

  const isNarrow = tall && thumbWidth < SIZES.portraitImage.w;
  const el = useCSSClipPath ? createThumbnailImg(source) : createThumbnailSVG(
    tall ? 'mwe-popups-is-tall' : 'mwe-popups-is-not-tall',
    source,
    x,
    y,
    thumbWidth,
    thumbHeight,
    width,
    height
  );

  return Object.freeze({
    el,
    isTall: tall || isSquare,
    isNarrow,
    offset: isNarrow ? SIZES.portraitImage.w - thumbWidth : 0,
    width: thumbWidth,
    height: thumbHeight
  });
}

export function getExtractWidth(thumbnail) {
  return thumbnail && thumbnail.isNarrow ? `${defaultExtractWidth + thumbnail.offset}px` : '';
}

export function thumbnailIsTall(thumbnail) {
  return Boolean(thumbnail && thumbnail.isTall);
}

export function previewHasThumbnail(thumbnail) {
  return Boolean(thumbnail);
}
