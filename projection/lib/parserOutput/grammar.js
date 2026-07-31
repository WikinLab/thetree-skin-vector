/*
 * the tree parser-output source grammar -> MediaWiki parser-output feature map.
 *
 * This module is the only owner of host emitter tokens.  Transformation modules
 * consume exact class/attribute sets derived from this table and must not grow
 * independent alias lists or substring class heuristics.
 */

import { LINK_SEMANTICS } from '../linkSemantics.js';

export const CONTENT_HTML_FIELDS = Object.freeze([
  'contentHtml',
  'topDocument',
  'bottomDocument'
]);

function freezeRecord(record = {}) {
  return Object.freeze(Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      Array.isArray(value) ? Object.freeze([...value]) : value
    ])
  ));
}

function freezeFeature(feature) {
  return Object.freeze({
    ...feature,
    source: freezeRecord(feature.source),
    target: freezeRecord(feature.target),
    transform: freezeRecord(feature.transform),
    loss: Object.freeze([...(feature.loss || [])])
  });
}

export const PARSER_OUTPUT_FEATURE_MAP = Object.freeze({
  heading: freezeFeature({
    id: 'parser-output.heading',
    source: {
      system: 'thetree-namumark',
      rootTags: ['h2', 'h3', 'h4', 'h5', 'h6'],
      rootClasses: ['wiki-heading'],
      optionalRootClasses: ['wiki-heading-folded'],
      contentClasses: ['wiki-heading-content', 'wiki-heading-content-folded'],
      editSectionClasses: ['wiki-edit-section'],
      numberAnchor: 'a#s-<section-number>[href="#toc" or href="#tc<comment-id>-toc"]'
    },
    target: {
      system: 'mediawiki-1.45',
      rootClasses: ['mw-heading', 'mw-heading<level>'],
      editSectionClasses: ['mw-editsection', 'mw-editsection-bracket']
    },
    transform: { kind: 'section-ir-to-mediawiki-heading' },
    equivalence: 'analog',
    loss: ['the tree folded-heading interaction is host runtime state, not MediaWiki heading DOM']
  }),

  toc: freezeFeature({
    id: 'parser-output.toc',
    source: {
      system: 'thetree-namumark',
      rootClasses: ['wiki-macro-toc'],
      itemClasses: ['toc-item'],
      indentClasses: ['toc-indent']
    },
    target: {
      system: 'mediawiki-1.45',
      rootId: 'toc',
      rootClasses: ['toc'],
      itemClasses: ['toclevel-<level>', 'tocsection-<index>']
    },
    transform: { kind: 'section-ir-to-legacy-toc' },
    equivalence: 'analog',
    loss: ['the tree details open state is replaced by the MediaWiki legacy TOC toggle contract']
  }),

  categories: freezeFeature({
    id: 'parser-output.categories',
    source: {
      system: 'thetree-frontend',
      rootClasses: ['category'],
      explicitAdapterAttribute: 'data-tt-vector-category-source="1"',
      missingLinkClasses: ['not-exist']
    },
    target: {
      system: 'mediawiki-1.45',
      rootId: 'catlinks',
      rootClasses: ['catlinks'],
      normalId: 'mw-normal-catlinks',
      missingLinkClasses: ['new']
    },
    transform: { kind: 'category-list-to-catlinks' },
    equivalence: 'analog',
    loss: ['the tree folded category curtain is not part of MediaWiki catlinks']
  }),

  table: freezeFeature({
    id: 'parser-output.table',
    source: {
      system: 'thetree-namumark',
      rootClasses: ['wiki-table'],
      wrapperClasses: ['wiki-table-wrap'],
      wrapperAlignmentClasses: ['table-left', 'table-center', 'table-right']
    },
    target: {
      system: 'mediawiki-1.45',
      rootClasses: ['wikitable']
    },
    transform: { kind: 'table-subtree-to-wikitable' },
    equivalence: 'analog',
    loss: ['hashed custom presentation classes are preserved only where they are not host grammar classes']
  }),

  paragraph: freezeFeature({
    id: 'parser-output.paragraph',
    source: { system: 'thetree-namumark', rootClasses: ['wiki-paragraph'] },
    target: { system: 'mediawiki-1.45', rootTags: ['p'] },
    transform: { kind: 'block-level-pass-paragraph-flow' },
    equivalence: 'analog',
    loss: []
  }),

  list: freezeFeature({
    id: 'parser-output.list',
    source: {
      system: 'thetree-namumark',
      rootClasses: ['wiki-list'],
      typeClasses: ['wiki-list-alpha', 'wiki-list-upper-alpha', 'wiki-list-roman', 'wiki-list-upper-roman']
    },
    target: { system: 'mediawiki-1.45', rootTags: ['ul', 'ol'], typeAttributes: ['a', 'A', 'i', 'I'] },
    transform: { kind: 'list-class-to-semantic-attributes' },
    equivalence: 'exact',
    loss: []
  }),

  indent: freezeFeature({
    id: 'parser-output.indent',
    source: { system: 'thetree-namumark', rootClasses: ['wiki-indent'] },
    target: { system: 'mediawiki-1.45', rootTags: ['dl'], childTags: ['dd'] },
    transform: { kind: 'indent-wrapper-to-definition-list' },
    equivalence: 'analog',
    loss: []
  }),

  blockquote: freezeFeature({
    id: 'parser-output.blockquote',
    source: { system: 'thetree-namumark', rootClasses: ['wiki-quote'] },
    target: { system: 'mediawiki-1.45', rootTags: ['blockquote'] },
    transform: { kind: 'remove-host-presentation-class' },
    equivalence: 'exact',
    loss: []
  }),

  clearfix: freezeFeature({
    id: 'parser-output.clearfix',
    source: { system: 'thetree-frontend', rootClasses: ['wiki-clearfix'] },
    target: { system: 'mediawiki-parser-output', style: 'clear:both' },
    transform: { kind: 'host-clear-marker-to-flow-block' },
    equivalence: 'analog',
    loss: []
  }),

  preCodeBlock: freezeFeature({
    id: 'parser-output.pre-code-block',
    source: { system: 'thetree-namumark', structure: 'pre > code without source-language metadata' },
    target: { system: 'mediawiki-parser-output', structure: 'pre' },
    transform: { kind: 'unwrap-code-carrier' },
    equivalence: 'analog',
    loss: ['source language is unavailable, so SyntaxHighlight classification is forbidden']
  }),

  internalLink: freezeFeature({
    id: 'parser-output.internal-link',
    source: {
      system: 'thetree-namumark',
      rootClasses: LINK_SEMANTICS.internal.hostClasses,
      missingClasses: LINK_SEMANTICS.missing.hostClasses,
      selfClasses: LINK_SEMANTICS.self.hostClasses
    },
    target: {
      system: 'mediawiki-parser-output',
      missingClasses: LINK_SEMANTICS.missing.upstreamClasses,
      selfClasses: LINK_SEMANTICS.self.upstreamClasses
    },
    transform: { kind: 'host-link-state-to-mediawiki-link-state' },
    equivalence: 'analog',
    loss: []
  }),

  externalLink: freezeFeature({
    id: 'parser-output.external-link',
    source: {
      system: 'thetree-namumark',
      rootClasses: LINK_SEMANTICS.external.hostClasses,
      protocols: ['http', 'https', 'ftp']
    },
    target: { system: 'mediawiki-parser-output', rootClasses: LINK_SEMANTICS.external.emittedClasses },
    transform: { kind: 'external-anchor-to-mediawiki-external-link' },
    equivalence: 'analog',
    loss: ['the tree external-link icon allowlist is not represented as child DOM']
  }),

  reference: freezeFeature({
    id: 'parser-output.reference',
    source: {
      system: 'thetree-namumark',
      inlineClasses: ['wiki-fn-content'],
      listClasses: ['wiki-macro-footnote'],
      itemClasses: ['footnote-list'],
      targetIdFormat: '(tc<comment-id>-)?fn-<name>',
      inlineIdFormat: '(tc<comment-id>-)?rfn-<index>'
    },
    target: {
      system: 'mediawiki-extensions-Cite',
      inlineClasses: ['reference'],
      listWrapperClasses: ['mw-references-wrap'],
      listClasses: ['references']
    },
    transform: { kind: 'reference-ir-to-cite-dom' },
    equivalence: 'analog',
    loss: []
  }),

  parserOutputRoot: freezeFeature({
    id: 'parser-output.root',
    source: { system: 'thetree-frontend', fields: CONTENT_HTML_FIELDS },
    target: { system: 'mediawiki-parser-output', rootClasses: ['mw-parser-output'] },
    transform: { kind: 'content-html-to-parser-output-root' },
    equivalence: 'analog',
    loss: []
  })
});

