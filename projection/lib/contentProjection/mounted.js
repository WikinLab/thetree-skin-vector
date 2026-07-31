/*
 * Dynamic nested ParserOutput projection bridge.
 *
 * Ordinary article HTML is projected before render through the store boundary.
 * This runtime handles only nested dynamic ParserOutput surfaces declared by
 * the current page projection contract. The contract is resolved on every run;
 * route changes never retain a stale view-specific selector snapshot.
 */
import { projectParserOutputHtml } from '../legacyParserOutputTransform.js';
import {
  HOST_CONTENT_OBSERVE_ROOT_SELECTOR,
  OUTPUT_SIGNATURE_ATTRIBUTE,
  SOURCE_SIGNATURE_ATTRIBUTE,
  collectMountedParserOutputTargets,
  collectNestedParserOutputSurfaceContracts,
  collectNestedParserOutputSurfaces,
  isCompilerOwnedMountedParserOutput,
  resolveMountedProjectionRoot,
  stableHtmlSignature
} from '../parserOutput/mountedSurface.js';
import {
  EDIT_PREVIEW_CATEGORY_SOURCE_SELECTOR,
  transformEditPreviewCategorySurface
} from '../parserOutput/editPreviewCategories.js';
import {
  INTERFACE_CONTRACT_ATTRIBUTE,
  INTERFACE_PRIMITIVE_ATTRIBUTE,
  INTERFACE_ROLE_ATTRIBUTE,
  SURFACE_TYPE_INTERFACE
} from '../legacySpecialPageContract.js';

export {
  collectMountedParserOutputTargets,
  collectNestedParserOutputSurfaces
} from '../parserOutput/mountedSurface.js';

function resolveOptions(optionsSource = {}) {
  const options = typeof optionsSource === 'function' ? optionsSource() : optionsSource;
  return options && typeof options === 'object' ? options : {};
}

function resolveRoot(options = {}) {
  const root = typeof options.getRoot === 'function' ? options.getRoot() : options.root;
  return resolveMountedProjectionRoot(root || null);
}

function resolveProjectionContract(options = {}) {
  const contract = typeof options.getProjectionContract === 'function'
    ? options.getProjectionContract()
    : options.projectionContract;
  return contract && typeof contract === 'object' ? contract : null;
}

function getLang(options = {}) {
  return options.lang
    || document.documentElement.getAttribute('lang')
    || 'ko';
}

function getConfig(options = {}) {
  return options.config && typeof options.config === 'object' ? options.config : {};
}

function getMessages(options = {}) {
  return options.messages && typeof options.messages === 'object' ? options.messages : null;
}


function collectInterfaceRoleContracts(projectionContract = {}) {
  if (projectionContract?.root?.type !== SURFACE_TYPE_INTERFACE) return [];
  return Array.isArray(projectionContract.interfaceRoles)
    ? projectionContract.interfaceRoles.filter((item) => item && item.id && item.selector && item.upstreamPrimitive)
    : [];
}

function roleCardinalityMatches(cardinality, count) {
  if (cardinality === 'one') return count === 1;
  if (cardinality === 'many') return count >= 1;
  if (cardinality === 'optional-one') return count <= 1;
  if (cardinality === 'optional-many') return true;
  return false;
}

function setExactAttribute(element, attribute, value, changedElements) {
  const normalized = String(value || '');
  if (element.getAttribute(attribute) === normalized) return;
  element.setAttribute(attribute, normalized);
  changedElements.add(element);
}

function removeOwnedAttribute(element, attribute, changedElements) {
  if (!element.hasAttribute(attribute)) return;
  element.removeAttribute(attribute);
  changedElements.add(element);
}

