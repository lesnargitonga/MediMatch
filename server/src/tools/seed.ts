import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcrypt';
import { pool } from '../config/db';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const ORG_TYPES = ['Hospital', 'Clinic', 'Pharmacy', 'Dispensary', 'NGO'];
const ORG_NAMES = ['Hope', 'Grace', 'St. Mary', 'City', 'Community', 'Central', 'West', 'East', 'Sunrise', 'Sunset'];
const CATEGORIES = ['medication', 'equipment', 'ppe', 'consumables', 'other'];

function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]) { return arr[rnd(0, arr.length - 1)]; }

// Nairobi-ish bounds
const LAT_MIN = -1.4; const LAT_MAX = -1.1;
const LON_MIN = 36.6; const LON_MAX = 37.1;

async function main() {
  console.log('[seed] RESET + creating users, listings, ratings, messages');
  const pwHash = await bcrypt.hash('password123', 10);
  try {
    // Wipe existing data in a safe order
    await pool.query('DELETE FROM notifications');
    await pool.query('DELETE FROM messages');
    await pool.query('DELETE FROM conversation_participants');
    await pool.query('DELETE FROM conversations');
    await pool.query('DELETE FROM ratings');
    await pool.query('DELETE FROM saved_listings');
    await pool.query('DELETE FROM listings');
    await pool.query('DELETE FROM users WHERE role != $1', ['admin']);

    // Create a compact but rich dataset
    const userIds: number[] = [];
    for (let i = 1; i <= 30; i++) {
      const email = `user${i}@example.com`;
      const name = `User ${i}`;
      const orgType = pick(ORG_TYPES);
      const orgName = `${pick(ORG_NAMES)} ${orgType} ${i}`;
      const license = `LIC-${rnd(10000, 99999)}`;

      const ures = await pool.query(
        `INSERT INTO users (email, password_hash, name, role, org_name, org_type, org_license_id, org_verified, created_at)
         VALUES ($1,$2,$3,'user',$4,$5,$6,true,NOW())
         ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name
         RETURNING id`,
        [email, pwHash, name, orgName, orgType, license]
      );
      const userId = ures.rows[0].id;
      userIds.push(userId);

      const nListings = rnd(0, 3);
      for (let j = 0; j < nListings; j++) {
        const lat = (Math.random() * (LAT_MAX - LAT_MIN) + LAT_MIN).toFixed(6);
        const lon = (Math.random() * (LON_MAX - LON_MIN) + LON_MIN).toFixed(6);
        const category = pick(CATEGORIES);
        const title = `${category} supply ${rnd(1, 100)}`;
        const quantity = rnd(5, 200);
        const isUrgent = Math.random() > 0.8;

        await pool.query(
          `INSERT INTO listings (owner_id, title, description, category, quantity, is_urgent, location, created_at)
           VALUES ($1,$2,$3,$4,$5,$6, geography(ST_SetSRID(ST_MakePoint($7,$8),4326)), NOW())`,
          [userId, title, `Auto-generated listing for ${title}`, category, quantity, isUrgent, lon, lat]
        );
      }
      if (i % 10 === 0) console.log(`[seed] created ~${i} users`);
    }

    // Create ratings: each user rates the next user (cyclic), some with reviews
    for (let i = 0; i < userIds.length; i++) {
      const fromId = userIds[i];
      const toId = userIds[(i + 1) % userIds.length];
      const rating = rnd(3, 5);
      const review = Math.random() > 0.5 ? 'Helpful and responsive.' : null;
      await pool.query(
        `INSERT INTO ratings (from_user_id, to_user_id, listing_id, rating, review_text)
         VALUES ($1,$2,NULL,$3,$4)
         ON CONFLICT (from_user_id, to_user_id, listing_id)
         DO UPDATE SET rating = EXCLUDED.rating, review_text = EXCLUDED.review_text, created_at = NOW()`,
        [fromId, toId, rating, review]
      );
    }
    // Recompute reputation fields
    await pool.query(
      `UPDATE users u SET 
        average_rating = COALESCE(sub.avg, 0),
        total_ratings = COALESCE(sub.cnt, 0)
       FROM (
         SELECT to_user_id AS uid, AVG(rating)::numeric(3,2) AS avg, COUNT(*)::int AS cnt
         FROM ratings GROUP BY to_user_id
       ) sub
       WHERE u.id = sub.uid`
    );

    // Create conversations and messages between adjacent users
    for (let i = 0; i < userIds.length; i += 2) {
      const a = userIds[i];
      const b = userIds[(i + 1) % userIds.length];
      const conv = await pool.query(
        `INSERT INTO conversations (user_a_id, user_b_id)
         VALUES ($1,$2) RETURNING id`,
        [Math.min(a,b), Math.max(a,b)]
      );
      const convId = conv.rows[0].id;
      await pool.query(`INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [convId, a]);
      await pool.query(`INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [convId, b]);
      // A short exchange
      await pool.query(`INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1,$2,$3)`, [convId, a, 'Hi there, I can help with supplies.']);
      await pool.query(`INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1,$2,$3)`, [convId, b, 'Great! Let’s coordinate pickup tomorrow.']);
    }

    console.log('[seed] done');
  } catch (e) {
    console.error('[seed] failed:', e);
  } finally {
    await pool.end();
  }
}

main();
