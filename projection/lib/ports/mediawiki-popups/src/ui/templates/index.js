/*
 * SPDX-License-Identifier: GPL-2.0-or-later
 * Modified by thetree-skin-vector, 2026-07-29 and 2026-07-30.
 * Source provenance: ORIGIN-MANIFEST.json and NOTICE.
 *
 * Popups template helpers.
 *
 * These templates mirror the DOM surfaces consumed by the upstream Popups and
 * Cite ReferencePreviews CSS. Host gateway logic must not be added here.
 */
const popupTemplateHTML = `
	<div class="mwe-popups" aria-hidden></div>
`;

export const pagePreviewTemplateHTML = `
<div>
    <a class="mwe-popups-discreet"></a>
    <a class="mwe-popups-extract"></a>
    <footer>
		<a class="cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet cdx-button--icon-only mwe-popups-settings-button">
			<span class="popups-icon popups-icon--size-small popups-icon--settings"></span>
			<span class="mwe-popups-settings-button-label"></span>
        </a>
    </footer>
</div>
	`;

export const genericPreviewTemplateHTML = `
	<div class="mwe-popups-container">
		<a class="mwe-popups-extract">
		<div class="mwe-popups-scroll">
				<strong class="mwe-popups-title">
					<span class="popups-icon"></span>
				</strong>
				<div class="mwe-popups-message"></div>
			</div>
		</a>
		<footer>
			<a class="mwe-popups-read-link"></a>
		</footer>
	</div>
`;

export const referencePreviewTemplateHTML = `
<div class="mwe-popups mwe-popups mwe-popups-type-reference" aria-hidden>
	<div class="mwe-popups-container">
		<div class="mwe-popups-extract">
			<div class="mwe-popups-scroll">
				<strong class="mwe-popups-title">
					<span class="popups-icon"></span>
					<span class="mwe-popups-title-placeholder"></span>
				</strong>
				<bdi><div class="mw-parser-output"></div></bdi>
			</div>
			<div class="mwe-popups-fade"></div>
		</div>
		<footer>
			<div class="mwe-popups-reflist-link-wrapper mwe-popups-reflist-link-hidden">
				<a class="mwe-popups-reflist-link"></a>
			</div>
			<div class="mwe-popups-settings"></div>
		</footer>
	</div>
</div>`;

const templateCache = new Map();

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

export function createNodeFromTemplate(html) {
  if (!templateCache.has(html)) {
    const div = document.createElement('div');
    div.innerHTML = html;
    templateCache.set(html, div.firstElementChild);
  }
  return templateCache.get(html).cloneNode(true);
}

export function renderPopup(type, container) {
  const element = createNodeFromTemplate(popupTemplateHTML);
  element.className = `mwe-popups mwe-popups-type-${type}`;
  container.className = 'mwe-popups-container';
  element.appendChild(container);
  return element;
}

export function replaceWith(node, htmlOrOtherNode) {
  if (typeof htmlOrOtherNode === 'string') {
    node.insertAdjacentHTML('afterend', htmlOrOtherNode);
  } else {
    node.parentNode.appendChild(htmlOrOtherNode);
  }
  node.remove();
}
