/*
 * Deterministic TextExtracts bridge for page-preview extracts.
 *
 * MediaWiki Popups asks TextExtracts for exintro + explaintext. The skin cannot
 * call MediaWiki's PHP parser for the tree pages, so this bridge consumes the
 * already-structured the tree contentHtml, first lowers it through the existing
 * parser-output transform, then applies the TextExtracts first-section and
 * ExtractFormatter contracts on that lowered grammar. It deliberately does not
 * use linked-document HTML scraping, whole-document textContent, first-paragraph
 * extraction, or heading-after fallback text.
 */
import { parseHtmlFragment, transformHtmlFragment } from './legacyParserOutputTransform.js';

export const TEXT_EXTRACTS_REMOVE_SELECTORS = Object.freeze([
  'img',
  'audio',
  'video',
  'table',
  'div',
  'figure',
  'script',
  'input',
  'style',
  'ul.gallery',
  'mw\\:editsection',
  'editsection',
  'meta',
  'sup.reference',
  'ol.references',
  '.error',
  '.nomobile',
  '.noprint',
  '.noexcerpt',
  '.sortkey'
]);

const TEXT_EXTRACTS_REMOVE_SELECTOR_CONTRACT = Object.freeze(TEXT_EXTRACTS_REMOVE_SELECTORS.map((selector) => selector.toLowerCase()));

const TEXT_EXTRACTS_BLOCK_TEXT_ELEMENTS = Object.freeze(new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'br',
  'dd',
  'details',
  'div',
  'dl',
  'dt',
  'figcaption',
  'figure',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul'
]));

function cloneAstNode(node) {
  if (!node) return null;
  if (node.type === 'text') return { type: 'text', value: String(node.value || '') };
  if (node.type === 'comment') return { type: 'comment', value: String(node.value || '') };
  if (node.type === 'root') return { type: 'root', children: (node.children || []).map(cloneAstNode).filter(Boolean) };
  if (node.type === 'element') {
    return {
      type: 'element',
      tagName: String(node.tagName || '').toLowerCase(),
      attrs: (node.attrs || []).map((attr) => ({ name: attr.name, value: attr.value })),
      children: (node.children || []).map(cloneAstNode).filter(Boolean),
      selfClosing: !!node.selfClosing
    };
  }
  return null;
}

function cloneAstNodeShallow(node) {
  if (!node) return null;
  if (node.type === 'text' || node.type === 'comment') return cloneAstNode(node);
  if (node.type === 'root') return { type: 'root', children: [] };
  if (node.type === 'element') {
    return {
      type: 'element',
      tagName: String(node.tagName || '').toLowerCase(),
      attrs: (node.attrs || []).map((attr) => ({ name: attr.name, value: attr.value })),
      children: [],
      selfClosing: !!node.selfClosing
    };
  }
  return null;
}

function isHeadingElement(node) {
  return node?.type === 'element' && /^h[1-6]$/i.test(node.tagName || '');
}

export function cloneUntilFirstHeadingInDocumentOrder(node) {
  if (!node) return { node: null, foundHeading: false };
  if (isHeadingElement(node)) return { node: null, foundHeading: true };
  if (node.type === 'text' || node.type === 'comment') return { node: cloneAstNode(node), foundHeading: false };
  if (node.type !== 'root' && node.type !== 'element') return { node: null, foundHeading: false };

  const output = cloneAstNodeShallow(node);
  for (const child of node.children || []) {
    const result = cloneUntilFirstHeadingInDocumentOrder(child);
    if (result.node) output.children.push(result.node);
    if (result.foundHeading) return { node: output, foundHeading: true };
  }
  return { node: output, foundHeading: false };
}

function getAttr(node, name) {
  if (node?.type !== 'element') return '';
  const lowerName = String(name || '').toLowerCase();
  const attr = (node.attrs || []).find((item) => String(item.name || '').toLowerCase() === lowerName);
  return attr ? String(attr.value || '') : '';
}

function classList(node) {
  return getAttr(node, 'class').split(/\s+/).filter(Boolean);
}

function nodeMatchesTextExtractsRemoveSelector(node, selector) {
  if (node?.type !== 'element') return false;
  const tagName = String(node.tagName || '').toLowerCase();
  const normalized = selector.toLowerCase();
  if (normalized.startsWith('.')) return classList(node).includes(normalized.slice(1));
  if (normalized.includes('.')) {
    const [tag, className] = normalized.split('.');
    return tagName === tag && classList(node).includes(className);
  }
  if (normalized === 'mw\\:editsection') return tagName === 'mw:editsection';
  return tagName === normalized;
}

function shouldRemoveForTextExtracts(node) {
  return TEXT_EXTRACTS_REMOVE_SELECTOR_CONTRACT.some((selector) => nodeMatchesTextExtractsRemoveSelector(node, selector));
}

export function removeTextExtractsSelectorsFromAst(node) {
  if (!node || (node.type !== 'root' && node.type !== 'element')) return node;
  node.children = (node.children || [])
    .filter((child) => !shouldRemoveForTextExtracts(child))
    .map((child) => removeTextExtractsSelectorsFromAst(child));
  return node;
}

export function normalizeTextExtractsPlainText(text) {
  return String(text || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

function appendTextExtractsPlainTextFromAst(node, parts) {
  if (!node) return;
  if (node.type === 'text') {
    parts.push(node.value || '');
    return;
  }
  if (node.type === 'comment') return;
  if (node.type !== 'root' && node.type !== 'element') return;

  const tagName = node.type === 'element' ? String(node.tagName || '').toLowerCase() : '';
  const isBlock = TEXT_EXTRACTS_BLOCK_TEXT_ELEMENTS.has(tagName);
  if (tagName === 'br') {
    parts.push('\n');
    return;
  }
  if (isBlock) parts.push('\n');
  for (const child of node.children || []) appendTextExtractsPlainTextFromAst(child, parts);
  if (isBlock) parts.push('\n');
}

export function textFromTextExtractsAst(node) {
  const parts = [];
  appendTextExtractsPlainTextFromAst(node, parts);
  return normalizeTextExtractsPlainText(parts.join(''));
}

export function textExtractsIntroPlainTextFromHtml(html) {
  const transformedHtml = transformHtmlFragment(String(html || ''), {
    parserOutputRoot: false,
    textExtractsMode: true
  });
  const ast = parseHtmlFragment(transformedHtml);
  const firstSection = cloneUntilFirstHeadingInDocumentOrder(ast).node;
  removeTextExtractsSelectorsFromAst(firstSection);
  return textFromTextExtractsAst(firstSection);
}
