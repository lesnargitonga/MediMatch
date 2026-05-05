import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
// Load env from server/.env explicitly so CLI tools and dev server work regardless of CWD
// Works for both src (server/src/config -> .. -> server/.env) and dist (server/dist/config -> .. -> server/dist, then .. -> server/.env)
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// Prefer a single DATABASE_URL (e.g., Supabase, Neon, Render). Fallback to discrete vars.
// Enable SSL in cloud by default unless explicitly disabled.
const useUrl = process.env.DATABASE_URL;
const isCloud = /supabase|neon|render|aws|azure|gcp/i.test(useUrl || '') || process.env.DB_SSL === 'true';

function poolFromUrl(urlStr: string) {
  // Parse the URL ourselves to avoid sslmode conflicts and force no-verify in cloud envs
  const u = new URL(urlStr);
  const host = u.hostname;
  const port = u.port ? Number(u.port) : 5432;
  const database = u.pathname.replace(/^\//, '') || undefined;
  const user = decodeURIComponent(u.username || '');
  const password = decodeURIComponent(u.password || '');
  const sslMode = u.searchParams.get('sslmode');
  const wantSsl = isCloud || (sslMode && sslMode !== 'disable');
  return new Pool({
    host,
    port,
    database,
    user,
    password,
    ssl: wantSsl ? { rejectUnauthorized: false } : undefined,
  });
}

export const pool = useUrl
  ? poolFromUrl(useUrl)
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'medimatchdb',
      user: process.env.DB_USER || 'medimatch',
      password: process.env.DB_PASSWORD || 'medimatchpass',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
