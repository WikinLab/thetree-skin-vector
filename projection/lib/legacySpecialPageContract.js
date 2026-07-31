/*
 * Locked the tree host views -> MediaWiki/Vector legacy projection contracts.
 *
 * This is the only data table allowed to contain the tree contentName/viewName
 * values or host DOM selectors. Generated upstream CSS and Vector component
 * ports consume only the emitted semantic context, surface and role markers.
 * No row contains visual values.
 */

import { FEATURE_EQUIVALENCE } from '../../lib/legacyHostAdapterPolicy.js';

export const VECTOR_CONTENT_CONTEXT = 'content-common';
export const SURFACE_TYPE_PARSER_OUTPUT = 'parser-output';
export const SURFACE_TYPE_INTERFACE = 'interface';
export const SURFACE_LIFECYCLE_INITIAL = 'initial';
export const SURFACE_LIFECYCLE_DYNAMIC = 'dynamic';

export const ARTICLE_SURFACE_CLASS = 'wiki-article';
export const HOST_CONTENT_ATTRIBUTE = 'data-tt-host-content';
export const VECTOR_CONTEXT_ATTRIBUTE = 'data-tt-vector-context';
export const VECTOR_SURFACE_ATTRIBUTE = 'data-tt-vector-surface';
export const VECTOR_SURFACE_ROLE_ATTRIBUTE = 'data-tt-vector-surface-role';
export const INTERFACE_SURFACE_ATTRIBUTE = 'data-tt-vector-interface-surface';
export const INTERFACE_ROLE_ATTRIBUTE = 'data-tt-vector-interface-role';
export const INTERFACE_PRIMITIVE_ATTRIBUTE = 'data-tt-vector-upstream-primitive';
export const INTERFACE_CONTRACT_ATTRIBUTE = 'data-tt-vector-interface-contract';

const CARDINALITY_ONE = 'one';
const CARDINALITY_MANY = 'many';
const CARDINALITY_OPTIONAL_ONE = 'optional-one';
const CARDINALITY_OPTIONAL_MANY = 'optional-many';

const KNOWN_SKIN_MODULE_FEATURES = Object.freeze(new Set([
  'accessibility',
  'normalize',
  'logo',
  'content-media',
  'content-media-legacy',
  'content-media-dark',
  'content-links',
  'content-links-external',
  'content-body',
  'content-tables',
  'interface-category',
  'interface-core',
  'interface-edit-section-links',
  'interface-indicators',
  'interface-site-notice',
  'interface-subtitle',
  'interface-message-box',
  'interface-user-message',
  'elements',
  'i18n-ordered-lists',
  'i18n-all-lists-margins',
  'i18n-headings',
  'toc'
]));

function freezeSurface(surface = {}) {
  return Object.freeze({ ...surface });
}

function freezeRole(role = {}) {
  return Object.freeze({ ...role });
}

function role(id, selector, upstreamPrimitive, cardinality = CARDINALITY_OPTIONAL_ONE) {
  return freezeRole({ id, selector, upstreamPrimitive, cardinality });
}

