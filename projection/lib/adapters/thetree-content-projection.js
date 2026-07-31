/*
 * the tree preference bridge for the Vector content projection layer.
 *
 * The companion backend plugin owns only request-cookie -> skinData transport.
 * This adapter validates that transport, falls back to thetree local settings,
 * and persists a new value before a deliberate full reload.
 */

export const CONTENT_PROJECTION_PROTOCOL = 'thetree-vector-content-projection/v1';
export const CONTENT_PROJECTION_SERVER_DATA_KEY = 'thetreeVectorContentProjection';
export const CONTENT_PROJECTION_COOKIE_NAME = 'thetree_vector_content_projection';
export const CONTENT_PROJECTION_COOKIE_ENABLED = 'on';
export const CONTENT_PROJECTION_COOKIE_DISABLED = 'off';
export const CONTENT_PROJECTION_TOGGLE_ATTRIBUTE = 'data-tt-content-projection-toggle';
export const CONTENT_PROJECTION_PERSONAL_TOOL_ID = 'pt-content-projection';

const DEFAULT_PROJECTION_ENABLED = true;
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function serverPayload(context = {}) {
  const viewData = context.viewData && typeof context.viewData === 'object' ? context.viewData : {};
  const payload = viewData[CONTENT_PROJECTION_SERVER_DATA_KEY];
  return payload && typeof payload === 'object' ? payload : null;
}

export function resolveContentProjectionPreference(context = {}) {
  const payload = serverPayload(context);
  const hasServerPreference = payload?.protocol === CONTENT_PROJECTION_PROTOCOL
    && typeof payload.enabled === 'boolean';
  const localPreference = context.localConfig?.['vector.content_projection'];
  const hasLocalPreference = typeof localPreference === 'boolean';
  return Object.freeze({
    available: hasServerPreference || hasLocalPreference,
    enabled: hasServerPreference
      ? payload.enabled
      : hasLocalPreference
        ? localPreference
        : DEFAULT_PROJECTION_ENABLED,
    source: hasServerPreference
      ? 'ssr-plugin-cookie'
      : hasLocalPreference
        ? 'local-config'
        : 'projection-default'
  });
}

function localizedLabel(enabled, lang = 'ko') {
  const language = String(lang || 'ko').toLowerCase().split('-')[0];
  if (language === 'ko') return enabled ? '스킨 본문 끄기' : '스킨 본문 켜기';
  return enabled ? 'Disable skin content' : 'Enable skin content';
}

export function makeContentProjectionPersonalTool(context = {}) {
  const preference = resolveContentProjectionPreference(context);
  const enabled = preference.enabled;
  const label = localizedLabel(enabled, context.config?.lang || context.config?.['wiki.lang']);
  return Object.freeze({
    id: CONTENT_PROJECTION_PERSONAL_TOOL_ID,
    label,
    href: '#',
    arrayAttributes: Object.freeze([
      Object.freeze({ key: 'href', value: '#' }),
      Object.freeze({ key: 'class', value: 'tt-content-projection-toggle' }),
      Object.freeze({ key: CONTENT_PROJECTION_TOGGLE_ATTRIBUTE, value: '1' }),
      Object.freeze({ key: 'title', value: label })
    ])
  });
}

export function insertContentProjectionPersonalTool(items = [], context = {}) {
  const source = Array.isArray(items) ? items.filter(Boolean) : [];
  const withoutExisting = source.filter((item) => item.id !== CONTENT_PROJECTION_PERSONAL_TOOL_ID);
  const tool = makeContentProjectionPersonalTool(context);
  return Object.freeze(tool ? [...withoutExisting, tool] : withoutExisting);
}

export function isContentProjectionToggleTarget(target) {
  if (!target || typeof target.closest !== 'function') return null;
  return target.closest(`a.tt-content-projection-toggle[${CONTENT_PROJECTION_TOGGLE_ATTRIBUTE}="1"]`);
}

export function serializeContentProjectionCookie(enabled, { secure = false } = {}) {
  const value = enabled ? CONTENT_PROJECTION_COOKIE_ENABLED : CONTENT_PROJECTION_COOKIE_DISABLED;
  return [
    `${CONTENT_PROJECTION_COOKIE_NAME}=${value}`,
    'Path=/',
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    'SameSite=Lax',
    secure ? 'Secure' : null
  ].filter(Boolean).join('; ');
}

export function setContentProjectionPreference(enabled, storeState = {}) {
  if (typeof document === 'undefined') return false;
  const secure = typeof window !== 'undefined' && window.location?.protocol === 'https:';
  document.cookie = serializeContentProjectionCookie(enabled, { secure });
  if (typeof storeState.localConfigSetValue === 'function') {
    storeState.localConfigSetValue('vector.content_projection', !!enabled);
  }
  return true;
}

export function toggleTheTreeContentProjection(context = {}, storeState = {}) {
  const preference = resolveContentProjectionPreference(context);
  if (!setContentProjectionPreference(!preference.enabled, storeState)) return false;
  if (typeof window !== 'undefined' && window.location && typeof window.location.reload === 'function') {
    window.location.reload();
  }
  return true;
}
