/*
 * Exact the tree -> MediaWiki link semantics used by ParserOutput conversion.
 * Host classes and host-owned presentation are source inputs; presentation
 * values and ownership never belong in this mapping.
 */

function freezeSemantic(definition) {
  return Object.freeze(Object.fromEntries(
    Object.entries(definition).map(([key, value]) => [
      key,
      Array.isArray(value) ? Object.freeze([...value]) : value
    ])
  ));
}

export const LINK_SEMANTICS = Object.freeze({
  internal: freezeSemantic({
    hostClasses: ['wiki-link-internal']
  }),
  missing: freezeSemantic({
    hostClasses: ['not-exist'],
    upstreamClasses: ['new']
  }),
  self: freezeSemantic({
    hostClasses: ['wiki-self-link'],
    upstreamClasses: ['mw-selflink']
  }),
  external: freezeSemantic({
    hostClasses: ['wiki-link-external', 'wiki-link-whitelisted'],
    upstreamClasses: ['external', 'extiw'],
    emittedClasses: ['external', 'text'],
    preserveHostClasses: false
  })
});

export default LINK_SEMANTICS;