const ROLE_SETS = Object.freeze({
  none: Object.freeze([]),
  form: Object.freeze([
    role('form', 'form', 'html-form', CARDINALITY_OPTIONAL_MANY)
  ]),
  'confirmation-form': Object.freeze([
    role('confirmation-form', 'form', 'confirmation-form', CARDINALITY_OPTIONAL_ONE),
    role('message', '.alert', 'message-box', CARDINALITY_OPTIONAL_MANY)
  ]),
  'authentication-form': Object.freeze([
    role('authentication-form', 'form', 'authentication-form', CARDINALITY_OPTIONAL_ONE),
    role('message', '.alert', 'message-box', CARDINALITY_OPTIONAL_MANY)
  ]),
  'tabbed-editor': Object.freeze([
    role('editor-form', 'form', 'edit-form', CARDINALITY_ONE),
    role('tab-list', 'form > ul', 'tab-list', CARDINALITY_ONE),
    role('tab-item', 'form > ul > li', 'tab-item', CARDINALITY_MANY),
    role('tab-panels', 'form > .tabs', 'tab-panels', CARDINALITY_ONE),
    role('edit-area', 'form textarea[name="text"]', 'edit-area', CARDINALITY_OPTIONAL_ONE),
  ]),
  'filterable-list': Object.freeze([
    role('filter-form', 'form', 'filter-form', CARDINALITY_OPTIONAL_ONE),
    role('filter-tabs', '.link-tab', 'filter-tabs', CARDINALITY_OPTIONAL_ONE),
    role('result-list', '.list-table', 'result-list', CARDINALITY_OPTIONAL_ONE),
    role('result-header', '.list-table > .table-heading', 'result-header', CARDINALITY_OPTIONAL_ONE),
    role('result-row', '.list-table > .table-row:not(.table-heading)', 'result-row', CARDINALITY_OPTIONAL_MANY)
  ]),
  'data-table': Object.freeze([
    role('table', 'table, .list-table', 'data-table', CARDINALITY_OPTIONAL_MANY),
    role('table-row', 'tbody > tr, .list-table > .table-row', 'data-table-row', CARDINALITY_OPTIONAL_MANY),
    role('pager', 'nav, .pagination', 'pager', CARDINALITY_OPTIONAL_MANY)
  ]),
  'search-results': Object.freeze([
    role('search-form', 'form', 'search-form', CARDINALITY_ONE),
    role('result-list', 'section', 'search-results', CARDINALITY_ONE),
    role('result-item', 'section > div', 'search-result', CARDINALITY_OPTIONAL_MANY),
    role('pager', 'section > nav', 'pager', CARDINALITY_OPTIONAL_ONE)
  ]),
  'upload-form': Object.freeze([
    role('upload-form', 'form', 'upload-form', CARDINALITY_ONE),
    role('message', '.alert', 'message-box', CARDINALITY_OPTIONAL_MANY)
  ]),
  'discussion-list': Object.freeze([
    role('filter-tabs', '.link-tab', 'filter-tabs', CARDINALITY_OPTIONAL_ONE),
    role('discussion-list', '.list-table, .thread-list', 'discussion-list', CARDINALITY_OPTIONAL_ONE),
    role('discussion-item', '.list-table > .table-row, .thread-list > *', 'discussion-item', CARDINALITY_OPTIONAL_MANY)
  ]),
  'settings-form': Object.freeze([
    role('settings-form', 'form', 'settings-form', CARDINALITY_OPTIONAL_MANY),
    role('field-group', 'fieldset, .setting-item', 'field-group', CARDINALITY_OPTIONAL_MANY)
  ]),
  'mixed-content': Object.freeze([
    role('interface-form', 'form', 'html-form', CARDINALITY_OPTIONAL_MANY),
    role('interface-table', 'table, .list-table', 'data-table', CARDINALITY_OPTIONAL_MANY),
    role('interface-pager', 'nav, .pagination', 'pager', CARDINALITY_OPTIONAL_MANY)
  ])
});

function parserOutputSurface({
  id,
  role: surfaceRole,
  upstreamSurface = 'parser-output',
  surfaceSelector = null,
  hostSelector = null,
  lifecycle = SURFACE_LIFECYCLE_INITIAL
}) {
  return freezeSurface({
    id,
    type: SURFACE_TYPE_PARSER_OUTPUT,
    role: surfaceRole,
    upstreamSurface,
    surfaceSelector,
    hostSelector,
    lifecycle
  });
}

function interfaceSurface({ id, role: surfaceRole = 'page-interface', upstreamSurface, archetype = null }) {
  return freezeSurface({
    id,
    type: SURFACE_TYPE_INTERFACE,
    role: surfaceRole,
    upstreamSurface,
    archetype,
    lifecycle: SURFACE_LIFECYCLE_INITIAL
  });
}

export const ARTICLE_PARSER_OUTPUT_SURFACE = parserOutputSurface({
  id: 'article-body',
  role: 'article-body',
  upstreamSurface: 'article'
});

