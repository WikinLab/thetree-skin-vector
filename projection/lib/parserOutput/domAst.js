/*
 * Tiny HTML fragment AST used by the skin parser-output compiler.
 * It is intentionally local to the skin and does not inspect the mounted DOM.
 */

export const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr'
]);

const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'textarea', 'title']);


export function textNode(value) {
  return { type: 'text', value: String(value || '') };
}

export function commentNode(value) {
  return { type: 'comment', value: String(value || '') };
}

export function elementNode(tagName, attrs = [], children = [], selfClosing = false) {
  return {
    type: 'element',
    tagName: String(tagName || '').toLowerCase(),
    attrs,
    children,
    selfClosing
  };
}

export function rootNode(children = []) {
  return { type: 'root', children };
}

function escapeText(value) {
  return String(value ?? '').replace(/[&<>]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
  }[char]));
}

function escapeAttr(value) {
  return String(value ?? '').replace(/[&"<>]/g, (char) => ({
    '&': '&amp;',
    '"': '&quot;',
    '<': '&lt;',
    '>': '&gt;'
  }[char]));
}

function parseAttributes(source) {
  const attrs = [];
  let index = 0;
  while (index < source.length) {
    while (index < source.length && /\s/.test(source[index])) index += 1;
    if (index >= source.length) break;
    let name = '';
    while (index < source.length && /[^\s=/>]/.test(source[index])) {
      name += source[index];
      index += 1;
    }
    if (!name) {
      index += 1;
      continue;
    }
    while (index < source.length && /\s/.test(source[index])) index += 1;
    let value = '';
    if (source[index] === '=') {
      index += 1;
      while (index < source.length && /\s/.test(source[index])) index += 1;
      const quote = source[index];
      if (quote === '"' || quote === "'") {
        index += 1;
        while (index < source.length && source[index] !== quote) {
          value += source[index];
          index += 1;
        }
        if (source[index] === quote) index += 1;
      } else {
        while (index < source.length && /[^\s>]/.test(source[index])) {
          value += source[index];
          index += 1;
        }
      }
    }
    attrs.push({ name, value });
  }
  return attrs;
}

