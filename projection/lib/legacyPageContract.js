/*
 * the tree page state -> MediaWiki/Vector legacy projection contract.
 *
 * This module is the only boundary allowed to read the tree contentName or
 * viewName. Exact contentName contracts take precedence over the compatibility
 * viewName map and emit one immutable surface tree.
 */
import {
  SURFACE_TYPE_INTERFACE,
  SURFACE_TYPE_PARSER_OUTPUT,
  VECTOR_CONTENT_CONTEXT,
  getLegacyViewSurfaceMapping
} from './legacySpecialPageContract.js';

export const NAMESPACE_KIND_SUBJECT = 'subject';
export const NAMESPACE_KIND_TALK = 'talk';
export const ACTION_KIND_VIEW = 'view';

const PAGE_STATE_NORMAL = 'normal';
const PAGE_STATE_NOT_FOUND = 'notfound';
const PAGE_STATE_ERROR = 'error';

function getContractPageData(context = {}) {
  return context.pageData || context.page?.data || {};
}

function getContractViewName(context = {}) {
  return context.page?.viewName || context.viewData?.viewName || '';
}

function getContractContentName(context = {}) {
  return context.page?.contentName || context.viewData?.contentName || '';
}

function getContractDocument(context = {}) {
  return getContractPageData(context).document || null;
}

function normalizeNamespaceId(namespace) {
  if (typeof namespace === 'number' && Number.isFinite(namespace)) return namespace;
  if (typeof namespace === 'string' && namespace.trim() !== '') {
    const numeric = Number(namespace);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

function namespaceIdFromPageData(pageData = {}, document = null) {
  const rawCandidates = [
    document?.namespaceId,
    document?.namespace_id,
    document?.ns,
    document?.namespace,
    pageData.namespaceId,
    pageData.namespace_id,
    pageData.ns,
    pageData.namespace
  ];

  for (const candidate of rawCandidates) {
    const namespaceId = normalizeNamespaceId(candidate);
    if (namespaceId !== null) return namespaceId;
  }

  return 0;
}

function namespaceKindFromMapping(viewMapping) {
  const mappedKind = viewMapping.target?.namespaceKind;
  if (mappedKind === NAMESPACE_KIND_TALK) return NAMESPACE_KIND_TALK;
  return NAMESPACE_KIND_SUBJECT;
}

function makeRevisionSubtitle(pageData = {}, suffix = '') {
  return pageData.rev ? `(r${pageData.rev} ${suffix})` : '';
}

function makeEditSubtitle(pageData = {}) {
  const body = pageData.body || {};
  if (body.section) return `(r${body.baserev} 문단 편집)`;
  if (body.baserev === '0') return '(새 문서 생성)';
  if (body.baserev) return `(r${body.baserev} 편집)`;
  return '';
}

function makeDefaultSubtitleHtml(pageData = {}, viewMapping = {}) {
  if (pageData.htmlSubtitle) return pageData.htmlSubtitle;
  if (pageData.subtitle) return pageData.subtitle;

  switch (viewMapping.transform?.subtitleKind) {
    case 'edit-request': return '(편집 요청)';
    case 'edit': return makeEditSubtitle(pageData);
    case 'history': return '(역사)';
    case 'backlink': return '(역링크)';
    case 'move': return '(이동)';
    case 'delete': return '(삭제)';
    case 'acl': return '(ACL)';
    case 'thread': return '(토론)';
    case 'thread-list': return '(토론 목록)';
    case 'thread-list-closed': return '(닫힌 토론)';
    case 'edit-request-closed': return '(닫힌 편집 요청)';
    case 'diff': return '(비교)';
    case 'revert': return pageData.rev ? `(r${pageData.rev}로 되돌리기)` : '';
    case 'raw': return makeRevisionSubtitle(pageData, 'RAW');
    case 'blame': return makeRevisionSubtitle(pageData, 'Blame');
    case 'revision-view': return makeRevisionSubtitle(pageData, '판');
    default: return '';
  }
}

function normalizePageState(viewMapping = {}) {
  const pageState = viewMapping.transform?.pageState;
  if (pageState === PAGE_STATE_ERROR) return PAGE_STATE_ERROR;
  if (pageState === PAGE_STATE_NOT_FOUND) return PAGE_STATE_NOT_FOUND;
  return PAGE_STATE_NORMAL;
}

function makeProjectionContract(viewMapping = {}) {
  const root = viewMapping.target?.rootSurface || Object.freeze({
    id: 'unknown-root',
    type: SURFACE_TYPE_INTERFACE,
    role: 'page-interface',
    upstreamSurface: 'unknown-local-interface',
    lifecycle: 'initial'
  });
  const children = Object.freeze([...(viewMapping.target?.nestedSurfaces || [])]);
  return Object.freeze({
    context: viewMapping.target?.context || VECTOR_CONTENT_CONTEXT,
    root,
    children,
    interfaceRoles: Object.freeze([...(viewMapping.target?.interfaceRoles || [])]),
    skinModuleFeatures: Object.freeze([...(viewMapping.target?.skinModuleFeatures || [])]),
    upstreamPrimitives: Object.freeze([...(viewMapping.target?.upstreamPrimitives || [])])
  });
}

export function makeLegacyPageContract(context = {}) {
  const viewName = getContractViewName(context);
  const contentName = getContractContentName(context);
  const pageData = getContractPageData(context);
  const document = getContractDocument(context);
  const viewMapping = getLegacyViewSurfaceMapping(viewName, contentName);
  const pageState = normalizePageState(viewMapping);
  const projection = makeProjectionContract(viewMapping);
  const rootSurface = projection.root;
  const actionKind = viewMapping.target?.actionKind || ACTION_KIND_VIEW;
  const namespaceId = namespaceIdFromPageData(pageData, document);
  const namespaceKind = namespaceKindFromMapping(viewMapping);
  const hasDocument = !!document;
  const isDocumentPage = hasDocument && pageState !== PAGE_STATE_ERROR && pageState !== PAGE_STATE_NOT_FOUND;
  const isParserOutput = rootSurface.type === SURFACE_TYPE_PARSER_OUTPUT;
  const defaultSubtitleHtml = makeDefaultSubtitleHtml(pageData, viewMapping);

  return Object.freeze({
    hasDocument,
    isDocumentPage,
    isArticle: isDocumentPage && rootSurface.role === 'article-body',
    canUseDocumentTitle: hasDocument && pageState !== PAGE_STATE_ERROR,
    canRequestEdit: pageState !== PAGE_STATE_NOT_FOUND,
    showLastModifiedFooter: isParserOutput && !!pageData.date,
    namespaceId,
    namespaceKind,
    actionKind,
    selectedActionItemId: viewMapping.target?.selectedActionItemId || null,
    hostViewName: viewName,
    hostContentName: contentName,
    featureMappingId: viewMapping.id,
    featureEquivalence: viewMapping.equivalence,
    featureLoss: viewMapping.loss,
    projection,
    isParserOutput,
    isInterface: rootSurface.type === SURFACE_TYPE_INTERFACE,
    interfaceArchetype: rootSurface.archetype || null,
    defaultSubtitleHtml
  });
}

export function getLegacyPageContract(context = {}) {
  return context.projectionPageContract || makeLegacyPageContract(context);
}
