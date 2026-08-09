#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseSuiteArgs,
  parseRemoteRef,
  renderVariantLoader
} from './vector-suite.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'SUITE-LOCK.json'), 'utf8'));
const mobileFrontendContract = JSON.parse(fs.readFileSync(path.join(root, 'contracts', 'mobilefrontend-data-contract.json'), 'utf8'));

assert.equal(lock.schema, 2);
assert.equal(lock.mode, 'vector-minerva');
assert.match(lock.minerva.repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
assert.equal(lock.minerva.ref, 'main');
assert.equal(lock.minerva.resolution, 'latest-ref-head');
assert.equal(lock.minerva.commit, undefined);
assert.equal(lock.minerva.packageVersion, undefined);
assert.match(lock.minerva.mediaWikiRelease, /^\d+\.\d+$/);
assert.equal(mobileFrontendContract.schema, 1);
assert.equal(mobileFrontendContract.pluginName, 'thetree-plugin-mobilefrontend');
assert.equal(mobileFrontendContract.installDirectory, 'plugins/thetree-plugin-mobilefrontend');
assert.deepEqual(mobileFrontendContract.supportedSkinNames, ['vector', 'minerva']);
assert.equal(mobileFrontendContract.publicDataKey, 'thetreeMobileFrontend');
assert.equal(mobileFrontendContract.dataSchema, 'thetree-mobilefrontend/v1');
assert.equal(mobileFrontendContract.transport, 'skinData-page-data');
assert.equal(mobileFrontendContract.desktopVariant, 'vector');
assert.equal(mobileFrontendContract.mobileVariant, 'minerva');
assert.equal(
  parseRemoteRef(
    '0123456789abcdef0123456789abcdef01234567\trefs/heads/main\n',
    'main'
  ),
  '0123456789abcdef0123456789abcdef01234567'
);
assert.throws(() => parseRemoteRef('', 'main'), /Unable to resolve latest commit/);

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
assert.match(layout, /thetree-mobilefrontend\/v1/);
assert.match(layout, /thetreeMobileFrontend/);
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
  assert.equal(state.schema, 2);
  assert.equal(state.minervaRepository, lock.minerva.repository);
  assert.equal(state.minervaRef, lock.minerva.ref);
  assert.match(state.minervaCommit, /^[0-9a-f]{40}$/);
  assert.equal(typeof state.minervaPackageVersion, 'string');
  assert.ok(state.minervaPackageVersion.length > 0);
  assert.ok(fs.existsSync(path.join(root, '.skin-suite', 'minerva', lock.minerva.entry)));
}

console.log(`Vector suite contract passed in ${state.mode} mode.`);