function sourceClassSet(featureName, field) {
  return new Set(PARSER_OUTPUT_FEATURE_MAP[featureName].source[field] || []);
}

function sourceTargetValueMap(featureName, sourceField, targetField) {
  const sourceValues = PARSER_OUTPUT_FEATURE_MAP[featureName].source[sourceField] || [];
  const targetValues = PARSER_OUTPUT_FEATURE_MAP[featureName].target[targetField] || [];
  return Object.freeze(Object.fromEntries(
    sourceValues.map((sourceValue, index) => [sourceValue, targetValues[index]])
  ));
}

export const TREE_HEADING_CLASSES = sourceClassSet('heading', 'rootClasses');
export const TREE_HEADING_CONTENT_CLASSES = sourceClassSet('heading', 'contentClasses');
export const TREE_EDITSECTION_CLASSES = sourceClassSet('heading', 'editSectionClasses');
export const TREE_TOC_CLASSES = sourceClassSet('toc', 'rootClasses');
export const TREE_CATEGORY_CLASSES = sourceClassSet('categories', 'rootClasses');
export const TREE_TABLE_CLASSES = sourceClassSet('table', 'rootClasses');
export const TREE_TABLE_WRAPPER_CLASSES = sourceClassSet('table', 'wrapperClasses');
export const TREE_TABLE_ALIGNMENT_CLASSES = sourceClassSet('table', 'wrapperAlignmentClasses');
export const TREE_PARAGRAPH_CLASSES = sourceClassSet('paragraph', 'rootClasses');
export const TREE_LIST_CLASSES = sourceClassSet('list', 'rootClasses');
export const TREE_LIST_TYPE_CLASSES = sourceClassSet('list', 'typeClasses');
export const TREE_LIST_TYPE_BY_CLASS = sourceTargetValueMap('list', 'typeClasses', 'typeAttributes');
export const TREE_INDENT_CLASSES = sourceClassSet('indent', 'rootClasses');
export const TREE_BLOCKQUOTE_CLASSES = sourceClassSet('blockquote', 'rootClasses');
export const TREE_CLEARFIX_CLASSES = sourceClassSet('clearfix', 'rootClasses');
export const TREE_EXTERNAL_LINK_CLASSES = sourceClassSet('externalLink', 'rootClasses');
export const TREE_INTERNAL_LINK_CLASSES = sourceClassSet('internalLink', 'rootClasses');
export const TREE_MISSING_LINK_CLASSES = sourceClassSet('internalLink', 'missingClasses');
export const TREE_SELF_LINK_CLASSES = sourceClassSet('internalLink', 'selfClasses');
export const TREE_REFERENCE_LIST_CLASSES = sourceClassSet('reference', 'listClasses');
export const TREE_REFERENCE_ITEM_CLASSES = sourceClassSet('reference', 'itemClasses');
export const TREE_INLINE_REFERENCE_CLASSES = sourceClassSet('reference', 'inlineClasses');

