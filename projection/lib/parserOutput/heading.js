/*
 * the tree heading source -> MediaWiki section heading contract.
 */

import {
  VOID_ELEMENTS,
  cloneNode,
  elementNode,
  findFirstElement,
  getAttr,
  getClasses,
  plainText,
  textContent,
  textNode
} from './domAst.js';
import {
  SECTION_NUMBER_PATTERN,
  TREE_EDITSECTION_CLASSES,
  TREE_HEADING_TAG_PATTERN,
  TREE_SECTION_ID_PATTERN,
  TREE_TOC_TARGET_PATTERN,
  TREE_HEADING_CLASSES,
  TREE_HEADING_CONTENT_CLASSES
} from './grammar.js';

function hasTheTreeHeadingClass(node) {
  return getClasses(node).some((className) => TREE_HEADING_CLASSES.has(className));
}

export function isTreeHeading(node) {
  return node?.type === 'element'
    && TREE_HEADING_TAG_PATTERN.test(node.tagName)
    && hasTheTreeHeadingClass(node)
    && (node.children || []).some(isBackendHeadingNumberAnchor);
}

export function isHeadingContent(node) {
  return node?.type === 'element'
    && getClasses(node).some((className) => TREE_HEADING_CONTENT_CLASSES.has(className));
}

function headingLevel(node) {
  return TREE_HEADING_TAG_PATTERN.test(node?.tagName || '') ? Number(node.tagName[1]) : 2;
}

function isBackendHeadingNumberAnchor(node) {
  if (node?.type !== 'element' || node.tagName !== 'a') return false;
  const href = getAttr(node, 'href');
  const id = getAttr(node, 'id');
  const label = plainText(node.children || []);
  const pointsToToc = TREE_TOC_TARGET_PATTERN.test(href);
  const hasSectionId = TREE_SECTION_ID_PATTERN.test(id);
  const hasSectionLabel = SECTION_NUMBER_PATTERN.test(label);
  return pointsToToc && hasSectionId && hasSectionLabel;
}

function isHeadingNumberNode(node) {
  return isBackendHeadingNumberAnchor(node);
}

function isEditSectionNode(node) {
  return node?.type === 'element'
    && getClasses(node).some((className) => TREE_EDITSECTION_CLASSES.has(className));
}

function extractLeadingNumberFromText(value) {
  const match = SECTION_NUMBER_PATTERN.exec(value || '');
  if (!match) return { number: '', rest: value };
  return { number: match[1], rest: String(value).slice(match[0].length) };
}

function stripLeadingNumberFromNodes(nodes) {
  const out = (nodes || []).map(cloneNode);
  for (const node of out) {
    if (node.type === 'text') {
      const parsed = extractLeadingNumberFromText(node.value);
      node.value = parsed.rest;
      return { number: parsed.number, nodes: out };
    }
    if (node.type === 'element') {
      const parsed = stripLeadingNumberFromNodes(node.children || []);
      node.children = parsed.nodes;
      if (parsed.number) return { number: parsed.number, nodes: out };
      if (plainText(node.children)) return { number: '', nodes: out };
    }
  }
  return { number: '', nodes: out };
}

export function normalizeSectionNumber(value) {
  return String(value || '').trim().replace(/\.+$/, '');
}

function headingNumberFromNode(node) {
  if (!node) return '';
  const id = getAttr(node, 'id');
  if (TREE_SECTION_ID_PATTERN.test(id)) return normalizeSectionNumber(id.slice(2));
  return normalizeSectionNumber(plainText(node.children || []));
}

function headingTitleCarrierAnchor(nodes) {
  const visible = nodes.filter((node) => node.type !== 'text' || node.value.trim() !== '');
  if (visible.length === 1 && visible[0].type === 'element' && visible[0].tagName === 'span') {
    return getAttr(visible[0], 'id');
  }
  const firstSpanWithId = visible.find((node) => node.type === 'element' && node.tagName === 'span' && getAttr(node, 'id'));
  return firstSpanWithId ? getAttr(firstSpanWithId, 'id') : '';
}

function shouldUnwrapHeadingTitleCarrier(node) {
  if (node?.type !== 'element' || node.tagName !== 'span') return false;
  return (node.attrs || []).every((attr) => ['id'].includes(attr.name.toLowerCase()));
}

function unwrapHeadingTitleCarrier(nodes) {
  const trimmed = trimTextNodeEdges(nodes);
  const visible = trimmed.filter((node) => node.type !== 'text' || node.value.trim() !== '');
  if (visible.length === 1 && shouldUnwrapHeadingTitleCarrier(visible[0])) {
    return trimTextNodeEdges((visible[0].children || []).map(cloneNode));
  }
  return trimmed;
}

