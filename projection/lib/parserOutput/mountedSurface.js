/*
 * Mounted nested ParserOutput surface contract.
 *
 * Ordinary article HTML is compiled through the store-owned pre-render bridge.
 * This module discovers only dynamic nested ParserOutput surfaces declared by
 * the current page projection contract. It owns marker materialization and
 * stable signatures, not article transformation rules.
 */

export { stableHtmlSignature } from './signature.js';

export const HOST_CONTENT_OBSERVE_ROOT_SELECTOR = '#mw-content-text[data-tt-host-content="1"]';
export const VECTOR_SURFACE_ATTRIBUTE = 'data-tt-vector-surface';
export const VECTOR_SURFACE_ROLE_ATTRIBUTE = 'data-tt-vector-surface-role';
export const PARSER_OUTPUT_SURFACE_VALUE = 'parser-output';
export const WIKI_CONTENT_HOST_ATTRIBUTE = 'data-tt-vector-wiki-content-host';
export const CATLINKS_SURFACE_ATTRIBUTE = 'data-tt-vector-catlinks-surface';
export const EXCLUDED_CONTENT_ANCESTORS = '#tooltip, .popper, .modal, dialog, [role="dialog"]';
export const SOURCE_SIGNATURE_ATTRIBUTE = 'data-tt-vector-mounted-parser-output-source-signature';
export const OUTPUT_SIGNATURE_ATTRIBUTE = 'data-tt-vector-mounted-parser-output-transform';
export const COMPILER_ROOT_ATTRIBUTE = 'data-tt-vector-parser-output';
export const COMPILER_ROOT_ATTRIBUTE_VALUE = '1';

export function normalizeNestedParserOutputSurfaceContract(surfaceContract = null) {
  if (!surfaceContract || typeof surfaceContract !== 'object') return null;
  if (surfaceContract.type !== PARSER_OUTPUT_SURFACE_VALUE) return null;
  const surfaceSelector = String(surfaceContract.surfaceSelector || '').trim();
  const hostSelector = String(surfaceContract.hostSelector || '').trim();
  if (!surfaceSelector || !hostSelector) return null;
  return Object.freeze({
    id: String(surfaceContract.id || 'nested-parser-output'),
    type: PARSER_OUTPUT_SURFACE_VALUE,
    role: String(surfaceContract.role || 'nested-parser-output'),
    lifecycle: String(surfaceContract.lifecycle || 'dynamic'),
    surfaceSelector,
    hostSelector
  });
}

export function collectNestedParserOutputSurfaceContracts(projectionContract = null) {
  if (!projectionContract || typeof projectionContract !== 'object') return [];
  return (projectionContract.children || [])
    .map(normalizeNestedParserOutputSurfaceContract)
    .filter(Boolean);
}

function isElementOutsideExcludedContent(element) {
  return element && element.nodeType === 1 && !element.closest(EXCLUDED_CONTENT_ANCESTORS);
}

export function isMountedParserOutputTargetElement(element, surfaceContract = null) {
  if (!isElementOutsideExcludedContent(element)) return false;
  const contract = normalizeNestedParserOutputSurfaceContract(surfaceContract);
  return !!contract && element.matches(contract.hostSelector);
}

export function isNestedParserOutputSurfaceElement(element, surfaceContract = null) {
  if (!isElementOutsideExcludedContent(element)) return false;
  const contract = normalizeNestedParserOutputSurfaceContract(surfaceContract);
  return !!contract && element.matches(contract.surfaceSelector);
}

function parserOutputDirectionClass(element) {
  const documentObject = element?.ownerDocument;
  const direction = documentObject?.documentElement?.getAttribute('dir')
    || (documentObject?.body?.classList.contains('rtl') ? 'rtl' : 'ltr');
  return direction === 'rtl' ? 'mw-content-rtl' : 'mw-content-ltr';
}

export function markParserOutputSurface(element, surfaceContract = null) {
  if (!element || element.nodeType !== 1) return;
  const contract = normalizeNestedParserOutputSurfaceContract(surfaceContract);
  element.setAttribute(VECTOR_SURFACE_ATTRIBUTE, PARSER_OUTPUT_SURFACE_VALUE);
  element.setAttribute(VECTOR_SURFACE_ROLE_ATTRIBUTE, contract?.role || 'nested-parser-output');
  element.classList.add('mw-body-content', parserOutputDirectionClass(element));
}

export function markWikiContentHost(element, surfaceContract = null) {
  if (!element || element.nodeType !== 1) return;
  const contract = normalizeNestedParserOutputSurfaceContract(surfaceContract);
  if (!contract) return;
  element.setAttribute(VECTOR_SURFACE_ATTRIBUTE, PARSER_OUTPUT_SURFACE_VALUE);
  element.setAttribute(VECTOR_SURFACE_ROLE_ATTRIBUTE, contract.role);
  element.setAttribute(WIKI_CONTENT_HOST_ATTRIBUTE, '1');
  const containingSurface = element.closest?.(contract.surfaceSelector);
  if (containingSurface && isNestedParserOutputSurfaceElement(containingSurface, contract)) {
    markParserOutputSurface(containingSurface, contract);
  }
}

function significantElementChildren(element) {
  return Array.from(element.childNodes || []).filter((node) => {
    if (node.nodeType === 8) return false;
    if (node.nodeType === 3) return node.nodeValue.trim() !== '';
    return true;
  });
}

export function isCompilerOwnedMountedParserOutput(element, surfaceContract = null) {
  if (!isMountedParserOutputTargetElement(element, surfaceContract)) return false;
  const significant = significantElementChildren(element);
  if (significant.length !== 1) return false;
  const child = significant[0];
  return child.nodeType === 1
    && child.tagName.toLowerCase() === 'div'
    && child.classList.contains('mw-parser-output')
    && child.getAttribute(COMPILER_ROOT_ATTRIBUTE) === COMPILER_ROOT_ATTRIBUTE_VALUE;
}

export function resolveMountedProjectionRoot(root = null, documentObject = globalThis.document) {
  if (root && root.nodeType === 1 && root.matches?.(HOST_CONTENT_OBSERVE_ROOT_SELECTOR)) return root;
  if (!documentObject || typeof documentObject.querySelector !== 'function') return null;
  return documentObject.querySelector(HOST_CONTENT_OBSERVE_ROOT_SELECTOR);
}

export function collectMountedParserOutputTargets(root = null, surfaceContract = null) {
  const resolvedRoot = resolveMountedProjectionRoot(root);
  const contract = normalizeNestedParserOutputSurfaceContract(surfaceContract);
  if (!resolvedRoot || !contract || typeof resolvedRoot.querySelectorAll !== 'function') return [];
  return Array.from(resolvedRoot.querySelectorAll(contract.hostSelector))
    .filter((element) => isMountedParserOutputTargetElement(element, contract))
    .map((element) => {
      markWikiContentHost(element, contract);
      return element;
    });
}

export function collectNestedParserOutputSurfaces(root = null, surfaceContract = null) {
  const resolvedRoot = resolveMountedProjectionRoot(root);
  const contract = normalizeNestedParserOutputSurfaceContract(surfaceContract);
  if (!resolvedRoot || !contract || typeof resolvedRoot.querySelectorAll !== 'function') return [];
  return Array.from(resolvedRoot.querySelectorAll(contract.surfaceSelector))
    .filter((element) => isNestedParserOutputSurfaceElement(element, contract))
    .map((element) => {
      markParserOutputSurface(element, contract);
      return element;
    });
}
