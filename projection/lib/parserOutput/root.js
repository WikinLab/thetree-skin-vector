/*
 * MediaWiki .mw-parser-output root wrapping contract.
 */

import {
  cloneNodes,
  elementNode,
  getClasses,
  rootNode
} from './domAst.js';
import { significantNodes } from './flow.js';

export const COMPILER_ROOT_ATTRIBUTE = 'data-tt-vector-parser-output';
export const COMPILER_ROOT_ATTRIBUTE_VALUE = '1';

export function hasCompilerOwnedParserOutputRoot(html) {
  const text = String(html || '').trim();
  if (!text) return false;
  const opening = text.match(/^<div\b[^>]*>/i);
  if (!opening) return false;
  const tag = opening[0];
  if (!new RegExp(`\\b${COMPILER_ROOT_ATTRIBUTE}=["']${COMPILER_ROOT_ATTRIBUTE_VALUE}["']`, 'i').test(tag)) return false;
  if (!/\bclass=["'][^"']*(?:^|\s)mw-parser-output(?:\s|$)[^"']*["']/i.test(tag)) return false;
  return /<\/div>\s*$/i.test(text);
}

export function isParserOutputRootWrapper(node) {
  return node?.type === 'element'
    && node.tagName === 'div'
    && getClasses(node).includes('mw-parser-output');
}

export function unwrapParserOutputRootWrapper(body) {
  const significant = significantNodes(body);
  if (significant.length !== 1 || !isParserOutputRootWrapper(significant[0])) return body;
  return body.flatMap((node) => (node === significant[0] ? cloneNodes(node.children || []) : [node]));
}

export function makeParserOutputRoot(body) {
  return elementNode('div', [
    { name: 'class', value: 'mw-parser-output' },
    { name: COMPILER_ROOT_ATTRIBUTE, value: COMPILER_ROOT_ATTRIBUTE_VALUE }
  ], body);
}

export function emitArticleRoot(article, options = {}) {
  return rootNode(options.parserOutputRoot ? [makeParserOutputRoot(article.body)] : article.body);
}
