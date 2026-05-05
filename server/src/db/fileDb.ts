import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'filedb.json');

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const seed = {
      users: [],
      listings: [],
      matches: [],
      messages: [],
      nextUserId: 1,
      nextListingId: 1,
      nextMatchId: 1,
      nextMessageId: 1
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2));
  }
}

function readData() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeData(data: any) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export const fileDb = {
  getUsers() {
    const d = readData();
    return d.users;
  },
  getCounts() {
    const d = readData();
    return { users: d.users.length, listings: d.listings.length, matches: d.matches.length };
  },
  findUserByEmail(email: string) {
    const d = readData();
    return d.users.find((u: any) => u.email === email);
  },
  findUserById(id: number) {
    const d = readData();
    return d.users.find((u: any) => u.id === id);
  },
  createUser({ email, password, name }: { email: string; password: string; name?: string | null }) {
    const d = readData();
    const hash = bcrypt.hashSync(password, 10);
    const user = { id: d.nextUserId++, email, name: name || null, password_hash: hash };
    d.users.push(user);
    writeData(d);
    return user;
  },
  updateUser({ id, name, password }: { id: number; name?: string | null; password?: string }) {
    const d = readData();
    const idx = d.users.findIndex((u: any) => u.id === id);
    if (idx === -1) return null;
    const cur = d.users[idx];
    const updated = { ...cur };
    if (name !== undefined) updated.name = name || null;
    if (password) updated.password_hash = bcrypt.hashSync(password, 10);
    d.users[idx] = updated;
    writeData(d);
    return updated;
  },
  getListings() {
    const d = readData();
    return d.listings;
  },
  createListing({ owner_id, title, description, quantity, category, lon, lat }: any) {
    const d = readData();
    const l = {
      id: d.nextListingId++,
      owner_id,
      title,
      description: description || null,
      quantity: quantity || 1,
      category: category || 'general',
      location_wkt: `POINT(${lon} ${lat})`,
      created_at: new Date().toISOString()
    };
    d.listings.unshift(l);
    writeData(d);
    return l;
  },
  updateListing({ id, owner_id, title, description, quantity, category }: any) {
    const d = readData();
    const idx = d.listings.findIndex((l: any) => l.id === id && l.owner_id === owner_id);
    if (idx === -1) return null;
    const cur = d.listings[idx];
    const updated = { ...cur };
    if (title !== undefined) updated.title = title;
    if (description !== undefined) updated.description = description;
    if (quantity !== undefined) updated.quantity = quantity;
    if (category !== undefined) updated.category = category;
    d.listings[idx] = updated;
    writeData(d);
    return updated;
  },
  deleteListing({ id, owner_id }: any) {
    const d = readData();
    const before = d.listings.length;
    d.listings = d.listings.filter((l: any) => !(l.id === id && l.owner_id === owner_id));
    const changed = d.listings.length !== before;
    if (changed) writeData(d);
    return changed;
  },
  createMatch({ listing_id, requester_id }: { listing_id: number; requester_id: number }) {
    const d = readData();
    const m = { id: d.nextMatchId++, listing_id, requester_id, status: 'pending', created_at: new Date().toISOString() };
    d.matches.push(m);
    writeData(d);
    return m;
  },
  getMessages(listing_id: number) {
    const d = readData();
    return d.messages.filter((m: any) => m.listing_id === listing_id).slice(-200);
  },
  addMessage({ listing_id, sender_id, text }: { listing_id: number; sender_id: number; text: string }) {
    const d = readData();
    const m = { id: d.nextMessageId++, listing_id, sender_id, text, created_at: new Date().toISOString() };
    d.messages.push(m);
    writeData(d);
    return m;
  }
};
