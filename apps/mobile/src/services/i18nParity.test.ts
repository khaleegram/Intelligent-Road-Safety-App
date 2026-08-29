import test from 'node:test';
import assert from 'node:assert/strict';

import en from '../i18n/en.json';
import ha from '../i18n/ha.json';
import yo from '../i18n/yo.json';
import ig from '../i18n/ig.json';

const collectKeys = (table: Record<string, string>) => Object.keys(table).sort();

test('i18n locale files share the same keys', () => {
  const enKeys = collectKeys(en);
  const haKeys = collectKeys(ha);
  const yoKeys = collectKeys(yo);
  const igKeys = collectKeys(ig);

  assert.deepEqual(haKeys, enKeys, 'Hausa keys must match English');
  assert.deepEqual(yoKeys, enKeys, 'Yoruba keys must match English');
  assert.deepEqual(igKeys, enKeys, 'Igbo keys must match English');
});