export const TREE_HEADING_TAG_PATTERN = /^h[2-6]$/;
export const TREE_SECTION_ID_PATTERN = /^s-\d+(?:\.\d+)*$/i;
export const TREE_TOC_TARGET_PATTERN = /^#(?:tc\d+-)?toc$/i;
export const EXTERNAL_NOFOLLOW_SCHEME_PATTERN = /^(?:https?|ftp):/i;

export const TREE_FOOTNOTE_TARGET_ID_PATTERN = /^(?:tc\d+-)?fn-.+/i;
export const TREE_FOOTNOTE_INLINE_ID_PATTERN = /^(?:tc\d+-)?rfn-.+/i;
export const TREE_REFERENCE_BACKLINK_TEXT_PATTERN = /^\s*(?:\[[^\]\r\n]+\]|↑|\d+(?:\.\d+)*)\s*$/;
export const EXTERNAL_SCHEME_PATTERN = /^(?:https?|ftp|mailto|tel|ircs?|irc|news):/i;
export const SECTION_NUMBER_PATTERN = /^\s*(\d+(?:\.\d+)*)(?:\.)?\s*/;

export const ARTICLE_INPUT_GRAMMAR = Object.freeze({
  contentFields: CONTENT_HTML_FIELDS.slice(),
  heading: 'h2-h6.wiki-heading with an exact section-number anchor and optional .wiki-edit-section, followed by .wiki-heading-content',
  toc: 'div.wiki-macro-toc emitted by the tree namumark worker',
  category: 'the tree frontend div.category or an explicit data-tt-vector-category-source adapter marker',
  table: 'div.wiki-table-wrap containing table.wiki-table',
  clearfix: 'div.wiki-clearfix',
  paragraph: 'div.wiki-paragraph',
  list: 'ul/ol.wiki-list with one optional exact wiki-list type class',
  indent: 'div.wiki-indent',
  blockquote: 'blockquote.wiki-quote',
  preCodeBlock: 'pre > code with optional highlight token spans and without source-language metadata',
  ordinaryBlock: 'source block and inline nodes preserved unless an exact feature-map source rule applies',
  internalLink: 'a.wiki-link-internal with exact not-exist/wiki-self-link state classes',
  reference: 'a.wiki-fn-content plus div.wiki-macro-footnote > span.footnote-list',
  externalLink: 'a.wiki-link-external or a.wiki-link-whitelisted; URL protocol grammar remains a semantic URL check rather than a class alias'
});

