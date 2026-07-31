/*
 * the tree table source -> MediaWiki wikitable contract.
 */

import {
  cloneNode,
  elementNode,
  getAttr,
  getClasses,
  hasAnyClass,
  setAttr
} from './domAst.js';
import {
  TREE_TABLE_ALIGNMENT_CLASSES,
  TREE_TABLE_CLASSES,
  TREE_TABLE_WRAPPER_CLASSES
} from './grammar.js';

export function isTreeTable(node) {
  return node?.type === 'element' && node.tagName === 'table' && hasAnyClass(node, TREE_TABLE_CLASSES);
}

function allowedTableAttr(attr) {
  const name = attr.name.toLowerCase();
  return ['id', 'lang', 'dir', 'title', 'summary'].includes(name) || name.startsWith('data-mw');
}

function allowedCellAttr(attr) {
  const name = attr.name.toLowerCase();
  return ['id', 'lang', 'dir', 'title', 'abbr', 'headers', 'scope', 'colspan', 'rowspan'].includes(name) || name.startsWith('data-mw');
}

const SAFE_TABLE_STYLE_PROPERTIES = new Set([
  'background', 'background-color', 'border', 'border-color', 'border-style', 'border-width',
  'color', 'direction', 'float', 'height', 'margin', 'margin-bottom', 'margin-left',
  'margin-right', 'margin-top', 'max-width', 'min-width', 'text-align',
  'vertical-align', 'white-space', 'width'
]);

function sanitizeStyleDeclaration(value, allowed = SAFE_TABLE_STYLE_PROPERTIES) {
  const declarations = String(value || '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);
  const safe = [];
  for (const declaration of declarations) {
    const colon = declaration.indexOf(':');
    if (colon === -1) continue;
    const property = declaration.slice(0, colon).trim().toLowerCase();
    const rawValue = declaration.slice(colon + 1).trim();
    if (!property || !rawValue || !allowed.has(property)) continue;
    if (/url\s*\(|expression\s*\(|javascript:/i.test(rawValue)) continue;
    safe.push(`${property}:${rawValue}`);
  }
  return safe.join(';');
}

function mergeStyleDeclarations(...values) {
  const declarations = [];
  for (const value of values) {
    const safe = sanitizeStyleDeclaration(value);
    if (!safe) continue;
    declarations.push(...safe.split(';').filter(Boolean));
  }
  const propertyOrder = [];
  const propertyValues = new Map();
  for (const declaration of declarations) {
    const colon = declaration.indexOf(':');
    if (colon === -1) continue;
    const property = declaration.slice(0, colon).trim().toLowerCase();
    const rawValue = declaration.slice(colon + 1).trim();
    if (!propertyValues.has(property)) propertyOrder.push(property);
    propertyValues.set(property, rawValue);
  }
  return propertyOrder
    .filter((property) => propertyValues.has(property))
    .map((property) => `${property}:${propertyValues.get(property)}`)
    .join(';');
}

function copyAttrsWithSafeStyle(attrs, attrFilter, styleAllowed = SAFE_TABLE_STYLE_PROPERTIES) {
  const out = [];
  for (const attr of attrs || []) {
    const name = attr.name.toLowerCase();
    if (name === 'class') continue;
    if (name === 'style') {
      const style = sanitizeStyleDeclaration(attr.value, styleAllowed);
      if (style) out.push({ name: 'style', value: style });
      continue;
    }
    if (attrFilter(attr)) out.push({ ...attr });
  }
  return out;
}

export function isTreeTableWrapper(node) {
  if (node?.type !== 'element') return false;
  if (!getClasses(node).some((className) => TREE_TABLE_WRAPPER_CLASSES.has(className))) return false;
  return !!node.children?.some((child) => isTreeTable(child));
}

function tableWrapperLayoutStyle(node) {
  const classes = getClasses(node);
  if (TREE_TABLE_ALIGNMENT_CLASSES.has('table-right') && classes.includes('table-right')) {
    return 'float:right;margin-left:20px;margin-bottom:20px';
  }
  if (TREE_TABLE_ALIGNMENT_CLASSES.has('table-center') && classes.includes('table-center')) {
    return 'margin-left:auto;margin-right:auto';
  }
  return '';
}

export function renderTableWrapper(node, context, transformNode, transformSingleParagraphContentOrChildren) {
  const table = node.children.find((child) => isTreeTable(child));
  if (!table) return [cloneNode(node)];
  const rendered = renderTableNode(table, context, transformNode, transformSingleParagraphContentOrChildren);
  const wrapperStyle = sanitizeStyleDeclaration(getAttr(node, 'style'));
  const wrapperLayoutStyle = tableWrapperLayoutStyle(node);
  if ((wrapperStyle || wrapperLayoutStyle) && rendered.type === 'element') {
    setAttr(rendered, 'style', mergeStyleDeclarations(getAttr(rendered, 'style'), wrapperStyle, wrapperLayoutStyle));
  }
  return [rendered];
}

export function renderTableNode(node, context, transformNode, transformSingleParagraphContentOrChildren) {
  if (node.type !== 'element') return cloneNode(node);
  const tag = node.tagName;
  if (tag === 'table') {
    const attrs = copyAttrsWithSafeStyle(node.attrs, allowedTableAttr);
    attrs.push({ name: 'class', value: 'wikitable' });
    attrs.push({ name: 'data-tt-vector-parser-bridge', value: 'table' });
    attrs.push({ name: 'data-tt-article-compiler', value: 'table' });
    return elementNode('table', attrs, node.children.map((child) => renderTableNode(child, context, transformNode, transformSingleParagraphContentOrChildren)));
  }
  if (tag === 'caption') {
    const attrs = copyAttrsWithSafeStyle(node.attrs, () => true);
    return elementNode(tag, attrs, transformSingleParagraphContentOrChildren(node.children || [], context), node.selfClosing);
  }
  if (['tbody', 'thead', 'tfoot', 'tr', 'colgroup', 'col'].includes(tag)) {
    const attrs = copyAttrsWithSafeStyle(node.attrs, () => true);
    return elementNode(tag, attrs, node.children.map((child) => renderTableNode(child, context, transformNode, transformSingleParagraphContentOrChildren)), node.selfClosing);
  }
  if (['td', 'th'].includes(tag)) {
    const attrs = copyAttrsWithSafeStyle(node.attrs, allowedCellAttr);
    return elementNode(tag, attrs, transformSingleParagraphContentOrChildren(node.children || [], context));
  }
  return transformNode(node, context)[0] || cloneNode(node);
}