function stripHeadingArtifactsFromNodes(nodes) {
  const out = [];
  let number = '';
  let editSource = null;

  for (const node of nodes || []) {
    if (node.type !== 'element') {
      out.push(cloneNode(node));
      continue;
    }
    if (isHeadingNumberNode(node)) {
      number ||= headingNumberFromNode(node);
      continue;
    }
    if (isEditSectionNode(node)) {
      editSource ||= node;
      continue;
    }
    const childResult = stripHeadingArtifactsFromNodes(node.children || []);
    number ||= childResult.number;
    editSource ||= childResult.editSource;
    const clone = elementNode(
      node.tagName,
      node.attrs.map((attr) => ({ ...attr })),
      childResult.nodes,
      node.selfClosing
    );
    const emptyElement = !VOID_ELEMENTS.has(clone.tagName)
      && (!clone.children || clone.children.length === 0)
      && !getAttr(clone, 'id')
      && !getAttr(clone, 'name');
    if (!emptyElement) out.push(clone);
  }

  return { number, editSource, nodes: out };
}

export function trimTextNodeEdges(nodes) {
  const out = nodes.slice();
  while (out.length && out[0].type === 'text' && out[0].value.trim() === '') out.shift();
  while (out.length && out[out.length - 1].type === 'text' && out[out.length - 1].value.trim() === '') out.pop();
  if (out.length && out[0].type === 'text') out[0].value = out[0].value.replace(/^\s+/, '');
  if (out.length && out[out.length - 1].type === 'text') out[out.length - 1].value = out[out.length - 1].value.replace(/\s+$/, '');
  return out;
}

function sanitizeAnchorId(value, fallback) {
  const raw = String(value || '').trim();
  if (raw) return raw;
  const base = String(fallback || '').trim().replace(/\s+/g, '_');
  return base || 'section';
}

function cleanTitleNodes(nodes, context, transformNode) {
  return nodes.flatMap((node) => transformNode(node, context, { inHeadingTitle: true }));
}

function normalizeEditLabel(value, context) {
  return String(value || '')
    .replace(/[\[\]［］]/g, '')
    .trim() || context.messages.edit;
}

function findFirstAnchor(node) {
  return findFirstElement(node, (child) => child.tagName === 'a');
}

function makeEditSectionNode(source, context) {
  if (!source) return null;
  const sourceLink = source.tagName === 'a' ? source : findFirstAnchor(source);
  const linkAttrs = sourceLink
    ? sourceLink.attrs.filter((attr) => !['class', 'style'].includes(attr.name.toLowerCase())).map((attr) => ({ ...attr }))
    : [{ name: 'href', value: '#' }];
  const label = normalizeEditLabel(plainText(sourceLink?.children?.length ? sourceLink.children : source.children), context);
  return elementNode('span', [{ name: 'class', value: 'mw-editsection' }], [
    elementNode('span', [{ name: 'class', value: 'mw-editsection-bracket' }], [textNode('[')]),
    elementNode('a', linkAttrs, [textNode(label)]),
    elementNode('span', [{ name: 'class', value: 'mw-editsection-bracket' }], [textNode(']')])
  ]);
}

export function extractSectionModel(node, index) {
  const level = headingLevel(node);
  const sourceTitle = stripHeadingArtifactsFromNodes(node.children || []);
  let number = normalizeSectionNumber(sourceTitle.number);
  const titleCarrierAnchor = headingTitleCarrierAnchor(sourceTitle.nodes);
  const stripped = stripLeadingNumberFromNodes(sourceTitle.nodes);
  if (!number) number = normalizeSectionNumber(stripped.number);
  const titleNodes = unwrapHeadingTitleCarrier(stripped.nodes.filter((child) => child.type !== 'text' || child.value !== ''));
  const title = plainText(titleNodes) || plainText(sourceTitle.nodes).replace(SECTION_NUMBER_PATTERN, '').trim();
  const anchor = sanitizeAnchorId(
    getAttr(node, 'id') || getAttr(node, 'data-id') || getAttr(node, 'data-anchor') || titleCarrierAnchor,
    title || `section-${index}`
  );

  return {
    kind: 'SectionIR',
    source: node,
    index,
    level,
    number,
    title,
    titleNodes,
    anchor,
    editSource: sourceTitle.editSource || null
  };
}

export function collectSectionModels(root, collectElements) {
  const sections = [];
  collectElements(root, isTreeHeading).forEach((heading, index) => {
    const section = extractSectionModel(heading, index + 1);
    sections.push(section);
  });
  return sections;
}

export function renderHeadingFromSection(section, context, transformNode) {
  const titleChildren = cleanTitleNodes(section.titleNodes, context, transformNode);
  const heading = elementNode(`h${section.level}`, [
    { name: 'id', value: section.anchor }
  ], titleChildren.length ? titleChildren : [textNode(section.title || section.anchor)]);
  const children = [heading];
  const editSection = makeEditSectionNode(section.editSource, context);
  if (editSection) children.push(editSection);
  return elementNode('div', [
    { name: 'class', value: 'mw-heading mw-heading' + section.level },
    { name: 'data-tt-vector-parser-bridge', value: 'heading' },
    { name: 'data-tt-article-compiler', value: 'heading' }
  ], children);
}
