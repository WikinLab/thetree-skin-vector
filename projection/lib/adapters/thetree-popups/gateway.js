/* thetree gateway selection for the Popups source ports. */
import {
  makeMediaWikiApiRequestUrl,
  makeNullModel,
  modelFromMediaWikiApiResponse,
  modelFromSummaryResponse,
  validateExternalPreviewModel
} from '../../ports/mediawiki-popups/src/preview/model.js';
import {
  isTheTreeInternalPageData,
  modelFromTheTreeInternalPageData
} from './model.js';
import { titleDb } from './title.js';

function sameOriginRequestPath(target) {
  if (!target || typeof target.href !== 'string') return null;
  try {
    const url = new URL(target.href, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return `${url.pathname}${url.search}`;
  } catch (error) {
    return null;
  }
}

function getHostPageDataRequest(options = {}) {
  const requestPageData = options.theTreeHostCapabilities?.requestPageData;
  return typeof requestPageData === 'function' ? requestPageData : null;
}

export function createTheTreePopupsGateway(popupsData, options = {}) {
  async function fetchPreviewForTitle(mwTitle, signal, target = null) {
    const externalGateway = window.theTreePopupsGateway;
    if (externalGateway && typeof externalGateway.fetchPreviewForTitle === 'function') {
      const suppliedModel = await externalGateway.fetchPreviewForTitle(mwTitle, signal, target);
      return validateExternalPreviewModel(suppliedModel) || makeNullModel(mwTitle, popupsData, target);
    }

    const requestPageData = getHostPageDataRequest(options);
    const requestPath = sameOriginRequestPath(target);
    if (requestPageData && requestPath) {
      try {
        const data = await requestPageData(requestPath, { signal });
        if (isTheTreeInternalPageData(data)) {
          return modelFromTheTreeInternalPageData(data, mwTitle, popupsData, target);
        }
      } catch (error) {
        if (error && error.name === 'AbortError') throw error;
      }
    }

    if (popupsData.mediaWikiApiEndpoint) {
      try {
        const response = await window.fetch(makeMediaWikiApiRequestUrl(popupsData.mediaWikiApiEndpoint, mwTitle, popupsData), {
          headers: {
            Accept: 'application/json',
            'X-Analytics': 'preview=1',
            'Accept-Language': popupsData.acceptLanguage
          },
          signal
        });
        if (response.ok) {
          return modelFromMediaWikiApiResponse(await response.json(), mwTitle, popupsData, target);
        }
      } catch (error) {
        if (error && error.name === 'AbortError') throw error;
        return makeNullModel(mwTitle, popupsData, target);
      }
    }

    if (popupsData.summaryEndpoint) {
      try {
        const endpoint = popupsData.summaryEndpoint.endsWith('/') ? popupsData.summaryEndpoint : `${popupsData.summaryEndpoint}/`;
        const response = await window.fetch(`${endpoint}${encodeURIComponent(titleDb(mwTitle))}`, {
          headers: { Accept: 'application/json' },
          signal
        });
        if (response.ok) {
          return modelFromSummaryResponse(await response.json(), mwTitle, popupsData, target);
        }
      } catch (error) {
        if (error && error.name === 'AbortError') throw error;
        return makeNullModel(mwTitle, popupsData, target);
      }
    }

    return makeNullModel(mwTitle, popupsData, target);
  }

  return Object.freeze({ fetchPreviewForTitle });
}
