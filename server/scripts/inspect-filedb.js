#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'filedb.json');
if (!fs.existsSync(DATA_FILE)) {
  console.error(`[inspect-filedb] Not found: ${DATA_FILE}`);
  process.exit(1);
}

const raw = fs.readFileSync(DATA_FILE, 'utf8');
const db = JSON.parse(raw);
const { users = [], listings = [], matches = [] } = db;

function sample(arr, n = 3) {
  return arr.slice(0, n);
}

console.log('=== MediMatch File DB ===');
console.log('Path:', DATA_FILE);
console.log('Counts:', { users: users.length, listings: listings.length, matches: matches.length });

console.log('\nUsers (sample):');
console.dir(sample(users).map(u => ({ id: u.id, email: u.email, name: u.name, created_at: u.created_at })), { depth: null });

console.log('\nListings (sample):');
console.dir(sample(listings).map(l => ({ id: l.id, owner_id: l.owner_id, title: l.title, quantity: l.quantity, created_at: l.created_at })), { depth: null });

console.log('\nMatches (sample):');
console.dir(sample(matches).map(m => ({ id: m.id, listing_id: m.listing_id, requester_id: m.requester_id, status: m.status })), { depth: null });
