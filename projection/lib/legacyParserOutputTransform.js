/*
 * Skin-level article compiler for the tree WikiContent HTML.
 *
 * The parser/frontend cannot be changed, so the skin owns a narrow pre-render
 * compiler boundary: the tree contentHtml/topDocument/bottomDocument fragments
 * are read before <nuxt/> paints, interpreted into small article IR models, and
 * emitted as MediaWiki-compatible parser-output structures. This file is the
 * orchestration boundary; parser-output sub-contracts live under lib/parserOutput/.
 */

import { makeLegacyMediaWikiLanguageContext } from '../../lib/legacyMediaWikiMessages.js';
import {
  parseHtmlFragment,
  serializeHtml,
  cloneNode,
  collectElements
} from './parserOutput/domAst.js';
import {
  ARTICLE_INPUT_GRAMMAR as PARSER_INPUT_GRAMMAR,
  ARTICLE_OUTPUT_GRAMMAR as PARSER_OUTPUT_GRAMMAR
} from './parserOutput/grammar.js';
import {
  isTreeCategorySource,
  transformCategorySource
} from './parserOutput/categories.js';
import {
  collectReferenceModels,
  isReferenceList,
  isReferenceSup,
  transformReferenceList,
  transformReferenceSup
} from './parserOutput/cite.js';
import {
  collectSectionModels,
  isHeadingContent,
  isTreeHeading,
  renderHeadingFromSection
} from './parserOutput/heading.js';
import {
  isTreeToc,
  renderTocFromSections
} from './parserOutput/toc.js';
import {
  isTheTreePreCodeBlock,
  isTreeBlockquote,
  isTreeClearfix,
  isTreeIndent,
  isTreeList,
  isTreeParagraph,
  transformArticleFlowChildren,
  transformSingleParagraphContentOrChildren,
  transformTreeBlockquote,
  transformTreeClearfix,
  transformTreeIndent,
  transformTreeList,
  transformTreeParagraph,
  transformTreePreCodeBlock
} from './parserOutput/flow.js';
import {
  isTreeTable,
  isTreeTableWrapper,
  renderTableNode,
  renderTableWrapper
} from './parserOutput/tables.js';
import {
  isExternalLink,
  isInternalWikiLink,
  transformExternalLink,
  transformInternalWikiLink
} from './parserOutput/links.js';
import {
  emitArticleRoot,
  unwrapParserOutputRootWrapper
} from './parserOutput/root.js';
import {
  STORE_ARTICLE_HTML_TARGETS,
  applyLegacyParserOutputTransformToStore as applyStoreParserOutputTransform,
  collectLegacyParserOutputStoreTargets,
  subscribeLegacyParserOutputTransformToStore as subscribeStoreParserOutputTransform
} from './parserOutput/store.js';

export {
  PARSER_INPUT_GRAMMAR as ARTICLE_INPUT_GRAMMAR,
  PARSER_OUTPUT_GRAMMAR as ARTICLE_OUTPUT_GRAMMAR,
  parseHtmlFragment,
  serializeHtml,
  STORE_ARTICLE_HTML_TARGETS,
  collectLegacyParserOutputStoreTargets
};

function mediaWikiLanguageContext(lang, options = {}) {
  return makeLegacyMediaWikiLanguageContext({ lang, ...options });
}

const PARSER_OUTPUT_SOURCE_PREDICATES = Object.freeze({
  isTreeToc,
  isTreeHeading,
  isHeadingContent,
  isTreeCategorySource,
  isTreeTableWrapper,
  isTreeTable,
  isReferenceList
});

function transformChildren(children, context) {
  const output = [];
  for (const child of children) output.push(...transformNode(child, context));
  return output;
}

function transformTableSingleParagraphContent(children, context) {
  return transformSingleParagraphContentOrChildren(children, context, transformNode, PARSER_OUTPUT_SOURCE_PREDICATES);
}