function applyInterfaceRoleProjection(root, projectionContract = {}) {
  const roles = collectInterfaceRoleContracts(projectionContract);
  const contractId = projectionContract.root?.id || 'interface-root';
  const desired = new Map();
  let visited = 0;
  let mismatches = 0;
  const signatureParts = [];

  for (const role of roles) {
    const elements = [...root.querySelectorAll(role.selector)];
    const matched = roleCardinalityMatches(role.cardinality, elements.length);
    if (!matched) mismatches += 1;
    for (const element of elements) {
      const item = desired.get(element) || { roles: new Set(), primitives: new Set() };
      item.roles.add(role.id);
      item.primitives.add(role.upstreamPrimitive);
      desired.set(element, item);
    }
    visited += elements.length;
    signatureParts.push(`${role.id}:${elements.length}:${matched ? 'ok' : 'mismatch'}`);
  }

  const changedElements = new Set();
  const previouslyOwned = [...root.querySelectorAll(`[${INTERFACE_CONTRACT_ATTRIBUTE}]`)];
  for (const element of previouslyOwned) {
    if (desired.has(element)) continue;
    removeOwnedAttribute(element, INTERFACE_CONTRACT_ATTRIBUTE, changedElements);
    removeOwnedAttribute(element, INTERFACE_ROLE_ATTRIBUTE, changedElements);
    removeOwnedAttribute(element, INTERFACE_PRIMITIVE_ATTRIBUTE, changedElements);
  }

  for (const [element, item] of desired) {
    setExactAttribute(element, INTERFACE_ROLE_ATTRIBUTE, [...item.roles].sort().join(' '), changedElements);
    setExactAttribute(element, INTERFACE_PRIMITIVE_ATTRIBUTE, [...item.primitives].sort().join(' '), changedElements);
    setExactAttribute(element, INTERFACE_CONTRACT_ATTRIBUTE, contractId, changedElements);
  }

  return Object.freeze({
    changed: changedElements.size,
    visited,
    roles: roles.length,
    mismatches,
    signature: signatureParts.join('|') || 'interface-roles-none'
  });
}

function projectMountedParserOutputElement(element, surfaceContract, options = {}) {
  if (isCompilerOwnedMountedParserOutput(element, surfaceContract)) {
    const signature = element.getAttribute(OUTPUT_SIGNATURE_ATTRIBUTE) || 'compiled-parser-output';
    element.setAttribute(SOURCE_SIGNATURE_ATTRIBUTE, signature);
    element.setAttribute(OUTPUT_SIGNATURE_ATTRIBUTE, signature);
    return { changed: false, beforeSignature: signature, afterSignature: signature };
  }

  const before = element.innerHTML;
  const beforeSignature = stableHtmlSignature(before);

  if (element.getAttribute(OUTPUT_SIGNATURE_ATTRIBUTE) === beforeSignature) {
    return { changed: false, beforeSignature, afterSignature: beforeSignature };
  }

  const after = projectParserOutputHtml(before, {
    lang: getLang(options),
    config: getConfig(options),
    messages: getMessages(options),
    parserOutputRoot: true
  });
  const afterSignature = stableHtmlSignature(after);

  if (after !== before) element.innerHTML = after;

  element.setAttribute(SOURCE_SIGNATURE_ATTRIBUTE, beforeSignature);
  element.setAttribute(OUTPUT_SIGNATURE_ATTRIBUTE, afterSignature);
  return { changed: after !== before, beforeSignature, afterSignature };
}

function projectMountedParserOutputTargets(elements, surfaceContract, options = {}) {
  let changed = 0;
  const signatureParts = [];
  for (const element of elements) {
    const result = projectMountedParserOutputElement(element, surfaceContract, options);
    if (result.changed) changed += 1;
    signatureParts.push(`${result.beforeSignature}:${result.afterSignature}`);
  }
  return Object.freeze({
    changed,
    visited: elements.length,
    signature: elements.length ? signatureParts.join('|') : 'none'
  });
}

function projectNestedSurface(root, surfaceContract, options = {}) {
  const categorySurfaces = collectNestedParserOutputSurfaces(root, surfaceContract);
  let categoryChanged = 0;
  let categoryVisited = 0;
  const categorySignatureParts = [];
  for (const surface of categorySurfaces) {
    const result = transformEditPreviewCategorySurface(surface, options, surfaceContract);
    categoryChanged += result.changed;
    categoryVisited += result.visited;
    categorySignatureParts.push(result.signature);
  }

  const targets = collectMountedParserOutputTargets(root, surfaceContract);
  const contentResult = projectMountedParserOutputTargets(targets, surfaceContract, options);
  return Object.freeze({
    id: surfaceContract.id,
    changed: contentResult.changed + categoryChanged,
    parserOutputChanged: contentResult.changed,
    categoryChanged,
    visited: contentResult.visited + categoryVisited,
    parserOutputVisited: contentResult.visited,
    categoryVisited,
    signature: `${surfaceContract.id}:content(${contentResult.signature})-categories(${categorySignatureParts.join('|') || 'none'})`
  });
}