export const EDIT_PREVIEW_PARSER_OUTPUT_SURFACE = parserOutputSurface({
  id: 'edit-preview',
  role: 'preview',
  surfaceSelector: '.tabs > .preview',
  hostSelector: '.tabs > .preview > .wiki-content',
  lifecycle: SURFACE_LIFECYCLE_DYNAMIC
});

export const EDIT_REQUEST_PREVIEW_PARSER_OUTPUT_SURFACE = parserOutputSurface({
  id: 'edit-request-preview',
  role: 'preview',
  surfaceSelector: '.tabs > .preview-tab',
  hostSelector: '.tabs > .preview-tab > .wiki-content',
  lifecycle: SURFACE_LIFECYCLE_DYNAMIC
});

function freezeTarget(target = {}) {
  return Object.freeze({
    ...target,
    rootSurface: freezeSurface(target.rootSurface),
    nestedSurfaces: Object.freeze((target.nestedSurfaces || []).map(freezeSurface)),
    interfaceRoles: Object.freeze((target.interfaceRoles || []).map(freezeRole)),
    skinModuleFeatures: Object.freeze([...(target.skinModuleFeatures || [])]),
    upstreamPrimitives: Object.freeze([...(target.upstreamPrimitives || [])])
  });
}

function freezeSurfaceRow(row) {
  return Object.freeze({
    ...row,
    source: Object.freeze({ ...(row.source || {}) }),
    target: freezeTarget(row.target || {}),
    transform: Object.freeze({ ...(row.transform || {}) }),
    loss: Object.freeze([...(row.loss || [])])
  });
}

function surfaceRow(source, target, transform = {}, equivalence = FEATURE_EQUIVALENCE.ANALOG, loss = []) {
  const sourceId = source.contentName || `view:${source.viewName}`;
  const upstreamFeature = target.rootSurface?.upstreamSurface || 'unknown-local-interface';
  return freezeSurfaceRow({
    id: `host.${sourceId}`,
    source: {
      system: 'thetree',
      feature: 'host-view',
      ...source
    },
    target: {
      system: 'mediawiki-vector-legacy',
      feature: upstreamFeature,
      context: VECTOR_CONTENT_CONTEXT,
      nestedSurfaces: [],
      interfaceRoles: [],
      skinModuleFeatures: ['interface-core'],
      upstreamPrimitives: [],
      ...target
    },
    transform: { kind: 'view-surface-tree', ...transform },
    equivalence,
    loss
  });
}

function articleTarget(overrides = {}) {
  return {
    rootSurface: ARTICLE_PARSER_OUTPUT_SURFACE,
    skinModuleFeatures: ['content-body', 'content-links', 'content-media', 'content-tables', 'toc', 'interface-edit-section-links'],
    upstreamPrimitives: ['parser-output'],
    actionKind: 'view',
    selectedActionItemId: 'ca-view',
    ...overrides
  };
}

function interfaceTarget(upstreamSurface, { archetype = null, roles = null, ...overrides } = {}) {
  return {
    rootSurface: interfaceSurface({ id: `${upstreamSurface}-root`, upstreamSurface, archetype }),
    interfaceRoles: roles || ROLE_SETS[archetype] || ROLE_SETS.none,
    upstreamPrimitives: archetype ? [archetype] : [],
    actionKind: 'view',
    selectedActionItemId: 'ca-view',
    ...overrides
  };
}

function contentRow(contentName, viewName, target, transform = {}, equivalence = FEATURE_EQUIVALENCE.ANALOG, loss = []) {
  return surfaceRow({
    contentName,
    viewName,
    frontendPath: `src/views/contents/${contentName}.vue`
  }, target, transform, equivalence, loss);
}

const localOnly = (message) => [message];

