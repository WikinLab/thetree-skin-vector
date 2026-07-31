/*
 * the tree WikiContent category data -> MediaWiki Vector legacy catlinks data.
 *
 * Category ownership is gated by the page contract.  Only parser-output pages
 * may synthesize Vector catlinks, and the source is the single host category
 * field consumed by WikiContent: $store.state.viewData.categories.
 */

import { getLegacyPageContract } from '../legacyPageContract.js';
import { makeDocumentActionTarget } from '../../../lib/legacyTheTreeAdapter.js';
import {
  LEGACY_CATEGORY_SOURCE_PATH,
  getLegacyStructuredCategories
} from '../legacyCategoryContract.js';

const CATEGORY_SOURCE_ID = LEGACY_CATEGORY_SOURCE_PATH;

function getStructuredCategorySource(context = {}) {
  const pageContract = getLegacyPageContract(context);
  if (!pageContract.isParserOutput) {
    return {
      id: 'disabled:non-parser-output',
      categories: []
    };
  }

  return {
    id: CATEGORY_SOURCE_ID,
    categories: getLegacyStructuredCategories(context)
  };
}

function categoryText(document = {}) {
  return String(document.title || '')
    .replace(/^\s*(?:분류|category)\s*[:：]\s*/i, '')
    .trim();
}

function categoryKey(document = {}, text = '') {
  return `${document.namespace || '분류'}:${document.title || text}`.toLowerCase();
}

function makeCategoryItem(context, category, index) {
  const document = category.document;
  if (!document) return null;
  const text = categoryText(document);
  if (!text) return null;

  return {
    id: `cat-${index}-${categoryKey(document, text).replace(/[^a-z0-9가-힣_-]+/gi, '-')}`,
    text,
    document,
    to: makeDocumentActionTarget(context, document, 'w'),
    itemClasses: {
      'tt-vector-category-blur': !!category.blur
    },
    linkClasses: {
      new: !!category.notExist,
      'not-exist': !!category.notExist
    }
  };
}

export function makeLegacyCategoryData(context = {}) {
  const source = getStructuredCategorySource(context);
  const seen = new Set();
  const items = [];

  source.categories
    .map((category, index) => makeCategoryItem(context, category, index))
    .filter(Boolean)
    .forEach((item) => {
      const key = categoryKey(item.document, item.text);
      if (seen.has(key)) return;
      seen.add(key);
      items.push(item);
    });

  return {
    source: source.id,
    ownsVectorCategorySlot: items.length > 0,
    hasCategories: items.length > 0,
    items
  };
}
