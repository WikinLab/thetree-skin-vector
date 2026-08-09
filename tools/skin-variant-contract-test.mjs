#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(fs.readFileSync(path.join(root, 'contracts', 'skin-variant-contract.json'), 'utf8'));

assert.equal(contract.schema, 1);
assert.match(contract.family, /^[a-z][a-z0-9-]*$/);
assert.match(contract.id, /^[a-z][a-z0-9-]*$/);
assert.match(contract.upstreamSkinName, /^[a-z][a-z0-9-]*$/);
assert.match(contract.composableEntry, /^components\/[A-Za-z0-9_-]+\.vue$/);

const entryPath = path.join(root, contract.composableEntry);
assert.ok(fs.existsSync(entryPath), `Composable skin entry is missing: ${contract.composableEntry}`);
const entry = fs.readFileSync(entryPath, 'utf8');
assert.match(entry, /data-tt-skin-variant/);
assert.match(entry, /<nuxt\s*\/>/);

console.log(`Skin variant contract passed: ${contract.id} -> ${contract.composableEntry}`);
