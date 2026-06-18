import bcrypt from 'bcrypt';

function pointWKT(lon: number, lat: number) {
  return `POINT(${lon} ${lat})`;
}

const passwordPlain = 'Password123';
const passwordHash = bcrypt.hashSync(passwordPlain, 10);

export const mockDB: any = {
  users: [
    { id: 1, email: 'test@example.com', name: 'Test User', password_hash: passwordHash, role: 'user', org_name: 'General Hospital', org_type: 'Hospital', org_license_id: 'GH-001', org_verified: true, average_rating: 4.5, total_ratings: 12 }
  ],
  listings: [
    { id: 1, owner_id: 1, title: 'Surgical masks', description: 'Box of 50', quantity: 50, category: 'supplies', is_urgent: false, location_wkt: pointWKT(-73.935242, 40.73061), created_at: new Date().toISOString() }
  ],
  matches: [],
  nextUserId: 2,
  nextListingId: 2,
  nextMatchId: 1
};