export const ARTICLE_OUTPUT_GRAMMAR = Object.freeze({
  heading: 'MediaWiki 1.45 div.mw-heading.mw-headingN containing hN and optional sibling span.mw-editsection',
  toc: 'MediaWiki legacy Vector #toc .toctitle ul/li.toclevel-* structure',
  category: 'MediaWiki #catlinks > #mw-normal-catlinks > ul > li structure',
  table: 'MediaWiki table.wikitable subtree with source wrapper layout folded into table attributes',
  preCodeBlock: 'MediaWiki generic pre subtree with text/highlight spans preserved and inner code carrier removed',
  clearfix: 'MediaWiki clear-both flow block',
  paragraph: 'MediaWiki p at article flow and unwrapped inline content in simple table/list contexts',
  list: 'semantic ul/ol with type/start attributes and without host presentation classes',
  indent: 'MediaWiki dl > dd indentation flow',
  blockquote: 'MediaWiki blockquote',
  ordinaryBlock: 'parser-output flow nodes preserved without wrapper insertion',
  internalLink: 'MediaWiki article anchor with new status class only when the exact source state indicates it',
  reference: 'MediaWiki sup.reference and div.mw-references-wrap > ol.references',
  adjunct: 'TOC and editsection each retain one origin CSS/DOM contract',
  parserOutputRoot: 'one compiler-owned contentHtml .mw-parser-output root; topDocument/bottomDocument remain fragments',
  externalLink: 'MediaWiki a.external.text without inferred child-decorator removal'
});
