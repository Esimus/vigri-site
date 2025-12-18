// src/lib/nft/parseVigriNftUri.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVigriNftUri } from './parseVigriNftUri';

test('tree-steel TR -> designKey=1', () => {
  const r = parseVigriNftUri('/metadata/nft/tree-steel/TR/000001.json');
  assert.ok(r);
  assert.equal(r.tierSlug, 'tree-steel');
  assert.equal(r.tierCode, 'TR');
  assert.equal(r.serial, 1);
  assert.equal(r.designKey, 1);
  assert.equal(r.collectorId, 'TR-MMXXVI-0001-01');
});

test('tree-steel FE -> designKey=2', () => {
  const r = parseVigriNftUri('/metadata/nft/tree-steel/FE/000002.json');
  assert.ok(r);
  assert.equal(r.designKey, 2);
  assert.equal(r.collectorId, 'FE-MMXXVI-0002-02');
});

test('bronze -> designKey=1', () => {
  const r = parseVigriNftUri('/metadata/nft/bronze/CU/000010.json');
  assert.ok(r);
  assert.equal(r.tierSlug, 'bronze');
  assert.equal(r.tierCode, 'CU');
  assert.equal(r.serial, 10);
  assert.equal(r.designKey, 1);
  assert.equal(r.collectorId, 'CU-MMXXVI-0010-01');
});

test('silver -> designKey computed from serial and matches variant', () => {
  const r = parseVigriNftUri('/metadata/nft/silver/AG/v08/000058.json');
  assert.ok(r);
  assert.equal(r.tierSlug, 'silver');
  assert.equal(r.tierCode, 'AG');
  assert.equal(r.serial, 58);
  assert.equal(r.designKey, 8);
  assert.equal(r.collectorId, 'AG-MMXXVI-0058-08');
});

test('gold -> designKey=serial, padded width=3', () => {
  const r = parseVigriNftUri('/metadata/nft/gold/AU/000123.json');
  assert.ok(r);
  assert.equal(r.tierSlug, 'gold');
  assert.equal(r.tierCode, 'AU');
  assert.equal(r.serial, 123);
  assert.equal(r.designKey, 123);
  assert.equal(r.collectorId, 'AU-MMXXVI-0123-123');
});

test('absolute URL and query/hash are ignored', () => {
  const r = parseVigriNftUri('https://example.com/metadata/nft/platinum/PT/000007.json?x=1#y');
  assert.ok(r);
  assert.equal(r.tierSlug, 'platinum');
  assert.equal(r.tierCode, 'PT');
  assert.equal(r.serial, 7);
  assert.equal(r.designKey, 7);
  assert.equal(r.collectorId, 'PT-MMXXVI-0007-007');
});

test('invalid: wrong prefix', () => {
  const r = parseVigriNftUri('/wrong/nft/tree-steel/TR/000001.json');
  assert.equal(r, null);
});

test('invalid: silver variant mismatch', () => {
  // serial=58 => designKey=8, so v03 must be rejected
  const r = parseVigriNftUri('/metadata/nft/silver/AG/v03/000058.json');
  assert.equal(r, null);
});
