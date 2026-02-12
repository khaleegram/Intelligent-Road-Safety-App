import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

const projectId = `demo-roadsafe-${Date.now()}`;
const rules = readFileSync(join(process.cwd(), 'firestore.rules'), 'utf8');

const testEnv = await initializeTestEnvironment({
  projectId,
  firestore: { rules },
});

async function seedData() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/adminUser'), {
      email: 'admin@roadsafe.dev',
      is_admin: true,
      created_at: new Date().toISOString(),
    });
    await setDoc(doc(db, 'users/researcher1'), {
      email: 'researcher@roadsafe.dev',
      is_admin: false,
      created_at: new Date().toISOString(),
    });
    await setDoc(doc(db, 'hotspots/h1'), {
      area_id: 'h1',
      center_lat: 9.082,
      center_lng: 8.6753,
      risk_score: 0.4,
      severity_level: 'Minor',
      accident_count: 2,
      last_updated: new Date().toISOString(),
    });
    await setDoc(doc(db, 'accidents/req_seed'), {
      request_id: 'req_seed',
      latitude: 9.082,
      longitude: 8.6753,
      timestamp: new Date().toISOString(),
      severity: 'Minor',
      road_type: 'Urban',
      weather: 'Clear',
      vehicle_count: 1,
      casualty_count: 0,
      created_at: new Date().toISOString(),
      reporter_uid: 'researcher1',
      verified: false,
    });
    await setDoc(doc(db, 'admin_alerts/a1'), {
      type: 'spike',
      level: 'warning',
      message: 'spike',
      created_at: new Date().toISOString(),
    });
  });
}

await seedData();

test('unauthenticated reads are blocked for confidential data', async () => {
  const anonDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(anonDb, 'hotspots/h1')));
  await assertFails(getDoc(doc(anonDb, 'accidents/req_seed')));
});

test('authenticated reads are allowed for hotspots and accidents', async () => {
  const authedDb = testEnv.authenticatedContext('researcher1').firestore();
  await assertSucceeds(getDoc(doc(authedDb, 'hotspots/h1')));
  await assertSucceeds(getDoc(doc(authedDb, 'accidents/req_seed')));
});

test('authenticated user can create accident only with matching request_id and reporter_uid', async () => {
  const db = testEnv.authenticatedContext('researcher1').firestore();
  const okPayload = {
    request_id: 'req_ok_1',
    latitude: 9.082,
    longitude: 8.6753,
    timestamp: new Date().toISOString(),
    severity: 'Minor',
    road_type: 'Urban',
    weather: 'Clear',
    vehicle_count: 1,
    casualty_count: 0,
    created_at: new Date().toISOString(),
    reporter_uid: 'researcher1',
  };
  await assertSucceeds(setDoc(doc(db, 'accidents/req_ok_1'), okPayload));

  await assertFails(
    setDoc(doc(db, 'accidents/req_bad_id'), {
      ...okPayload,
      request_id: 'different-id',
    })
  );
  await assertFails(
    setDoc(doc(db, 'accidents/req_bad_uid'), {
      ...okPayload,
      request_id: 'req_bad_uid',
      reporter_uid: 'someone-else',
    })
  );
});

test('admin can verify report but non-admin cannot', async () => {
  const nonAdminDb = testEnv.authenticatedContext('researcher1').firestore();
  await assertFails(
    updateDoc(doc(nonAdminDb, 'accidents/req_seed'), {
      verified: true,
      verified_by: 'researcher1',
      verified_at: serverTimestamp(),
    })
  );

  const adminDb = testEnv.authenticatedContext('adminUser').firestore();
  await assertSucceeds(
    updateDoc(doc(adminDb, 'accidents/req_seed'), {
      verified: true,
      verified_by: 'adminUser',
      verified_at: serverTimestamp(),
      notes: 'Reviewed by admin',
    })
  );
  await assertFails(
    updateDoc(doc(adminDb, 'accidents/req_seed'), {
      severity: 'Fatal',
    })
  );
});

test('admin alerts are admin-readable only', async () => {
  const adminDb = testEnv.authenticatedContext('adminUser').firestore();
  const researcherDb = testEnv.authenticatedContext('researcher1').firestore();
  await assertSucceeds(getDoc(doc(adminDb, 'admin_alerts/a1')));
  await assertFails(getDoc(doc(researcherDb, 'admin_alerts/a1')));
});

test.after(async () => {
  await testEnv.cleanup();
});

test('sanity', () => {
  assert.equal(typeof rules, 'string');
});
