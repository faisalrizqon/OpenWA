'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  applyMediaIdFix,
  isApplied,
  TARGET_FIND,
  TARGET_REPLACE,
} = require('./patch-wwebjs-media-id');

function fakeWwjs(utilsSource) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wwjs-media-id-'));
  const utilsDir = path.join(dir, 'src', 'util', 'Injected');
  fs.mkdirSync(utilsDir, { recursive: true });
  fs.writeFileSync(path.join(utilsDir, 'Utils.js'), utilsSource);
  return { dir, utilsFile: path.join(utilsDir, 'Utils.js') };
}

const PRISTINE = `exports.x = async () => {\n    const message = {\n${TARGET_FIND}\n};\n`;

test('applies media id fix to a pristine tree', () => {
  const { dir, utilsFile } = fakeWwjs(PRISTINE);
  assert.equal(isApplied(dir), false);

  const result = applyMediaIdFix(dir);
  assert.equal(result.skipped, false);
  assert.equal(isApplied(dir), true);

  const patched = fs.readFileSync(utilsFile, 'utf8');
  assert.ok(patched.includes(TARGET_REPLACE));
  assert.ok(patched.includes('delete message.__x_id;'));
});

test('is idempotent — second run is skipped', () => {
  const { dir } = fakeWwjs(PRISTINE);
  applyMediaIdFix(dir);

  const second = applyMediaIdFix(dir);
  assert.equal(second.skipped, true);
  assert.equal(isApplied(dir), true);
});

test('refuses unrecognised shapes', () => {
  const { dir } = fakeWwjs('// completely different file');
  assert.throws(() => applyMediaIdFix(dir), /unsupported Utils.js shape/);
});