export const CONTENT_SURFACE_MAP = Object.freeze({
  wiki: contentRow('wiki', 'wiki', articleTarget(), { subtitleKind: 'revision-view' }),
  notfound: contentRow('notfound', 'notfound', interfaceTarget('missing-title'), { pageState: 'notfound' }),
  search: contentRow('search', 'search', interfaceTarget('special-search', { archetype: 'search-results' })),
  thread: contentRow('thread', 'thread', interfaceTarget('talk-page-analog', { archetype: 'mixed-content', namespaceKind: 'talk' }), { subtitleKind: 'thread' }, FEATURE_EQUIVALENCE.ANALOG, localOnly('TheTree thread is not a MediaWiki Talk namespace page.')),

  'document/edit': contentRow('document/edit', 'edit', interfaceTarget('action-edit', {
    archetype: 'tabbed-editor',
    roles: Object.freeze([
      ...ROLE_SETS['tabbed-editor'],
      role('preview-panel', 'form > .tabs > .preview', 'preview-panel', CARDINALITY_OPTIONAL_ONE)
    ]),
    actionKind: 'edit',
    selectedActionItemId: 'ca-edit',
    nestedSurfaces: [EDIT_PREVIEW_PARSER_OUTPUT_SURFACE]
  }), { subtitleKind: 'edit' }),
  'document/editRequest': contentRow('document/editRequest', 'edit_request', interfaceTarget('edit-request', {
    archetype: 'tabbed-editor',
    roles: Object.freeze([
      ...ROLE_SETS['tabbed-editor'],
      role('preview-panel', 'form > .tabs > .preview-tab', 'preview-panel', CARDINALITY_OPTIONAL_ONE)
    ]),
    actionKind: 'edit',
    selectedActionItemId: 'ca-edit',
    nestedSurfaces: [EDIT_REQUEST_PREVIEW_PARSER_OUTPUT_SURFACE]
  }), { subtitleKind: 'edit-request' }, FEATURE_EQUIVALENCE.LOCAL_ONLY, localOnly('MediaWiki core has no TheTree-style edit-request workflow.')),
  'document/closedEditRequest': contentRow('document/closedEditRequest', 'edit_request_close', interfaceTarget('edit-request-close', { archetype: 'discussion-list', actionKind: 'edit', selectedActionItemId: 'ca-edit' }), { subtitleKind: 'edit-request-closed' }, FEATURE_EQUIVALENCE.LOCAL_ONLY, localOnly('MediaWiki core has no TheTree-style edit-request workflow.')),
  'document/history': contentRow('document/history', 'history', interfaceTarget('action-history', { archetype: 'filterable-list', actionKind: 'history', selectedActionItemId: 'ca-history' }), { subtitleKind: 'history' }),
  'document/diff': contentRow('document/diff', 'diff', interfaceTarget('diff', { archetype: 'mixed-content', actionKind: 'history', selectedActionItemId: 'ca-history' }), { subtitleKind: 'diff' }),
  'document/revert': contentRow('document/revert', 'revert', interfaceTarget('action-revert', { archetype: 'confirmation-form', actionKind: 'history', selectedActionItemId: 'ca-history' }), { subtitleKind: 'revert' }),
  'document/backlink': contentRow('document/backlink', 'backlink', interfaceTarget('special-whatlinkshere', { archetype: 'filterable-list', actionKind: 'backlink', selectedActionItemId: 'ca-backlink' }), { subtitleKind: 'backlink' }),
  'document/acl': contentRow('document/acl', 'acl', interfaceTarget('local-acl', { archetype: 'mixed-content', actionKind: 'acl', selectedActionItemId: 'ca-acl' }), { subtitleKind: 'acl' }, FEATURE_EQUIVALENCE.LOCAL_ONLY, localOnly('No MediaWiki core surface equivalent exists for TheTree ACL.')),
  'document/raw': contentRow('document/raw', 'raw', interfaceTarget('action-raw', { actionKind: 'raw', selectedActionItemId: 'ca-raw' }), { subtitleKind: 'raw' }),
  'document/blame': contentRow('document/blame', 'blame', interfaceTarget('local-blame', { archetype: 'data-table', actionKind: 'blame', selectedActionItemId: 'ca-blame' }), { subtitleKind: 'blame' }, FEATURE_EQUIVALENCE.LOCAL_ONLY, localOnly('No MediaWiki core surface equivalent exists for TheTree blame.')),
  'document/move': contentRow('document/move', 'move', interfaceTarget('action-move', { archetype: 'confirmation-form', actionKind: 'move', selectedActionItemId: 'ca-move' }), { subtitleKind: 'move' }),
  'document/delete': contentRow('document/delete', 'delete', interfaceTarget('action-delete', { archetype: 'confirmation-form', actionKind: 'delete', selectedActionItemId: 'ca-delete' }), { subtitleKind: 'delete' }),
  'document/discuss': contentRow('document/discuss', 'thread_list', interfaceTarget('talk-page-list-analog', { archetype: 'discussion-list', namespaceKind: 'talk' }), { subtitleKind: 'thread-list' }, FEATURE_EQUIVALENCE.ANALOG, localOnly('MediaWiki has no core equivalent for TheTree thread list.')),
  'document/closedDiscuss': contentRow('document/closedDiscuss', 'thread_list_close', interfaceTarget('talk-page-list-analog', { archetype: 'discussion-list', namespaceKind: 'talk' }), { subtitleKind: 'thread-list-closed' }, FEATURE_EQUIVALENCE.LOCAL_ONLY, localOnly('MediaWiki has no core equivalent for TheTree closed thread list.')),

  'special/recentChanges': contentRow('special/recentChanges', 'recent_changes', interfaceTarget('special-recentchanges', { archetype: 'filterable-list' })),
  'special/recentDiscuss': contentRow('special/recentDiscuss', 'recent_discuss', interfaceTarget('discussion-list-analog', { archetype: 'discussion-list' }), {}, FEATURE_EQUIVALENCE.LOCAL_ONLY, localOnly('MediaWiki core has no combined TheTree recent discussion/edit-request surface.')),
  'special/blockHistory': contentRow('special/blockHistory', 'block_history', interfaceTarget('special-log-analog', { archetype: 'filterable-list' })),
  'special/randomPage': contentRow('special/randomPage', 'random_page', interfaceTarget('special-random', { archetype: 'form' })),
  'special/upload': contentRow('special/upload', 'upload', interfaceTarget('special-upload', { archetype: 'upload-form' })),
  'special/license': contentRow('special/license', 'license', interfaceTarget('special-version-analog', { archetype: 'mixed-content' })),
  'special/terms': contentRow('special/terms', 'terms', interfaceTarget('policy-page-analog', { archetype: 'mixed-content' }), {}, FEATURE_EQUIVALENCE.LOCAL_ONLY, localOnly('MediaWiki core does not define TheTree terms workflow.')),

  'docList/UncategorizedPages': contentRow('docList/UncategorizedPages', 'uncategorized_pages', interfaceTarget('special-uncategorizedpages', { archetype: 'filterable-list' })),
  'docList/OldPages': contentRow('docList/OldPages', 'old_pages', interfaceTarget('special-ancientpages', { archetype: 'filterable-list' })),
  'docList/ContentLength': contentRow('docList/ContentLength', 'content_length', interfaceTarget('special-longpages-shortpages', { archetype: 'filterable-list' })),
  'docList/NeededPages': contentRow('docList/NeededPages', 'needed_pages', interfaceTarget('special-wantedpages', { archetype: 'filterable-list' })),
  'docList/OrphanedPages': contentRow('docList/OrphanedPages', 'orphaned_pages', interfaceTarget('special-lonelypages', { archetype: 'filterable-list' })),
  'docList/OrphanedCategories': contentRow('docList/OrphanedCategories', 'orphaned_categories', interfaceTarget('special-uncategorizedcategories-analog', { archetype: 'filterable-list' })),

  'member/login': contentRow('member/login', 'login', interfaceTarget('special-userlogin', { archetype: 'authentication-form' })),
  'member/signup': contentRow('member/signup', 'signup', interfaceTarget('special-createaccount', { archetype: 'authentication-form' })),
  'member/signup_email_sent': contentRow('member/signup_email_sent', 'signup', interfaceTarget('special-createaccount', { archetype: 'authentication-form' })),
  'member/signup_verify': contentRow('member/signup_verify', 'signup_verify', interfaceTarget('authentication-verification', { archetype: 'authentication-form' }), {}, FEATURE_EQUIVALENCE.LOCAL_ONLY, localOnly('MediaWiki core has no TheTree mobile signup verification surface.')),
  'member/signup_verify_code': contentRow('member/signup_verify_code', 'signup_verify_code', interfaceTarget('authentication-verification', { archetype: 'authentication-form' }), {}, FEATURE_EQUIVALENCE.LOCAL_ONLY, localOnly('MediaWiki core has no TheTree mobile signup verification code surface.')),
  'member/signup_final': contentRow('member/signup_final', 'signup_final', interfaceTarget('special-createaccount', { archetype: 'authentication-form' })),
  'member/pin_verification': contentRow('member/pin_verification', 'pin_verification', interfaceTarget('authentication-verification', { archetype: 'authentication-form' }), {}, FEATURE_EQUIVALENCE.LOCAL_ONLY, localOnly('MediaWiki core has no TheTree PIN verification surface.')),
  'member/mypage': contentRow('member/mypage', 'mypage', interfaceTarget('special-preferences-analog', { archetype: 'settings-form' })),
  'member/change_password': contentRow('member/change_password', 'change_password', interfaceTarget('special-changecredentials-analog', { archetype: 'authentication-form' })),
  'member/change_name': contentRow('member/change_name', 'change_name', interfaceTarget('special-renameuser-analog', { archetype: 'authentication-form' })),
  'member/change_email': contentRow('member/change_email', 'change_email', interfaceTarget('special-changeemail-analog', { archetype: 'authentication-form' })),
  'member/activate_otp': contentRow('member/activate_otp', 'activate_otp', interfaceTarget('special-oathmanage-analog', { archetype: 'authentication-form' })),
  'member/deactivate_otp': contentRow('member/deactivate_otp', 'deactivate_otp', interfaceTarget('special-oathmanage-analog', { archetype: 'authentication-form' })),
  'member/recover_password': contentRow('member/recover_password', 'recover_password', interfaceTarget('special-passwordreset', { archetype: 'authentication-form' })),
  'member/recover_password_email_sent': contentRow('member/recover_password_email_sent', 'recover_password', interfaceTarget('special-passwordreset', { archetype: 'authentication-form' })),
  'member/recover_password_final': contentRow('member/recover_password_final', 'recover_password', interfaceTarget('special-passwordreset', { archetype: 'authentication-form' })),
  'member/notifications': contentRow('member/notifications', 'notifications', interfaceTarget('special-notifications-analog', { archetype: 'filterable-list' })),
  'member/starred_documents': contentRow('member/starred_documents', 'starred_documents', interfaceTarget('special-watchlist-analog', { archetype: 'filterable-list' })),
  'member/withdraw': contentRow('member/withdraw', 'withdraw', interfaceTarget('special-changecredentials-analog', { archetype: 'confirmation-form' })),

  'userContribution/document': contentRow('userContribution/document', 'contribution', interfaceTarget('special-contributions', { archetype: 'filterable-list' })),
  'userContribution/discuss': contentRow('userContribution/discuss', 'contribution_discuss', interfaceTarget('special-contributions-talk-analog', { archetype: 'discussion-list' })),
  'userContribution/editRequest': contentRow('userContribution/editRequest', 'contribution_edit_request', interfaceTarget('special-contributions-editrequest-analog', { archetype: 'filterable-list' }), {}, FEATURE_EQUIVALENCE.LOCAL_ONLY, localOnly('MediaWiki core has no TheTree edit-request contribution stream.')),

  'admin/config': contentRow('admin/config', 'Config', interfaceTarget('special-configure-analog', { archetype: 'settings-form' }), {}, FEATURE_EQUIVALENCE.LOCAL_ONLY, localOnly('MediaWiki core has no TheTree engine configuration surface.')),
  'admin/developer': contentRow('admin/developer', 'developer', interfaceTarget('special-version-maintenance-analog', { archetype: 'settings-form' }), {}, FEATURE_EQUIVALENCE.LOCAL_ONLY, localOnly('MediaWiki core has no TheTree developer console.')),
  'admin/initialSetup': contentRow('admin/initialSetup', 'initial_setup', interfaceTarget('installer-analog', { archetype: 'settings-form' }), {}, FEATURE_EQUIVALENCE.LOCAL_ONLY, localOnly('MediaWiki installer is not a normal Vector special page.')),
  'admin/auditLog': contentRow('admin/auditLog', 'audit_log', interfaceTarget('special-log-analog', { archetype: 'filterable-list' })),
  'admin/manageAccount': contentRow('admin/manageAccount', 'manage_account', interfaceTarget('special-userrights-analog', { archetype: 'settings-form' })),
  'admin/grant': contentRow('admin/grant', 'grant', interfaceTarget('special-userrights-analog', { archetype: 'settings-form' })),
  'admin/batch_revert': contentRow('admin/batch_revert', 'batch_revert', interfaceTarget('special-nuke-analog', { archetype: 'confirmation-form' }), {}, FEATURE_EQUIVALENCE.LOCAL_ONLY, localOnly('MediaWiki core has no identical TheTree batch-revert workflow.')),
  'admin/login_history': contentRow('admin/login_history', 'login_history', interfaceTarget('special-log-analog', { archetype: 'filterable-list' })),
  'admin/login_history_result': contentRow('admin/login_history_result', 'login_history', interfaceTarget('special-log-analog', { archetype: 'filterable-list' })),
  'admin/aclgroup': contentRow('admin/aclgroup', 'aclgroup', interfaceTarget('local-acl-group-list', { archetype: 'filterable-list' }), {}, FEATURE_EQUIVALENCE.LOCAL_ONLY, localOnly('MediaWiki core has no TheTree ACL group surface.')),
  'admin/aclgroupManage': contentRow('admin/aclgroupManage', 'aclgroup_manage', interfaceTarget('local-acl-group-editor', { archetype: 'settings-form' }), {}, FEATURE_EQUIVALENCE.LOCAL_ONLY, localOnly('MediaWiki core has no TheTree ACL group editor.'))
});

