/* Popups extension registration for the generic skin runtime host. */

import { RUNTIME_CAPABILITIES } from '../../runtime/capabilities.js';
import { createTheTreePopupsRuntime } from './runtime.js';

export const THETREE_POPUPS_EXTENSION_ID = 'mediawiki-popups';

export function createTheTreePopupsExtension({
  getData = () => ({}),
  getOptions = () => ({})
} = {}) {
  return Object.freeze({
    id: THETREE_POPUPS_EXTENSION_ID,
    requires: Object.freeze([RUNTIME_CAPABILITIES.MEDIAWIKI_CONTENT_SURFACE]),
    create({ mediaWikiRuntime = null } = {}) {
      return createTheTreePopupsRuntime(getData(), {
        ...getOptions(),
        mediaWikiRuntime
      });
    }
  });
}
