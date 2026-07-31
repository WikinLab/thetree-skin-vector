/*
 * the tree footnote source -> MediaWiki Cite reference contract.
 */

import {
  VOID_ELEMENTS,
  cloneNode,
  cloneNodes,
  collectElements,
  elementNode,
  findFirstElement,
  getAttr,
  getClasses,
  isWhitespaceOnlyNode,
  plainText,
  textNode
} from './domAst.js';
import {
  TREE_FOOTNOTE_INLINE_ID_PATTERN,
  TREE_FOOTNOTE_TARGET_ID_PATTERN,
  TREE_INLINE_REFERENCE_CLASSES,
  TREE_REFERENCE_BACKLINK_TEXT_PATTERN,
  TREE_REFERENCE_ITEM_CLASSES,
  TREE_REFERENCE_LIST_CLASSES
} from './grammar.js';

export function isCompiledReferenceSup(node) {
  if (node?.type !== 'element' || node.tagName !== 'sup') return false;
  if (getAttr(node, 'data-tt-article-compiler') === 'reference-inline') return true;
  if (!getClasses(node).includes('reference')) return false;
  const link = findFirstElement(node, (child) => child.tagName === 'a' && getAttr(child, 'href'));
  return /^cite_ref(?:-|_)/.test(getAttr(node, 'id')) && /^#cite_note(?:-|_)/.test(getAttr(link, 'href'));
}

function isTreeInlineFootnoteAnchor(node) {
  return node?.type === 'element'
    && node.tagName === 'a'
    && getClasses(node).some((className) => TREE_INLINE_REFERENCE_CLASSES.has(className));
}

export function isReferenceSup(node) {
  return isTreeInlineFootnoteAnchor(node);
}

