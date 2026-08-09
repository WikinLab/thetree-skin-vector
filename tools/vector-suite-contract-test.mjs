#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseSuiteArgs,
  renderVariantLoader
} from './vector-suite.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'SUITE-LOCK.json'), 'utf8'));
const deviceContract = JSON.parse(fs.readFileSync(path.join(root, 'contracts', 'device-variant-data-contract.json'), 'utf8'));

assert.equal(lock.schema, 1);
assert.equal(lock.mode, 'vector-minerva');
assert.match(lock.minerva.repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
assert.match(lock.minerva.commit, /^[0-9a-f]{40}$/);
assert.match(lock.minerva.packageVersion, /^\d+\.\d+\.\d+$/);
assert.match(lock.minerva.mediaWikiRelease, /^\d+\.\d+$/);
assert.equal(deviceContract.schema, 1);
assert.equal(deviceContract.pluginName, 'thetree-plugin-vector');
assert.equal(deviceContract.installDirectory, 'plugins/thetree-plugin-vector');
assert.equal(deviceContract.skinName, 'vector');
assert.equal(deviceContract.publicDataKey, 'thetreeVectorDevice');
assert.equal(deviceContract.dataSchema, 'thetree-vector-device/v1');
assert.equal(deviceContract.transport, 'skinData-page-data');
assert.equal(deviceContract.desktopVariant, 'vector');
assert.equal(deviceContract.mobileVariant, 'minerva');

assert.deepEqual(parseSuiteArgs([]), {
  vectorOnly: false,
  clean: false,
  upstreamArgs: []
});
assert.deepEqual(parseSuiteArgs(['--vector-only', '--clean', '--release', '1.46']), {
  vectorOnly: true,
  clean: true,
  upstreamArgs: ['--clean', '--release', '1.46']
});
assert.throws(() => parseSuiteArgs(['--unknown']), /Unknown bootstrap option/);

const vectorLoader = renderVariantLoader('vector-only', lock.minerva.entry);
assert.match(vectorLoader, /suiteMode = 'vector-only'/);
assert.match(vectorLoader, /loadMinervaVariant = null/);
const compositeLoader = renderVariantLoader('vector-minerva', lock.minerva.entry);
assert.match(compositeLoader, /suiteMode = 'vector-minerva'/);
assert.match(compositeLoader, /import\('\.\.\/minerva\/layout\.vue'\)/);

const layout = fs.readFileSync(path.join(root, 'layout.vue'), 'utf8');
assert.match(layout, /thetree-vector-device\/v1/);
assert.match(layout, /loadVectorVariant/);
assert.match(layout, /loadMinervaVariant/);

const statePath = path.join(root, '.skin-suite', 'state.json');
const loaderPath = path.join(root, '.skin-suite', 'generated', 'variant-loaders.js');
assert.ok(fs.existsSync(statePath), 'Prepared suite state is missing.');
assert.ok(fs.existsSync(loaderPath), 'Prepared variant loader is missing.');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const preparedLoader = fs.readFileSync(loaderPath, 'utf8');
assert.ok(['vector-only', 'vector-minerva'].includes(state.mode));
assert.match(preparedLoader, new RegExp(`suiteMode = '${state.mode}'`));
if (state.mode === 'vector-minerva') {
  assert.equal(state.minervaCommit, lock.minerva.commit);
  assert.ok(fs.existsSync(path.join(root, '.skin-suite', 'minerva', lock.minerva.entry)));
}

console.log(`Vector suite contract passed in ${state.mode} mode.`);