export const VIEW_SURFACE_MAP = Object.freeze({
  wiki: CONTENT_SURFACE_MAP.wiki,
  edit: CONTENT_SURFACE_MAP['document/edit'],
  edit_request: CONTENT_SURFACE_MAP['document/editRequest'],
  edit_edit_request: CONTENT_SURFACE_MAP['document/edit'],
  edit_request_close: CONTENT_SURFACE_MAP['document/closedEditRequest'],
  history: CONTENT_SURFACE_MAP['document/history'],
  diff: CONTENT_SURFACE_MAP['document/diff'],
  revert: CONTENT_SURFACE_MAP['document/revert'],
  backlink: CONTENT_SURFACE_MAP['document/backlink'],
  acl: CONTENT_SURFACE_MAP['document/acl'],
  raw: CONTENT_SURFACE_MAP['document/raw'],
  blame: CONTENT_SURFACE_MAP['document/blame'],
  move: CONTENT_SURFACE_MAP['document/move'],
  delete: CONTENT_SURFACE_MAP['document/delete'],
  thread: CONTENT_SURFACE_MAP.thread,
  thread_list: CONTENT_SURFACE_MAP['document/discuss'],
  thread_list_close: CONTENT_SURFACE_MAP['document/closedDiscuss'],
  notfound: CONTENT_SURFACE_MAP.notfound,
  error: surfaceRow({ viewName: 'error' }, interfaceTarget('error'), { pageState: 'error' }),
  email_verified: surfaceRow({ viewName: 'email_verified' }, interfaceTarget('message-page', { archetype: 'mixed-content' })),
  __default: surfaceRow({ viewName: '__default' }, interfaceTarget('unknown-local-interface'), {}, FEATURE_EQUIVALENCE.UNSUPPORTED, localOnly('TheTree contentName/viewName has no declared MediaWiki/Vector feature mapping.'))
});

