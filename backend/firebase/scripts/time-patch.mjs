/**
 * Preload for Node scripts when the host clock is skewed.
 *
 * Usage:
 *   node --import ./scripts/time-patch.mjs scripts/trim-demo-data.mjs --keep 250
 *
 * It only patches the Node process Date; it does not change the system clock.
 */
const RealDate = Date;

const response = await fetch('https://www.google.com', { method: 'HEAD' });
const serverTime = Date.parse(response.headers.get('date') ?? '');

if (!Number.isFinite(serverTime)) {
  console.error('[time-patch] Could not read server time; leaving clock unchanged.');
} else {
  const offset = serverTime - RealDate.now();

  class PatchedDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        super(RealDate.now() + offset);
        return;
      }
      super(...args);
    }

    static now() {
      return RealDate.now() + offset;
    }
  }

  globalThis.Date = PatchedDate;
  console.error(`[time-patch] applied offset ${offset} ms`);
}
