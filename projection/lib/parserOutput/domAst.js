/* Standards-based HTML fragment AST used by the parser-output compiler. */

import { parseFragment } from 'parse5';

export const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr'
]);

const RAW_TEXT_ELEMENTS = new Set(['script', 'style']);


export function textNode(value) {
  return { type: 'text', value: String(value || '') };
}

export function commentNode(value) {
  return { type: 'comment', value: String(value || '') };
}

export function elementNode(tagName, attrs = [], children = [], selfClosing = false) {
  return {
    type: 'element',
    tagName: String(tagName || '').toLowerCase(),
    attrs,
    children,
    selfClosing
  };
}

export function rootNode(children = []) {
  return { type: 'root', children };
}

function escapeText(value) {
  return String(value ?? '').replace(/[&<>]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
  }[char]));
}

function escapeAttr(value) {
  return String(value ?? '').replace(/[&"<>]/g, (char) => ({
    '&': '&amp;',
    '"': '&quot;',
    '<': '&lt;',
    '>': '&gt;'
  }[char]));
}

function fromHtml5Node(node) {
  if (node.nodeName === '#text') return textNode(node.value);
  if (node.nodeName === '#comment') return commentNode(node.data);
  if (!node.tagName) return null;
  const attrs = (node.attrs || []).map((attr) => ({
    name: attr.prefix ? `${attr.prefix}:${attr.name}` : attr.name,
    value: attr.value
  }));
  const sourceChildren = node.tagName === 'template' && node.content
    ? node.content.childNodes || []
    : node.childNodes || [];
  return elementNode(
    node.tagName,
    attrs,
    sourceChildren.map(fromHtml5Node).filter(Boolean),
    VOID_ELEMENTS.has(node.tagName)
  );
}

export function parseHtmlFragment(html) {
  const fragment = parseFragment(String(html || ''));
  return rootNode((fragment.childNodes || []).map(fromHtml5Node).filter(Boolean));
}

function serializeAttrs(attrs) {
  if (!attrs?.length) return '';
  return attrs
    .filter((attr) => attr && attr.name)
    .map((attr) => attr.value === '' ? ` ${attr.name}` : ` ${attr.name}="${escapeAttr(attr.value)}"`)
    .join('');
}

export function serializeHtml(node, parentTag = null) {
  if (!node) return '';
  if (Array.isArray(node)) return node.map(serializeHtml).join('');
  if (node.type === 'root') return node.children.map((child) => serializeHtml(child, null)).join('');
  if (node.type === 'text') return RAW_TEXT_ELEMENTS.has(parentTag) ? node.value : escapeText(node.value);
  if (node.type === 'comment') return `<!--${node.value}-->`;
  if (node.type !== 'element') return '';
  const attrs = serializeAttrs(node.attrs);
  if (node.selfClosing || VOID_ELEMENTS.has(node.tagName)) return `<${node.tagName}${attrs}>`;
  return `<${node.tagName}${attrs}>${node.children.map((child) => serializeHtml(child, node.tagName)).join('')}</${node.tagName}>`;
}

export function getAttr(node, name) {
  const attr = node?.attrs?.find((item) => item.name.toLowerCase() === name.toLowerCase());
  return attr ? attr.value : '';
}

export function setAttr(node, name, value) {
  const existing = node.attrs.find((item) => item.name.toLowerCase() === name.toLowerCase());
  if (existing) existing.value = String(value);
  else node.attrs.push({ name, value: String(value) });
  return node;
}

export function removeAttr(node, name) {
  node.attrs = node.attrs.filter((item) => item.name.toLowerCase() !== name.toLowerCase());
  return node;
}

export function getClasses(node) {
  return getAttr(node, 'class').split(/\s+/).filter(Boolean);
}

export function setClasses(node, classes) {
  const value = Array.from(new Set(classes.filter(Boolean))).join(' ');
  if (value) setAttr(node, 'class', value);
  else removeAttr(node, 'class');
  return node;
}

export function hasAnyClass(node, classSet) {
  return getClasses(node).some((className) => classSet.has(className));
}

export function hasClassPattern(node, pattern) {
  return getClasses(node).some((className) => pattern.test(className));
}

export function classString(node) {
  return getClasses(node).join(' ');
}

export function textContent(node) {
  if (!node) return '';
  if (Array.isArray(node)) return node.map(textContent).join('');
  if (node.type === 'text') return node.value;
  if (node.type === 'comment') return '';
  if (node.children) return node.children.map(textContent).join('');
  return '';
}

export function plainText(nodes) {
  return textContent(nodes).replace(/\s+/g, ' ').trim();
}


export function isWhitespaceOnlyNode(node) {
  return node?.type === 'text' && node.value.trim() === '';
}

export function cloneNode(node) {
  if (node.type === 'text') return textNode(node.value);
  if (node.type === 'comment') return commentNode(node.value);
  if (node.type === 'root') return rootNode(node.children.map(cloneNode));
  return elementNode(node.tagName, node.attrs.map((attr) => ({ ...attr })), node.children.map(cloneNode), node.selfClosing);
}

export function cloneNodes(nodes) {
  return nodes.map(cloneNode);
}


export function findFirstElement(node, predicate) {
  if (!node) return null;
  if (node.type === 'element' && predicate(node)) return node;
  for (const child of node.children || []) {
    const found = findFirstElement(child, predicate);
    if (found) return found;
  }
  return null;
}

export function collectElements(node, predicate, result = []) {
  if (!node) return result;
  if (node.type === 'element' && predicate(node)) result.push(node);
  for (const child of node.children || []) collectElements(child, predicate, result);
  return result;
}
