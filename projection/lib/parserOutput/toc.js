/*
 * the tree TOC source -> MediaWiki legacy TOC contract.
 */

import {
  elementNode,
  getAttr,
  hasAnyClass,
  textNode
} from './domAst.js';
import { TREE_TOC_CLASSES } from './grammar.js';
import { normalizeSectionNumber } from './heading.js';

export function isTreeToc(node) {
  if (node?.type !== 'element') return false;
  return hasAnyClass(node, TREE_TOC_CLASSES);
}

function tocLevel(section, context) {
  const base = context.minSectionLevel || 2;
  return Math.max(1, section.level - base + 1);
}

function makeTocAnchor(section) {
  const number = normalizeSectionNumber(section.number || String(section.index));
  return elementNode('a', [{ name: 'href', value: `#${section.anchor}` }], [
    elementNode('span', [{ name: 'class', value: 'tocnumber' }], [textNode(number)]),
    textNode(' '),
    elementNode('span', [{ name: 'class', value: 'toctext' }], [textNode(section.title || section.anchor)])
  ]);
}

function appendTocItem(list, section, level, context) {
  if (!list.__lastByLevel) list.__lastByLevel = new Map();
  let targetList = list;
  if (level > 1) {
    const parent = list.__lastByLevel.get(level - 1) || list.__lastByLevel.get(1);
    if (parent) {
      let nested = parent.children.find((child) => child.type === 'element' && child.tagName === 'ul' && getAttr(child, 'data-tt-toc-level') === String(level));
      if (!nested) {
        nested = elementNode('ul', [{ name: 'data-tt-toc-level', value: String(level) }], []);
        parent.children.push(nested);
      }
      targetList = nested;
      targetList.__lastByLevel = list.__lastByLevel;
    }
  }
  const item = elementNode('li', [
    { name: 'class', value: `toclevel-${level} tocsection-${section.index}` }
  ], [makeTocAnchor(section, context)]);
  targetList.children.push(item);
  list.__lastByLevel.set(level, item);
  for (const key of [...list.__lastByLevel.keys()]) {
    if (key > level) list.__lastByLevel.delete(key);
  }
}

function stripPrivateTocAttrs(node) {
  if (node.type === 'element') {
    node.attrs = node.attrs.filter((attr) => attr.name !== 'data-tt-toc-level');
    node.children.forEach(stripPrivateTocAttrs);
  }
}

export function renderTocFromSections(context) {
  if (!context.sections.length) return null;
  const checkboxId = 'toctogglecheckbox';
  const list = elementNode('ul', [], []);
  context.sections.forEach((section) => appendTocItem(list, section, tocLevel(section, context), context));
  stripPrivateTocAttrs(list);
  return elementNode('div', [
    { name: 'id', value: 'toc' },
    { name: 'class', value: 'toc' },
    { name: 'role', value: 'navigation' },
    { name: 'aria-labelledby', value: 'mw-toc-heading' }
  ], [
    elementNode('input', [
      { name: 'type', value: 'checkbox' },
      { name: 'role', value: 'button' },
      { name: 'id', value: checkboxId },
      { name: 'class', value: 'toctogglecheckbox' },
      { name: 'style', value: 'display:none' }
    ], [], true),
    elementNode('div', [
      { name: 'class', value: 'toctitle' },
      { name: 'lang', value: context.htmlLang },
      { name: 'dir', value: context.dir }
    ], [
      elementNode('h2', [{ name: 'id', value: 'mw-toc-heading' }], [textNode(context.messages.tocTitle)]),
      elementNode('span', [{ name: 'class', value: 'toctogglespan' }], [
        elementNode('label', [{ name: 'class', value: 'toctogglelabel' }, { name: 'for', value: checkboxId }], [])
      ])
    ]),
    list
  ]);
}