export const HOST_VIEW_INVENTORY = Object.freeze(Object.keys(CONTENT_SURFACE_MAP).sort());

export function getLegacyViewSurfaceMapping(viewName, contentName = '') {
  if (contentName && CONTENT_SURFACE_MAP[contentName]) return CONTENT_SURFACE_MAP[contentName];
  return VIEW_SURFACE_MAP[viewName] || VIEW_SURFACE_MAP.__default;
}

export function isLegacyInterfaceViewMapping(viewMapping = {}) {
  return viewMapping.target?.rootSurface?.type !== SURFACE_TYPE_PARSER_OUTPUT;
}

export function validateLegacyHostViewContract() {
  const errors = [];
  const ids = new Set();
  for (const [contentName, row] of Object.entries(CONTENT_SURFACE_MAP)) {
    if (row.source?.contentName !== contentName) errors.push(`${contentName}: source contentName mismatch`);
    if (row.source?.frontendPath !== `src/views/contents/${contentName}.vue`) {
      errors.push(`${contentName}: frontend path is not the deterministic contentName counterpart`);
    }
    if (ids.has(row.id)) errors.push(`${contentName}: duplicate mapping id ${row.id}`);
    ids.add(row.id);

    const rootSurface = row.target?.rootSurface;
    if (!rootSurface?.type) errors.push(`${contentName}: missing root surface`);
    if (![SURFACE_TYPE_PARSER_OUTPUT, SURFACE_TYPE_INTERFACE].includes(rootSurface?.type)) {
      errors.push(`${contentName}: unsupported root surface ${rootSurface?.type}`);
    }

    const roles = row.target?.interfaceRoles || [];
    if (rootSurface?.type === SURFACE_TYPE_PARSER_OUTPUT && roles.length) {
      errors.push(`${contentName}: parser-output root declares interface roles`);
    }
    if (rootSurface?.type === SURFACE_TYPE_INTERFACE && rootSurface.archetype && !roles.length) {
      errors.push(`${contentName}: interface archetype ${rootSurface.archetype} has no role contract`);
    }

    const roleIds = new Set();
    for (const item of roles) {
      if (!item.id || !item.selector || !item.upstreamPrimitive) errors.push(`${contentName}: incomplete interface role`);
      if (roleIds.has(item.id)) errors.push(`${contentName}: duplicate interface role ${item.id}`);
      roleIds.add(item.id);
      if (![CARDINALITY_ONE, CARDINALITY_MANY, CARDINALITY_OPTIONAL_ONE, CARDINALITY_OPTIONAL_MANY].includes(item.cardinality)) {
        errors.push(`${contentName}: unsupported role cardinality ${item.cardinality}`);
      }
      for (const forbidden of ['fontSize', 'lineHeight', 'margin', 'padding', 'color', 'display']) {
        if (Object.prototype.hasOwnProperty.call(item, forbidden)) errors.push(`${contentName}: visual value in host role ${item.id}`);
      }
    }

    for (const feature of row.target?.skinModuleFeatures || []) {
      if (!KNOWN_SKIN_MODULE_FEATURES.has(feature)) errors.push(`${contentName}: unknown SkinModule feature ${feature}`);
    }

    const nestedIds = new Set();
    for (const surface of row.target?.nestedSurfaces || []) {
      if (!surface.id || !surface.type || !surface.role) errors.push(`${contentName}: incomplete nested surface`);
      if (nestedIds.has(surface.id)) errors.push(`${contentName}: duplicate nested surface ${surface.id}`);
      nestedIds.add(surface.id);
      if (surface.type !== SURFACE_TYPE_PARSER_OUTPUT) errors.push(`${contentName}: unsupported nested surface ${surface.type}`);
      if (!surface.hostSelector) errors.push(`${contentName}: nested ParserOutput surface ${surface.id} has no exact host selector`);
      if (![SURFACE_LIFECYCLE_INITIAL, SURFACE_LIFECYCLE_DYNAMIC].includes(surface.lifecycle)) {
        errors.push(`${contentName}: unsupported nested surface lifecycle ${surface.lifecycle}`);
      }
    }
  }
  if (errors.length) throw new Error(`Invalid host view contract:\n- ${errors.join('\n- ')}`);
  return true;
}
