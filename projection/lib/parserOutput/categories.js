/*
 * Category source -> MediaWiki #catlinks contract.
 */

import {
  cloneNode,
  collectElements,
  elementNode,
  getAttr,
  getClasses,
  hasAnyClass,
  plainText,
  textNode
} from './domAst.js';
import {
  TREE_CATEGORY_CLASSES,
  TREE_MISSING_LINK_CLASSES
} from './grammar.js';
import { LINK_SEMANTICS } from '../linkSemantics.js';

export function isCompiledCategoryLinks(node) {
  return node?.type === 'element'
    && (getAttr(node, 'data-tt-article-compiler') === 'categories'
      || getAttr(node, 'data-tt-vector-category-slot') === '1'
      || (getAttr(node, 'id') === 'catlinks' && getClasses(node).includes('catlinks')));
}

export function isTreeCategorySource(node) {
  if (node?.type !== 'element') return false;
  if (isCompiledCategoryLinks(node)) return false;
  if (getAttr(node, 'data-tt-vector-category-source') === '1') return true;
  return hasAnyClass(node, TREE_CATEGORY_CLASSES);
}

function categoryTextFromNode(node) {
  return plainText(node.children || [])
    .replace(/^\s*(?:분류|category)\s*[:：]\s*/i, '')
    .trim();
}

function categoryLinkAttrs(source) {
  const attrs = source.attrs
    .filter((attr) => !['class', 'style', 'id'].includes(attr.name.toLowerCase()))
    .map((attr) => ({ ...attr }));
  const sourceClasses = getClasses(source);
  const classes = [];
  if (sourceClasses.some((className) => (
    LINK_SEMANTICS.missing.upstreamClasses.includes(className)
    || TREE_MISSING_LINK_CLASSES.has(className)
  ))) {
    classes.push(...LINK_SEMANTICS.missing.upstreamClasses);
  }
  if (sourceClasses.includes('mw-redirect')) classes.push('mw-redirect');
  if (sourceClasses.includes('stub')) classes.push('stub');
  if (classes.length) attrs.push({ name: 'class', value: Array.from(new Set(classes)).join(' ') });
  return attrs;
}

function categoryItemsFrom(node) {
  const anchors = collectElements(node, (child) => child.tagName === 'a' && getAttr(child, 'href'));
  const items = anchors
    .map((anchor) => {
      const text = categoryTextFromNode(anchor);
      if (!text) return null;
      return elementNode('li', [], [elementNode('a', categoryLinkAttrs(anchor), [textNode(text)])]);
    })
    .filter(Boolean);
  if (items.length) return items;

  const liNodes = collectElements(node, (child) => child.tagName === 'li')
    .map((item) => {
      const text = categoryTextFromNode(item);
      return text ? elementNode('li', [], [textNode(text)]) : null;
    })
    .filter(Boolean);
  if (liNodes.length) return liNodes;

  const text = categoryTextFromNode(node);
  return text ? [elementNode('li', [], [textNode(text)])] : [];
}

function renderCategoryLinks(node, context) {
  const items = categoryItemsFrom(node);
  if (!items.length) return [cloneNode(node)];
  return [elementNode('div', [
    { name: 'id', value: 'catlinks' },
    { name: 'class', value: 'catlinks' },
    { name: 'data-tt-vector-parser-bridge', value: 'categories' },
    { name: 'data-tt-article-compiler', value: 'categories' }
  ], [
    elementNode('div', [{ name: 'id', value: 'mw-normal-catlinks' }, { name: 'class', value: 'mw-normal-catlinks' }], [
      elementNode('span', [{ name: 'class', value: 'mw-catlinks-label' }], [textNode(context.messages.categories)]),
      textNode(': '),
      elementNode('ul', [], items)
    ])
  ])];
}

export function transformCategorySource(node, context) {
  if (context.hasStructuredCategories) return [];
  return renderCategoryLinks(node, context);
}
