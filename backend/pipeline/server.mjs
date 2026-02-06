import http from 'node:http';
import { runHotspotPipeline } from './hotspots-lib.mjs';

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
  if (req.method !== 'POST' || req.url !== '/run') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

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
});

server.listen(port, () => {
  console.log(`Hotspot pipeline server running on ${port}`);
});