function decodeReferenceFragment(value) {
  const raw = String(value || '').replace(/^#/, '').trim();
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function normalizeReferenceKey(value) {
  const raw = decodeReferenceFragment(value)
    .replace(/^cite_note[-_]/, '')
    .replace(/^cite_ref[-_]/, '')
    .replace(/^reference[-_]/, '')
    .replace(/^fn(?:[-_])?/, '')
    .replace(/^rfn(?:[-_])?/, '')
    .trim();
  return raw || '';
}

function referenceKeyFromInline(node) {
  const link = node?.tagName === 'a' && getAttr(node, 'href') ? node : findFirstElement(node, (child) => child.tagName === 'a' && getAttr(child, 'href'));
  return normalizeReferenceKey(getAttr(link, 'href'))
    || normalizeReferenceKey(getAttr(node, 'data-reference-id'))
    || normalizeReferenceKey(getAttr(node, 'id'));
}

function isTheTreeFootnoteTargetId(value) {
  return TREE_FOOTNOTE_TARGET_ID_PATTERN.test(String(value || ''));
}

function isTheTreeFootnoteInlineId(value) {
  return TREE_FOOTNOTE_INLINE_ID_PATTERN.test(String(value || ''));
}

function isTheTreeFootnoteTargetAnchor(node) {
  return node?.type === 'element'
    && node.tagName === 'a'
    && isTheTreeFootnoteInlineId(decodeReferenceFragment(getAttr(node, 'href')));
}

function isTheTreeFootnoteTargetIdCarrier(node) {
  return node?.type === 'element'
    && isTheTreeFootnoteTargetId(getAttr(node, 'id'))
    && plainText(node.children || '').trim() === '';
}

function referenceKeyFromListItem(node, fallbackIndex = 0) {
  const idCarrier = findFirstElement(node, (child) => getAttr(child, 'id') && (
    isTheTreeFootnoteTargetId(getAttr(child, 'id'))
      || /^(?:cite_note|reference)[-_]/i.test(getAttr(child, 'id'))
  ));
  const anchor = findFirstElement(node, (child) => child.tagName === 'a' && getAttr(child, 'id'));
  return normalizeReferenceKey(getAttr(node, 'data-reference-id'))
    || normalizeReferenceKey(getAttr(node, 'id'))
    || normalizeReferenceKey(getAttr(idCarrier, 'id'))
    || normalizeReferenceKey(getAttr(anchor, 'id'))
    || `${fallbackIndex + 1}`;
}

function isCompiledReferenceList(node) {
  if (node?.type !== 'element') return false;
  if (getAttr(node, 'data-tt-article-compiler') === 'references') return true;
  const classes = getClasses(node);
  if (classes.includes('mw-references-wrap')) return true;
  return node.tagName === 'ol' && classes.includes('references');
}

export function isReferenceList(node) {
  if (node?.type !== 'element' || isCompiledReferenceList(node)) return false;
  return node.tagName === 'div'
    && getClasses(node).some((className) => TREE_REFERENCE_LIST_CLASSES.has(className));
}

function ensureReferenceNote(context, key) {
  const normalized = normalizeReferenceKey(key) || `reference-${context.referenceNotes.length + 1}`;
  const existing = context.referenceNoteByKey.get(normalized);
  if (existing) return existing;
  const note = {
    key: normalized,
    number: context.referenceNotes.length + 1,
    refs: [],
    itemSource: null
  };
  context.referenceNotes.push(note);
  context.referenceNoteByKey.set(normalized, note);
  return note;
}

function isFootnoteListItem(node) {
  return node?.type === 'element' && getClasses(node).some((className) => TREE_REFERENCE_ITEM_CLASSES.has(className));
}

function collectReferenceItemsFromSource(node) {
  if (node?.type !== 'element') return [];
  if (node.tagName === 'div') {
    const list = findFirstElement(node, (child) => ['ol', 'ul'].includes(child.tagName));
    if (list) return list.children.filter((child) => child.type === 'element' && child.tagName === 'li');
    return (node.children || []).filter(isFootnoteListItem);
  }
  if (['ol', 'ul'].includes(node.tagName)) return node.children.filter((child) => child.type === 'element' && child.tagName === 'li');
  return isFootnoteListItem(node) ? [node] : [];
}

export function collectReferenceModels(ast, context) {
  const inlineSources = collectElements(ast, (node) => isReferenceSup(node) && !isCompiledReferenceSup(node));
  inlineSources.forEach((source, index) => {
    const note = ensureReferenceNote(context, referenceKeyFromInline(source) || `${index + 1}`);
    const ref = { source, note, ordinal: note.refs.length };
    note.refs.push(ref);
    context.referenceInlineBySource.set(source, ref);
  });

  const listSources = collectElements(ast, isReferenceList);
  listSources.forEach((listSource) => {
    collectReferenceItemsFromSource(listSource).forEach((item, itemIndex) => {
      const note = ensureReferenceNote(context, referenceKeyFromListItem(item, itemIndex));
      if (!note.itemSource) note.itemSource = item;
      context.referenceListItemBySource.set(item, note);
    });
  });
}

function citeReferenceKeyPart(note) {
  const raw = String(note?.key || note?.number || '1').trim() || '1';
  return raw
    .replace(/\s+/g, '_')
    .replace(/[\[\]<>"'#%{}|\\^~`?]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || String(note?.number || 1);
}

function referenceInlineId(note, ordinal = 0) {
  if (!note) return 'cite_ref-1_1-0';
  return `cite_ref-${citeReferenceKeyPart(note)}_${note.number}-${ordinal}`;
}

function referenceNoteId(note) {
  if (!note) return 'cite_note-1-1';
  return `cite_note-${citeReferenceKeyPart(note)}-${note.number}`;
}

function citeBracket(value) {
  return elementNode('span', [{ name: 'class', value: 'cite-bracket' }], [textNode(value)]);
}

export function transformReferenceSup(node, context) {
  if (isCompiledReferenceSup(node)) return cloneNode(node);
  const ref = context.referenceInlineBySource.get(node);
  const note = ref?.note || ensureReferenceNote(context, referenceKeyFromInline(node));
  const ordinal = ref?.ordinal || 0;
  return elementNode('sup', [
    { name: 'id', value: referenceInlineId(note, ordinal) },
    { name: 'class', value: 'reference' },
    { name: 'data-tt-vector-parser-bridge', value: 'reference' },
    { name: 'data-tt-article-compiler', value: 'reference-inline' }
  ], [
    elementNode('a', [{ name: 'href', value: `#${referenceNoteId(note)}` }], [
      citeBracket('['),
      textNode(String(note.number)),
      citeBracket(']')
    ])
  ]);
}

function isTheTreeFootnoteListMarkerNode(node) {
  if (!node) return false;
  if (isTheTreeFootnoteTargetAnchor(node)) return true;
  if (node.type === 'text') return TREE_REFERENCE_BACKLINK_TEXT_PATTERN.test(node.value) && node.value.trim() !== '';
  if (node.type === 'element') {
    const text = plainText(node.children || []);
    return TREE_REFERENCE_BACKLINK_TEXT_PATTERN.test(text) && text.trim() !== '';
  }
  return false;
}

function stripReferenceMarker(nodes) {
  const out = cloneNodes(nodes);

  while (out.length && (isWhitespaceOnlyNode(out[0]) || isTheTreeFootnoteTargetIdCarrier(out[0]))) {
    out.shift();
  }

  while (out.length && (isTheTreeFootnoteListMarkerNode(out[0]) || isWhitespaceOnlyNode(out[0]))) {
    out.shift();
  }

  return out
    .map((node, index) => (index === 0 && node.type === 'text' ? textNode(node.value.replace(/^\s+/, '')) : node))
    .filter((node) => node.type !== 'text' || node.value !== '')
    .filter((node) => node.type !== 'element' || node.children?.length || VOID_ELEMENTS.has(node.tagName));
}

function referenceItemsFrom(node) {
  const sourceItems = collectReferenceItemsFromSource(node);
  if (sourceItems.length) return sourceItems;
  const list = node.tagName === 'div' ? findFirstElement(node, (child) => ['ol', 'ul'].includes(child.tagName)) : node;
  if (!list) return collectReferenceItemsFromSource(node);
  return list.children
    .filter((child) => child.type !== 'text' || child.value.trim())
    .map((child) => elementNode('li', [], [cloneNode(child)]));
}

function backlinkChildrenForNote(note, context) {
  if (!note?.refs?.length) {
    return [elementNode('a', [{ name: 'href', value: `#cite_ref-${note?.number || 1}` }], [textNode(context.messages.backlink)])];
  }
  if (note.refs.length === 1) {
    return [elementNode('a', [{ name: 'href', value: `#${referenceInlineId(note, note.refs[0].ordinal)}` }], [textNode(context.messages.backlink)])];
  }
  const children = [textNode(context.messages.backlink), textNode(' ')];
  note.refs.forEach((ref, index) => {
    if (index > 0) children.push(textNode(' '));
    children.push(elementNode('sup', [], [
      elementNode('a', [{ name: 'href', value: `#${referenceInlineId(note, ref.ordinal)}` }], [textNode(`${note.number}.${index}`)])
    ]));
  });
  return children;
}

export function transformReferenceList(node, context, transformNode) {
  if (isCompiledReferenceList(node)) return cloneNode(node);
  const items = referenceItemsFrom(node);
  if (!items.length) return cloneNode(node);
  const liNodes = items.map((item, itemIndex) => {
    const note = context.referenceListItemBySource.get(item) || ensureReferenceNote(context, referenceKeyFromListItem(item, itemIndex));
    return elementNode('li', [{ name: 'id', value: referenceNoteId(note) }], [
      elementNode('span', [{ name: 'class', value: 'mw-cite-backlink' }], backlinkChildrenForNote(note, context)),
      textNode(' '),
      elementNode('span', [{ name: 'class', value: 'reference-text' }], stripReferenceMarker(item.children).flatMap((child) => transformNode(child, context)))
    ]);
  });
  return elementNode('div', [
    { name: 'class', value: 'mw-references-wrap' },
    { name: 'data-tt-vector-parser-bridge', value: 'references' },
    { name: 'data-tt-article-compiler', value: 'references' }
  ], [elementNode('ol', [{ name: 'class', value: 'references' }], liNodes)]);
}
