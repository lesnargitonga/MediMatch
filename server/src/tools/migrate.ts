import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
import { pool } from '../config/db';

export async function migrate() {
  // Ensure PostGIS extension (needed for geography column & distance queries)
  try {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
    console.log('PostGIS extension ensured.');
  } catch (err:any) {
    console.warn('[migrate] Could not create/verify postgis extension (may require superuser); distance features may be disabled:', err?.message || err);
  }

  // Add geography point column for listings if missing (used by matching & distance filters)
  try {
    await pool.query(`ALTER TABLE listings ADD COLUMN IF NOT EXISTS location geography(Point,4326)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_listings_location ON listings USING GIST(location)`);
    console.log('Location column ensured.');
  } catch (err:any) {
    console.warn('[migrate] Could not add/list index location column:', err?.message || err);
  }
  // Add category column if missing and index it
  await pool.query(`ALTER TABLE listings ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general'`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category)`);
  // Add org fields to users for facility info and verification
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS org_name TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS org_type TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS org_license_id TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS org_phone TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS org_address TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS doc_url TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS org_verified BOOLEAN NOT NULL DEFAULT false`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT false`);
  await pool.query(`ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false`);
  await pool.query(`ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN NOT NULL DEFAULT false`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_listings_is_urgent ON listings(is_urgent)`);

  // Chat schema
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      listing_id INTEGER REFERENCES listings(id) ON DELETE SET NULL,
      user_a_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      user_b_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  // Backfill: ensure column exists if table was created earlier without it
  await pool.query(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS listing_id INTEGER REFERENCES listings(id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_a_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_b_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_conversations_listing_id ON conversations(listing_id)`);
  // Enforce uniqueness per listing between same two users (ordering agnostic); treat NULL listing as -1 key
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = ANY(current_schemas(false)) AND indexname = 'unique_conversation_idx'
      ) THEN
        CREATE UNIQUE INDEX unique_conversation_idx
          ON conversations (COALESCE(listing_id, -1), user_a_id, user_b_id);
      END IF;
    END $$;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversation_participants (
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (conversation_id, user_id)
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id, created_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id)`);

  // Populate user_a_id/user_b_id for existing conversations with exactly two participants
  await pool.query(`
    WITH pairs AS (
      SELECT conversation_id,
             MIN(user_id) AS user_a,
             MAX(user_id) AS user_b
      FROM conversation_participants
      GROUP BY conversation_id
      HAVING COUNT(*) = 2
    )
    UPDATE conversations c
    SET user_a_id = p.user_a,
        user_b_id = p.user_b
    FROM pairs p
    WHERE c.id = p.conversation_id AND (c.user_a_id IS NULL OR c.user_b_id IS NULL);
  `);

  // Reputation system schema
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ratings (
      id SERIAL PRIMARY KEY,
      from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      listing_id INTEGER REFERENCES listings(id) ON DELETE SET NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      review_text TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(from_user_id, to_user_id, listing_id)
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_ratings_to_user ON ratings(to_user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_ratings_from_user ON ratings(from_user_id)`);

  // Add reputation fields to users
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2) DEFAULT 0`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0`);

  // Notifications system schema
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('message', 'rating', 'listing_saved', 'system')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      is_read BOOLEAN NOT NULL DEFAULT false,
      related_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      related_listing_id INTEGER REFERENCES listings(id) ON DELETE SET NULL,
      related_message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, created_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read, created_at DESC)`);

  // Saved/favorited listings
  await pool.query(`
    CREATE TABLE IF NOT EXISTS saved_listings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, listing_id)
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_saved_listings_user ON saved_listings(user_id)`);

  console.log('Migration complete.');
}

// If executed directly as a script, run and exit. When imported, just export migrate().
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1); });
}