function parseTag(token) {
  if (!token.startsWith('<') || !token.endsWith('>')) return null;
  if (token.startsWith('<!--')) return { kind: 'comment', content: token.slice(4, -3) };
  if (/^<!\[CDATA\[/i.test(token)) return { kind: 'text', content: token };
  if (/^<!/i.test(token) || /^<\?/i.test(token)) return { kind: 'comment', content: token.slice(1, -1) };
  const closing = /^<\s*\//.test(token);
  if (closing) {
    const match = /^<\s*\/\s*([A-Za-z][A-Za-z0-9:-]*)/.exec(token);
    return match ? { kind: 'close', tagName: match[1].toLowerCase() } : null;
  }
  const openMatch = /^<\s*([A-Za-z][A-Za-z0-9:-]*)([\s\S]*?)\s*\/?>$/.exec(token);
  if (!openMatch) return null;
  const tagName = openMatch[1].toLowerCase();
  const attrSource = openMatch[2] || '';
  const selfClosing = /\/\s*>$/.test(token) || VOID_ELEMENTS.has(tagName);
  return { kind: 'open', tagName, attrs: parseAttributes(attrSource), selfClosing };
}

export function parseHtmlFragment(html) {
  const root = rootNode();
  const stack = [root];
  let index = 0;

  while (index < html.length) {
    const current = stack[stack.length - 1];
    const rawTag = current.type === 'element' && RAW_TEXT_ELEMENTS.has(current.tagName) ? `</${current.tagName}` : '<';
    const nextTag = html.indexOf(rawTag, index);
    if (nextTag === -1) {
      current.children.push(textNode(html.slice(index)));
      break;
    }
    if (nextTag > index) current.children.push(textNode(html.slice(index, nextTag)));

    if (html.startsWith('<!--', nextTag)) {
      const end = html.indexOf('-->', nextTag + 4);
      if (end === -1) {
        current.children.push(textNode(html.slice(nextTag)));
        break;
      }
      current.children.push(commentNode(html.slice(nextTag + 4, end)));
      index = end + 3;
      continue;
    }

    const close = html.indexOf('>', nextTag + 1);
    if (close === -1) {
      current.children.push(textNode(html.slice(nextTag)));
      break;
    }
    const token = html.slice(nextTag, close + 1);
    const parsed = parseTag(token);
    if (!parsed) {
      current.children.push(textNode(token));
      index = close + 1;
      continue;
    }

    if (parsed.kind === 'comment') {
      current.children.push(commentNode(parsed.content));
      index = close + 1;
      continue;
    }
    if (parsed.kind === 'text') {
      current.children.push(textNode(parsed.content));
      index = close + 1;
      continue;
    }
    if (parsed.kind === 'close') {
      let found = -1;
      for (let i = stack.length - 1; i > 0; i -= 1) {
        if (stack[i].tagName === parsed.tagName) {
          found = i;
          break;
        }
      }
      if (found !== -1) stack.length = found;
      index = close + 1;
      continue;
    }

    const node = elementNode(parsed.tagName, parsed.attrs, [], parsed.selfClosing);
    current.children.push(node);
    if (!parsed.selfClosing && !VOID_ELEMENTS.has(parsed.tagName)) stack.push(node);
    index = close + 1;
  }

  return root;
}

function serializeAttrs(attrs) {
  if (!attrs?.length) return '';
  return attrs
    .filter((attr) => attr && attr.name)
    .map((attr) => attr.value === '' ? ` ${attr.name}` : ` ${attr.name}="${escapeAttr(attr.value)}"`)
    .join('');
}

export function serializeHtml(node) {
  if (!node) return '';
  if (Array.isArray(node)) return node.map(serializeHtml).join('');
  if (node.type === 'root') return node.children.map(serializeHtml).join('');
  if (node.type === 'text') return node.value;
  if (node.type === 'comment') return `<!--${node.value}-->`;
  if (node.type !== 'element') return '';
  const attrs = serializeAttrs(node.attrs);
  if (node.selfClosing || VOID_ELEMENTS.has(node.tagName)) return `<${node.tagName}${attrs}>`;
  return `<${node.tagName}${attrs}>${node.children.map(serializeHtml).join('')}</${node.tagName}>`;
}

export function getAttr(node, name) {
  const attr = node?.attrs?.find((item) => item.name.toLowerCase() === name.toLowerCase());
  return attr ? attr.value : '';
}

export function setAttr(node, name, value) {
  const existing = node.attrs.find((item) => item.name.toLowerCase() === name.toLowerCase());
  if (existing) existing.value = String(value);
  else node.attrs.push({ name, value: String(value) });
  return node;
}

export function removeAttr(node, name) {
  node.attrs = node.attrs.filter((item) => item.name.toLowerCase() !== name.toLowerCase());
  return node;
}

export function getClasses(node) {
  return getAttr(node, 'class').split(/\s+/).filter(Boolean);
}

export function setClasses(node, classes) {
  const value = Array.from(new Set(classes.filter(Boolean))).join(' ');
  if (value) setAttr(node, 'class', value);
  else removeAttr(node, 'class');
  return node;
}

export function hasAnyClass(node, classSet) {
  return getClasses(node).some((className) => classSet.has(className));
}

export function hasClassPattern(node, pattern) {
  return getClasses(node).some((className) => pattern.test(className));
}

export function classString(node) {
  return getClasses(node).join(' ');
}

export function textContent(node) {
  if (!node) return '';
  if (Array.isArray(node)) return node.map(textContent).join('');
  if (node.type === 'text') return node.value;
  if (node.type === 'comment') return '';
  if (node.children) return node.children.map(textContent).join('');
  return '';
}

export function plainText(nodes) {
  return textContent(nodes).replace(/\s+/g, ' ').trim();
}


export function isWhitespaceOnlyNode(node) {
  return node?.type === 'text' && node.value.trim() === '';
}

export function cloneNode(node) {
  if (node.type === 'text') return textNode(node.value);
  if (node.type === 'comment') return commentNode(node.value);
  if (node.type === 'root') return rootNode(node.children.map(cloneNode));
  return elementNode(node.tagName, node.attrs.map((attr) => ({ ...attr })), node.children.map(cloneNode), node.selfClosing);
}

export function cloneNodes(nodes) {
  return nodes.map(cloneNode);
}


export function findFirstElement(node, predicate) {
  if (!node) return null;
  if (node.type === 'element' && predicate(node)) return node;
  for (const child of node.children || []) {
    const found = findFirstElement(child, predicate);
    if (found) return found;
  }
  return null;
}

export function collectElements(node, predicate, result = []) {
  if (!node) return result;
  if (node.type === 'element' && predicate(node)) result.push(node);
  for (const child of node.children || []) collectElements(child, predicate, result);
  return result;
}