export function transformNode(node, context, flags = {}) {
  if (!node) return [];
  if (node.type === 'text' || node.type === 'comment') return [cloneNode(node)];
  if (node.type === 'root') return transformArticleFlowChildren(node.children, context, transformNode, PARSER_OUTPUT_SOURCE_PREDICATES);

  if (!flags.inHeadingTitle && isTreeToc(node)) {
    if (context.textExtractsMode) return [];
    const toc = renderTocFromSections(context);
    return toc ? [toc] : [cloneNode(node)];
  }
  if (!flags.inHeadingTitle && isTreeHeading(node)) {
    const section = context.sectionBySource.get(node);
    return section ? [renderHeadingFromSection(section, context, transformNode)] : [cloneNode(node)];
  }
  if (!flags.inHeadingTitle && isHeadingContent(node)) {
    return transformArticleFlowChildren(node.children, context, transformNode, PARSER_OUTPUT_SOURCE_PREDICATES);
  }
  if (!flags.inHeadingTitle && isTreeCategorySource(node)) return transformCategorySource(node, context);
  if (isTreeClearfix(node)) return transformTreeClearfix(node, context);
  if (isTheTreePreCodeBlock(node)) return transformTreePreCodeBlock(node, context, transformNode);
  if (isTreeTableWrapper(node)) return renderTableWrapper(node, context, transformNode, transformTableSingleParagraphContent);
  if (isTreeTable(node)) return [renderTableNode(node, context, transformNode, transformTableSingleParagraphContent)];
  if (isTreeParagraph(node)) return transformTreeParagraph(node, context, transformNode, PARSER_OUTPUT_SOURCE_PREDICATES);
  if (isTreeList(node)) return [transformTreeList(node, context, transformNode, PARSER_OUTPUT_SOURCE_PREDICATES)];
  if (isTreeIndent(node)) return transformTreeIndent(node, context, transformNode, PARSER_OUTPUT_SOURCE_PREDICATES);
  if (isTreeBlockquote(node)) return transformTreeBlockquote(node, context, transformNode, PARSER_OUTPUT_SOURCE_PREDICATES);
  if (isReferenceSup(node)) return [transformReferenceSup(node, context)];
  if (isReferenceList(node)) return [transformReferenceList(node, context, transformNode)];
  if (isExternalLink(node)) return [transformExternalLink(node, context, transformNode)];
  if (isInternalWikiLink(node)) return [transformInternalWikiLink(node, context, transformNode)];
  const out = cloneNode(node);
  out.children = transformChildren(node.children || [], context);
  return [out];
}

function makeArticleCompilerContext(ast, options = {}) {
  let sequence = 0;
  const sections = collectSectionModels(ast, collectElements);
  const minSectionLevel = sections.reduce((min, section) => Math.min(min, section.level), 2);
  const sectionBySource = new WeakMap();
  sections.forEach((section) => sectionBySource.set(section.source, section));
  const languageContext = mediaWikiLanguageContext(options.lang || 'ko', { config: options.config || {}, messages: options.messages || null });
  const context = {
    kind: 'ArticleIR',
    lang: options.lang || 'ko',
    htmlLang: languageContext.htmlCode,
    dir: languageContext.dir,
    messages: languageContext.messages,
    sections,
    minSectionLevel,
    sectionBySource,
    hasStructuredCategories: !!options.hasStructuredCategories,
    textExtractsMode: !!options.textExtractsMode,
    referenceNotes: [],
    referenceNoteByKey: new Map(),
    referenceInlineBySource: new WeakMap(),
    referenceListItemBySource: new WeakMap(),
    nextId(prefix) {
      sequence += 1;
      return `${prefix}-${sequence}`;
    }
  };
  collectReferenceModels(ast, context);
  return context;
}

function compileArticleAst(ast, options = {}) {
  const context = makeArticleCompilerContext(ast, options);
  const body = unwrapParserOutputRootWrapper(transformArticleFlowChildren(ast.children, context, transformNode, PARSER_OUTPUT_SOURCE_PREDICATES));
  return {
    kind: 'ArticleIR',
    context,
    body
  };
}

export function projectParserOutputHtml(html, options = {}) {
  if (typeof html !== 'string' || html.length === 0) return html;
  if (!/[<][A-Za-z!/?]/.test(html)) return html;
  const ast = parseHtmlFragment(html);
  const article = compileArticleAst(ast, options);
  return serializeHtml(emitArticleRoot(article, options));
}


// Backward-compatible export for extension bridges that consume the same canonical projector.
export const transformHtmlFragment = projectParserOutputHtml;

export function applyLegacyParserOutputTransformToStore(storeState) {
  return applyStoreParserOutputTransform(storeState, projectParserOutputHtml);
}

export function subscribeLegacyParserOutputTransformToStore(store, storeState, onResult) {
  return subscribeStoreParserOutputTransform(store, storeState, onResult, projectParserOutputHtml);
}
