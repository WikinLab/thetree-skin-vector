export function stableHtmlSignature(html) {
  const text = String(html || '');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return `${text.length}-${hash.toString(16)}`;
}
