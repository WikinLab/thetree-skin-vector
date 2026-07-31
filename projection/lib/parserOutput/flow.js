/*
 * Article flow source -> MediaWiki parser-output block flow contract.
 */

import {
  cloneNode,
  elementNode,
  getAttr,
  getClasses,
  hasAnyClass,
  isWhitespaceOnlyNode
} from './domAst.js';
import {
  TREE_BLOCKQUOTE_CLASSES,
  TREE_CLEARFIX_CLASSES,
  TREE_INDENT_CLASSES,
  TREE_LIST_CLASSES,
  TREE_LIST_TYPE_BY_CLASS,
  TREE_LIST_TYPE_CLASSES,
  TREE_PARAGRAPH_CLASSES
} from './grammar.js';

export function isTreeParagraph(node) {
  return node?.type === 'element' && getClasses(node).some((className) => TREE_PARAGRAPH_CLASSES.has(className));
}

export function isTreeList(node) {
  if (node?.type !== 'element' || !['ul', 'ol'].includes(node.tagName)) return false;
  const classes = getClasses(node);
  return classes.some((className) => TREE_LIST_CLASSES.has(className))
    && classes.every((className) => TREE_LIST_CLASSES.has(className) || TREE_LIST_TYPE_CLASSES.has(className));
}

export function significantNodes(nodes) {
  return (nodes || []).filter((node) => node.type !== 'text' || node.value.trim() !== '');
}

function allowedFlowAttr(attr) {
  const name = attr.name.toLowerCase();
  return ['id', 'lang', 'dir', 'title'].includes(name) || name.startsWith('data-mw');
}

function flowAttrs(node) {
  return (node.attrs || []).filter(allowedFlowAttr).map((attr) => ({ ...attr }));
}

export function transformSingleParagraphContentOrChildren(children, context, transformNode, predicates) {
  const significant = significantNodes(children);
  if (significant.length === 1 && isTreeParagraph(significant[0])) {
    return transformArticleFlowChildren(significant[0].children || [], context, transformNode, predicates, { wrapParagraphs: false });
  }
  return (children || []).flatMap((child) => transformNode(child, context));
}

const MEDIAWIKI_PARAGRAPH_BREAKING_ELEMENTS = new Set([
  'table', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'p', 'ul', 'ol', 'dl',
  'tr', 'caption', 'dt', 'dd', 'li', 'center', 'blockquote', 'div', 'hr', 'aside', 'figure'
]);

function isMediaWikiParagraphMarker(node) {
  if (node?.type !== 'element') return false;
  if (node.tagName.startsWith('mw:')) return true;
  return node.tagName === 'meta' && /^mw:/i.test(getAttr(node, 'property'));
}

function isParagraphBreakingSource(node, predicates) {
  if (node?.type !== 'element') return false;
  if (predicates.isTreeToc(node) || predicates.isTreeHeading(node) || predicates.isHeadingContent(node) || predicates.isTreeCategorySource(node) || isTreeClearfix(node) || isTheTreePreCodeBlock(node)) return true;
  if (predicates.isTreeTableWrapper(node) || predicates.isTreeTable(node) || isTreeList(node) || isTreeIndent(node) || isTreeBlockquote(node)) return true;
  if (predicates.isReferenceList(node)) return true;
  return MEDIAWIKI_PARAGRAPH_BREAKING_ELEMENTS.has(node.tagName) || isMediaWikiParagraphMarker(node);
}

function isFlowSourceContainer(node, predicates) {
  return isTreeParagraph(node) || predicates.isHeadingContent(node);
}

function isEmptyParagraphArtifact(node) {
  if (node?.type !== 'element' || node.tagName !== 'p') return false;
  if ((node.attrs || []).some((attr) => !['class', 'style'].includes(attr.name.toLowerCase()) || String(attr.value || '').trim())) return false;
  return !significantNodes(node.children || []).length;
}

function isSourceSeparatorBreak(node) {
  return node?.type === 'element' && node.tagName === 'br';
}

function hasParagraphRunContent(nodes) {
  return (nodes || []).some((node) => {
    if (node.type === 'text') return node.value.trim() !== '';
    if (node.type === 'comment') return false;
    if (node.type !== 'element') return false;
    if (node.tagName === 'br') return false;
    return true;
  });
}

function trimParagraphRunBoundarySeparators(nodes) {
  const out = nodes.slice();
  while (out.length && (isWhitespaceOnlyNode(out[0]) || isSourceSeparatorBreak(out[0]))) out.shift();
  while (out.length && (isWhitespaceOnlyNode(out[out.length - 1]) || isSourceSeparatorBreak(out[out.length - 1]))) out.pop();
  return out;
}