export function applyLegacyProjectionSurfaceTransform(optionsSource = {}) {
  if (typeof document === 'undefined') {
    return Object.freeze({
      changed: 0,
      visited: 0,
      surfaces: 0,
      signature: 'projection-mounted-none'
    });
  }

  const options = resolveOptions(optionsSource);
  const projectionContract = resolveProjectionContract(options);
  const surfaceContracts = collectNestedParserOutputSurfaceContracts(projectionContract);
  const interfaceRoleContracts = collectInterfaceRoleContracts(projectionContract);
  if (!surfaceContracts.length && !interfaceRoleContracts.length) {
    return Object.freeze({
      changed: 0,
      visited: 0,
      surfaces: 0,
      interfaceRoles: 0,
      signature: 'projection-mounted-disabled'
    });
  }

  const root = resolveRoot(options);
  if (!root) {
    return Object.freeze({
      changed: 0,
      visited: 0,
      surfaces: surfaceContracts.length,
      interfaceRoles: interfaceRoleContracts.length,
      signature: 'projection-mounted-root-none'
    });
  }

  const interfaceResult = applyInterfaceRoleProjection(root, projectionContract);
  const results = surfaceContracts.map((surfaceContract) => projectNestedSurface(root, surfaceContract, options));
  return Object.freeze({
    changed: interfaceResult.changed + results.reduce((sum, result) => sum + result.changed, 0),
    parserOutputChanged: results.reduce((sum, result) => sum + result.parserOutputChanged, 0),
    categoryChanged: results.reduce((sum, result) => sum + result.categoryChanged, 0),
    visited: results.reduce((sum, result) => sum + result.visited, 0),
    parserOutputVisited: results.reduce((sum, result) => sum + result.parserOutputVisited, 0),
    categoryVisited: results.reduce((sum, result) => sum + result.categoryVisited, 0),
    surfaces: results.length,
    interfaceRoles: interfaceResult.roles,
    interfaceRoleVisited: interfaceResult.visited,
    interfaceRoleMismatches: interfaceResult.mismatches,
    signature: `interface(${interfaceResult.signature})|parser(${results.map((result) => result.signature).join('|') || 'none'})`
  });
}

export function createLegacyProjectionSurfaceRuntime(optionsSource = {}) {
  let observer = null;
  let destroyed = false;
  let scheduled = false;
  let applying = false;
  let lastResult = Object.freeze({ changed: 0, visited: 0, surfaces: 0, signature: 'projection-mounted-pending' });

  const run = () => {
    if (destroyed) return lastResult;
    scheduled = false;
    applying = true;
    try {
      lastResult = applyLegacyProjectionSurfaceTransform(optionsSource);
      return lastResult;
    } finally {
      applying = false;
    }
  };

  const schedule = () => {
    if (destroyed || scheduled || applying) return;
    scheduled = true;
    Promise.resolve().then(run);
  };

  const init = () => {
    if (typeof document === 'undefined') return lastResult;
    lastResult = run();
    const options = resolveOptions(optionsSource);
    const root = resolveRoot(options);
    if (root && typeof MutationObserver === 'function') {
      observer = new MutationObserver((records) => {
        // ParserOutput surfaces are introduced or replaced as nodes. Ignoring
        // character-data churn avoids rescanning the complete projection root
        // for unrelated text updates while retaining route/dynamic-view support.
        if (records.some((record) => record.type === 'childList'
          && (record.addedNodes.length || record.removedNodes.length))) {
          schedule();
        }
      });
      observer.observe(root, {
        childList: true,
        subtree: true
      });
    }
    return lastResult;
  };

  const destroy = () => {
    destroyed = true;
    if (observer) observer.disconnect();
    observer = null;
  };

  return Object.freeze({
    init,
    destroy,
    run,
    get signature() {
      return lastResult.signature;
    },
    get lastResult() {
      return lastResult;
    }
  });
}
