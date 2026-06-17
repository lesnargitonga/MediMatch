import bcrypt from 'bcrypt';

function pointWKT(lon: number, lat: number) {
  return `POINT(${lon} ${lat})`;
}

const passwordHash = bcrypt.hashSync('Password123', 10);
const adminHash = bcrypt.hashSync('admin123', 10);

export const mockDB: any = {
  users: [
    { id: 1, email: 'test@example.com', name: 'Test User', password_hash: passwordHash, role: 'user', org_verified: false },
    { id: 2, email: 'lesnar@admin.com', name: 'Lesnar Admin', password_hash: adminHash, role: 'admin', org_verified: true, org_name: 'LesnarAI', org_type: 'Admin' },
  ],
  listings: [
    { id: 1, title: 'Surgical masks', description: 'Box of 50', quantity: 50, location_wkt: pointWKT(-73.935242, 40.73061), created_at: new Date().toISOString() }
  ],
  matches: [],
  nextUserId: 3,
  nextListingId: 2,
  nextMatchId: 1
};
