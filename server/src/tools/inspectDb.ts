import { pool } from '../config/db';
import { fileDb } from '../db/fileDb';
import { mockDB } from '../mock/db';

async function main() {
  const backend = process.env.USE_MOCK_DB === 'true' ? 'mock' : process.env.USE_FILE_DB === 'true' ? 'file' : 'postgres';
  console.log(`Backend: ${backend}`);

  if (backend === 'mock') {
    console.log({ users: mockDB.users.length, listings: mockDB.listings.length, matches: mockDB.matches.length });
    console.log('Sample user:', mockDB.users[0]);
    console.log('Sample listing:', mockDB.listings[0]);
    return;
  }

  if (backend === 'file') {
    console.log(fileDb.getCounts());
    const users = fileDb.getUsers();
    const listings = fileDb.getListings();
    console.log('Sample user:', users[0]);
    console.log('Sample listing:', listings[0]);
    return;
  }

  const client = await pool.connect();
  try {
    const countsQ = `SELECT 
      (SELECT COUNT(*)::int FROM users) AS users,
      (SELECT COUNT(*)::int FROM listings) AS listings,
      (SELECT COUNT(*)::int FROM matches) AS matches`;
    const counts = await client.query(countsQ);
    console.log(counts.rows[0]);

    const user = await client.query('SELECT id, email, name FROM users LIMIT 1');
    const listing = await client.query('SELECT id, title, description, quantity FROM listings LIMIT 1');
    console.log('Sample user:', user.rows[0]);
    console.log('Sample listing:', listing.rows[0]);
  } finally {
    client.release();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
