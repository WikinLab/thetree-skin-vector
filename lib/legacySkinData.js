/*
 * the tree -> REL1_46 skin-legacy top-level template-data adapter.
 * The returned object contains only keys owned by skin-legacy.mustache and its
 * upstream partial data. Host-only page-contract metadata is passed separately.
 */
import { makeDockBottomData, makeFooterPlacesData, makeIndicatorsData, makeLegacyFooterIconData } from './legacyTheTreeAdapter';
import { makeFooterInfoData, makeLegacyFooterTemplateData } from './legacyFooterData';
import { getConfiguredString } from './legacyHostAdapterPolicy';
import { makeNavigationData } from './legacyNavigationData';
import { getLegacyPageContract } from './legacyPageContract';
import { buildLegacySkinTitleData } from './legacyTitleData';

export function makeSkinLegacyData(context = {}) {
  const page = context.page || {};
  const config = context.config || {};
  const pageContract = getLegacyPageContract(context);
  const navigationData = makeNavigationData(context);
  const navigationPortlets = navigationData['data-portlets'] || {};
  const footerData = makeLegacyFooterTemplateData({
    info: makeFooterInfoData(page, pageContract),
    places: makeFooterPlacesData(context),
    icons: makeLegacyFooterIconData()
  });

  return {
    ...buildLegacySkinTitleData(page, config, pageContract),
    ...navigationData,
    'msg-vector-jumptonavigation': '둘러보기로 이동',
    'msg-vector-jumptosearch': '검색으로 이동',
    'array-indicators': makeIndicatorsData(page),
    'html-user-language-attributes': '',
    'data-footer': footerData,
    'data-portlets': {
      ...navigationPortlets,
      'data-dock-bottom': makeDockBottomData(page)
    }
  };
}