export function transformArticleFlowChildren(children, context, transformNode, predicates, options = {}) {
  const output = [];
  let inlineRun = [];
  let afterFlowBlock = false;
  let paragraphAttrs = (options.paragraphAttrs || []).map((attr) => ({ ...attr }));
  const wrapParagraphs = options.wrapParagraphs !== false;

  const takeParagraphAttrs = () => {
    const attrs = paragraphAttrs;
    paragraphAttrs = [];
    return attrs;
  };

  const flushInlineRun = () => {
    const run = trimParagraphRunBoundarySeparators(inlineRun);
    inlineRun = [];
    if (!hasParagraphRunContent(run)) return;
    if (wrapParagraphs) output.push(elementNode('p', takeParagraphAttrs(), run));
    else output.push(...run);
  };

  for (const child of children || []) {
    if (!child) continue;
    if (isEmptyParagraphArtifact(child)) continue;

    if (child.type === 'text' && child.value.trim() === '' && !inlineRun.length) {
      continue;
    }
    if (afterFlowBlock && !inlineRun.length && (isWhitespaceOnlyNode(child) || isSourceSeparatorBreak(child))) {
      continue;
    }

    if (isFlowSourceContainer(child, predicates) || isParagraphBreakingSource(child, predicates)) {
      flushInlineRun();
      output.push(...transformNode(child, context));
      afterFlowBlock = true;
      continue;
    }

    const transformed = transformNode(child, context);
    for (const node of transformed) {
      if (isParagraphBreakingSource(node, predicates)) {
        flushInlineRun();
        output.push(node);
        afterFlowBlock = true;
      } else {
        inlineRun.push(node);
        afterFlowBlock = false;
      }
    }
  }

  flushInlineRun();
  return output;
}

export function transformTreeParagraph(node, context, transformNode, predicates) {
  return transformArticleFlowChildren(node.children || [], context, transformNode, predicates, { paragraphAttrs: flowAttrs(node) });
}

function treeListAttrs(node) {
  const attrs = (node.attrs || [])
    .filter((attr) => attr.name.toLowerCase() !== 'class' && attr.name.toLowerCase() !== 'style')
    .filter((attr) => allowedFlowAttr(attr) || ['start', 'reversed'].includes(attr.name.toLowerCase()))
    .map((attr) => ({ ...attr }));
  if (node.tagName === 'ol') {
    const typeClass = getClasses(node).find((className) => TREE_LIST_TYPE_BY_CLASS[className]);
    const type = typeClass ? TREE_LIST_TYPE_BY_CLASS[typeClass] : '';
    if (type && !attrs.some((attr) => attr.name.toLowerCase() === 'type')) attrs.push({ name: 'type', value: type });
  }
  return attrs;
}

function transformTreeListItem(node, context, transformNode, predicates) {
  const attrs = (node.attrs || [])
    .filter((attr) => attr.name.toLowerCase() !== 'style')
    .map((attr) => ({ ...attr }));
  return elementNode('li', attrs, transformSingleParagraphContentOrChildren(node.children || [], context, transformNode, predicates), node.selfClosing);
}

export function transformTreeList(node, context, transformNode, predicates) {
  return elementNode(node.tagName, treeListAttrs(node), (node.children || []).flatMap((child) => {
    if (child.type === 'element' && child.tagName === 'li') return [transformTreeListItem(child, context, transformNode, predicates)];
    return transformNode(child, context);
  }), node.selfClosing);
}

export function isTreeIndent(node) {
  return node?.type === 'element' && node.tagName === 'div' && hasAnyClass(node, TREE_INDENT_CLASSES);
}

export function transformTreeIndent(node, context, transformNode, predicates) {
  return [elementNode('dl', [], [
    elementNode('dd', flowAttrs(node), transformSingleParagraphContentOrChildren(node.children || [], context, transformNode, predicates))
  ])];
}

export function isTreeBlockquote(node) {
  return node?.type === 'element' && node.tagName === 'blockquote' && hasAnyClass(node, TREE_BLOCKQUOTE_CLASSES);
}

export function transformTreeBlockquote(node, context, transformNode, predicates) {
  return [elementNode('blockquote', flowAttrs(node), transformArticleFlowChildren(node.children || [], context, transformNode, predicates))];
}

export function isTreeClearfix(node) {
  return node?.type === 'element' && node.tagName === 'div' && hasAnyClass(node, TREE_CLEARFIX_CLASSES);
}

export function transformTreeClearfix() {
  return [elementNode('div', [
    { name: 'style', value: 'clear:both' },
    { name: 'data-tt-vector-parser-bridge', value: 'clearfix' },
    { name: 'data-tt-article-compiler', value: 'clearfix' }
  ], [])];
}

function hasOnlyPreCodeCompatibleAttrs(node) {
  return !(node.attrs || []).some((attr) => {
    const name = attr.name.toLowerCase();
    if (name.startsWith('data-mw')) return false;
    if (['id', 'lang', 'dir', 'title'].includes(name)) return false;
    return String(attr.value || '').trim() !== '';
  });
}

export function isTheTreePreCodeBlock(node) {
  if (node?.type !== 'element' || node.tagName !== 'pre') return false;
  if (!hasOnlyPreCodeCompatibleAttrs(node)) return false;
  const significant = significantNodes(node.children || []);
  if (significant.length !== 1) return false;
  const code = significant[0];
  if (code?.type !== 'element' || code.tagName !== 'code') return false;
  return hasOnlyPreCodeCompatibleAttrs(code);
}

export function transformTreePreCodeBlock(node, context, transformNode) {
  const code = significantNodes(node.children || [])[0];
  const preAttrs = flowAttrs(node);
  return [elementNode('pre', preAttrs, (code.children || []).flatMap((child) => transformNode(child, context)))];
}
