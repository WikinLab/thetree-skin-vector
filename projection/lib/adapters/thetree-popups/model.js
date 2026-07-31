/* thetree page-data to Popups preview-model adapter. */
import { normalizeTextExtractsPlainText, textExtractsIntroPlainTextFromHtml } from '../../legacyTextExtractsBridge.js';
import { EXTRACT_LENGTH, previewTypes } from '../../ports/mediawiki-popups/src/constants.js';
import {
  createModel,
  formatPlainTextExtract,
  makeNullModel
} from '../../ports/mediawiki-popups/src/preview/model.js';
import { titleText } from './title.js';

function normalizeTheTreeExtractText(text, popupsData) {
  const normalized = normalizeTextExtractsPlainText(text);
  if (!normalized) return '';
  const maxLength = Number.isFinite(popupsData.extractLength) ? popupsData.extractLength : EXTRACT_LENGTH;
  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
}

export function isTheTreeInternalPageData(data) {
  return Boolean(
    data
      && typeof data === 'object'
      && !Array.isArray(data)
      && data.data
      && typeof data.data === 'object'
      && typeof data.data.contentHtml === 'string'
  );
}

function titleFromTheTreeInternalPageData(data, mwTitle) {
  if (data?.page && typeof data.page.title === 'string' && data.page.title) return data.page.title;
  return titleText(mwTitle);
}

export function modelFromTheTreeInternalPageData(data, mwTitle, popupsData, target = null) {
  if (!isTheTreeInternalPageData(data)) return makeNullModel(mwTitle, popupsData, target);

  const title = titleFromTheTreeInternalPageData(data, mwTitle);
  const plainTextExtract = normalizeTheTreeExtractText(textExtractsIntroPlainTextFromHtml(data.data.contentHtml), popupsData);
  const extract = formatPlainTextExtract(plainTextExtract, title);
  return createModel(
    title,
    target && typeof target.href === 'string' ? target.href : '',
    popupsData.languageCode,
    popupsData.languageDirection,
    extract,
    extract.length ? previewTypes.TYPE_PAGE : previewTypes.TYPE_GENERIC,
    undefined,
    undefined
  );
}
