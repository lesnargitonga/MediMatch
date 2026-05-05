import app from './app';
import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import { pool } from './config/db';
import { autoSeedOnEmpty } from './tools/autoSeedOnEmpty';
import { migrate } from './tools/migrate';
// Load env from the server folder explicitly so cwd doesn't matter
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('[startup] USE_MOCK_DB:', process.env.USE_MOCK_DB, 'USE_FILE_DB:', process.env.USE_FILE_DB);
console.log('[startup] Node', process.version, 'PID', process.pid);

process.on('uncaughtException', (err) => {
  console.error('[fatal] uncaughtException:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[fatal] unhandledRejection:', reason);
});

// Quick DB connectivity probe (non-fatal)
(async () => {
  if (process.env.USE_MOCK_DB === 'true' || process.env.USE_FILE_DB === 'true') {
    console.log('[startup] Skipping Postgres probe (mock/file DB in use)');
    return;
  }
  try {
    const c = await pool.connect();
    await c.query('SELECT 1');
    c.release();
    console.log('[startup] Postgres connection OK');
    // Ensure schema before seeding or serving requests
    await migrate();
    await autoSeedOnEmpty();
  } catch (e) {
    console.error('[startup] Postgres probe failed:', (e as any).message || e);
  }
})();

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '127.0.0.1';
const server = app.listen(PORT, HOST, () => {
  console.log(`[startup] Server listening on http://${HOST}:${PORT}`);
  const ifaces = Object.values(os.networkInterfaces()).flat().filter(Boolean).map(i => `${i?.address}/${i?.family}`);
  console.log('[startup] Local interfaces:', ifaces.join(', '));
});

// Helpful when diagnosing binding issues
setTimeout(() => {
  try {
    const addr = server.address();
    console.log('[startup] server.address():', addr);
  } catch {}
}, 1000);
