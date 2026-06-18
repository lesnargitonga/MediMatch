import bcrypt from 'bcrypt';

function pointWKT(lon: number, lat: number) {
  return `POINT(${lon} ${lat})`;
}

const adminHash   = bcrypt.hashSync('Admin1234', 10);
const demoHash    = bcrypt.hashSync('Demo1234', 10);
const supplierHash = bcrypt.hashSync('Supply1234', 10);

export const mockDB: any = {
  users: [
    {
      id: 1, role: 'admin',
      email: 'admin@medimatch.test', name: 'Admin User',
      password_hash: adminHash,
      org_name: 'MediMatch HQ', org_type: 'Platform', org_license_id: 'MM-ADMIN',
      org_verified: true, average_rating: 0, total_ratings: 0,
    },
    {
      id: 2, role: 'user',
      email: 'demo@medimatch.test', name: 'Demo User',
      password_hash: demoHash,
      org_name: 'City General Hospital', org_type: 'Hospital', org_license_id: 'CGH-001',
      org_verified: true, average_rating: 4.8, total_ratings: 21,
    },
    {
      id: 3, role: 'user',
      email: 'supplier@medimatch.test', name: 'Supplier User',
      password_hash: supplierHash,
      org_name: 'MedSupply Co.', org_type: 'Supplier', org_license_id: 'MS-007',
      org_verified: false, average_rating: 4.1, total_ratings: 9,
    },
  ],
  listings: [
    {
      id: 1, owner_id: 2,
      title: 'Surgical masks', description: 'Box of 50 — sealed, unused stock',
      quantity: 50, category: 'supplies', is_urgent: false,
      location_wkt: pointWKT(-73.935242, 40.73061),
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 2, owner_id: 3,
      title: 'Ventilator (portable)', description: 'Fully functional, calibrated last month',
      quantity: 2, category: 'equipment', is_urgent: true,
      location_wkt: pointWKT(-73.96, 40.78),
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    {
      id: 3, owner_id: 2,
      title: 'Amoxicillin 500mg', description: '120 capsules, expiry Jan 2027',
      quantity: 120, category: 'medication', is_urgent: false,
      location_wkt: pointWKT(-73.94, 40.72),
      created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
  ],
  matches: [],
  notifications: [],
  messages: [],
  favorites: [],
  ratings: [],
  nextUserId: 4,
  nextListingId: 4,
  nextMatchId: 1,
  nextNotificationId: 1,
  nextMessageId: 1,
};
