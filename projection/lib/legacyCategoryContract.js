/*
 * the tree WikiContent categories -> Vector category contract.
 *
 * This is the single structured category source contract used by both the
 * Vector category slot and the parser-output transform.  If this source does
 * not provide valid structured category objects, Vector must not claim
 * ownership of category rendering; the parser-output bridge may then convert
 * the source category DOM instead of deleting it as a duplicate.
 */

export const LEGACY_CATEGORY_SOURCE_PATH = '$store.state.viewData.categories';

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function viewDataFromContext(context = {}) {
  return context.viewData || {};
}

function viewDataFromStoreState(storeState = {}) {
  return storeState?.viewData || {};
}

export function readLegacyStructuredCategorySourceFromViewData(viewData = {}) {
  return ensureArray(viewData.categories);
}

export function readLegacyStructuredCategorySource(context = {}) {
  return readLegacyStructuredCategorySourceFromViewData(viewDataFromContext(context));
}

export function readLegacyStructuredCategorySourceFromStore(storeState = {}) {
  return readLegacyStructuredCategorySourceFromViewData(viewDataFromStoreState(storeState));
}

export function normalizeLegacyStructuredCategory(category = {}) {
  if (!category || typeof category !== 'object') return null;
  const document = category.document && typeof category.document === 'object'
    ? category.document
    : category;

  if (!document || typeof document !== 'object') return null;
  const title = typeof document.title === 'string' ? document.title.trim() : '';
  if (!title) return null;

  const namespace = typeof document.namespace === 'string' && document.namespace.trim()
    ? document.namespace.trim()
    : '분류';

  return {
    document: {
      ...document,
      namespace,
      title
    },
    notExist: !!category.notExist,
    blur: !!category.blur
  };
}

export function getLegacyStructuredCategories(context = {}) {
  return readLegacyStructuredCategorySource(context)
    .map((category) => normalizeLegacyStructuredCategory(category))
    .filter(Boolean);
}

export function hasLegacyStructuredCategoriesFromStore(storeState = {}) {
  return readLegacyStructuredCategorySourceFromStore(storeState)
    .some((category) => !!normalizeLegacyStructuredCategory(category));
}
