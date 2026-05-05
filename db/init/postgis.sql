-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP DEFAULT now()
);

-- listings
CREATE TABLE IF NOT EXISTS listings (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  location GEOGRAPHY(POINT,4326),
  created_at TIMESTAMP DEFAULT now()
);

-- matches
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
  requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_listings_owner ON listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_listings_created ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_listing ON matches(listing_id);
CREATE INDEX IF NOT EXISTS idx_matches_requester ON matches(requester_id);
