import http from 'node:http';
import admin from 'firebase-admin';
import { runHotspotPipeline } from './hotspots-lib.mjs';
import { initFirestore } from './hotspots-lib.mjs';

const port = Number(process.env.PORT ?? 8080);

const parseBody = (req) =>
  new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/run') {
    const body = await parseBody(req);
    const threshold = Number(body.threshold ?? process.env.HOTSPOT_THRESHOLD ?? 3);
    const gridSizeDegrees = Number(body.grid ?? process.env.HOTSPOT_GRID ?? 0.01);
    const timeBucket = body.time_bucket ?? process.env.HOTSPOT_TIME_BUCKET ?? 'all';
    const onlyVerified = Boolean(body.verified ?? process.env.HOTSPOT_VERIFIED === 'true');
    const dryRun = Boolean(body.dry_run ?? false);

    if (Number.isNaN(threshold) || Number.isNaN(gridSizeDegrees)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid threshold or grid' }));
      return;
    }

    try {
      const result = await runHotspotPipeline({
        threshold,
        gridSizeDegrees,
        timeBucket,
        onlyVerified,
        dryRun,
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, ...result }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: String(error) }));
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/admin/roles') {
    try {
      const authHeader = req.headers.authorization ?? '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (!token) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Missing bearer token' }));
        return;
      }

      const db = initFirestore();
      const decoded = await admin.auth().verifyIdToken(token);
      const callerRef = db.collection('users').doc(decoded.uid);
      const callerSnapshot = await callerRef.get();
      const callerData = callerSnapshot.data();
      if (!callerSnapshot.exists || callerData?.is_admin !== true) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Admin access required' }));
        return;
      }

      const body = await parseBody(req);
      const targetUid = String(body.targetUid ?? '');
      const isAdmin = Boolean(body.isAdmin);
      if (!targetUid) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'targetUid is required' }));
        return;
      }

      await db.collection('users').doc(targetUid).set(
        {
          is_admin: isAdmin,
          updated_at: new Date().toISOString(),
          updated_by: decoded.uid,
        },
        { merge: true }
      );
      await admin.auth().setCustomUserClaims(targetUid, { is_admin: isAdmin });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, targetUid, isAdmin }));
      return;
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: String(error) }));
      return;
    }
  }

  if (req.method !== 'POST') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(port, () => {
  console.log(`Hotspot pipeline server running on ${port}`);
});
