import bcrypt from 'bcrypt';

// WKT helper — note PostGIS/our parser expects POINT(lon lat) order.
function pointWKT(lon: number, lat: number) {
  return `POINT(${lon} ${lat})`;
}

const adminHash    = bcrypt.hashSync('Admin1234', 10);
const demoHash     = bcrypt.hashSync('Demo1234', 10);
const supplierHash = bcrypt.hashSync('Supply1234', 10);
const legacyTestHash = bcrypt.hashSync('Password123', 10);

/**
 * Real Kenyan health facilities with approximate public coordinates.
 * The redistribution story: well-resourced referral hospitals in the major
 * cities hold surplus stock, while county hospitals in arid / marginalised
 * regions (Turkana, Mandera, Wajir, Marsabit, Garissa, West Pokot, Narok)
 * carry urgent shortages. Geospatial matching moves supply to where it's
 * needed most.
 */
type Facility = {
  id: number;
  name: string;       // org_name (facility)
  contact: string;    // person name
  county: string;
  lat: number;
  lon: number;
  verified: boolean;
  rating: number;
  ratings: number;
  hub: boolean;       // surplus hub (city referral) vs need (county)
};

const FACILITIES: Facility[] = [
  // ---- Surplus hubs (major referral hospitals) ----
  { id: 2,  name: 'Kenyatta National Hospital',                 contact: 'Nairobi Hub Coordinator',       county: 'Nairobi',     lat: -1.3013, lon: 36.8064, verified: true,  rating: 4.9, ratings: 64, hub: true },
  { id: 3,  name: 'Moi Teaching & Referral Hospital',           contact: 'Uasin Gishu Hub Coordinator',   county: 'Uasin Gishu', lat:  0.5143, lon: 35.2698, verified: true,  rating: 4.8, ratings: 47, hub: true },
  { id: 4,  name: 'Coast General Teaching & Referral Hospital', contact: 'Mombasa Hub Coordinator',        county: 'Mombasa',     lat: -4.0506, lon: 39.6669, verified: true,  rating: 4.7, ratings: 38, hub: true },
  { id: 5,  name: 'JOOTRH Kisumu',                              contact: 'Kisumu Hub Coordinator',         county: 'Kisumu',      lat: -0.0917, lon: 34.7680, verified: true,  rating: 4.6, ratings: 33, hub: true },
  { id: 6,  name: 'Nakuru Level 5 Hospital',                    contact: 'Nakuru Hub Coordinator',         county: 'Nakuru',      lat: -0.2916, lon: 36.0664, verified: true,  rating: 4.5, ratings: 29, hub: true },
  { id: 7,  name: 'Nyeri County Referral Hospital',             contact: 'Nyeri Hub Coordinator',          county: 'Nyeri',       lat: -0.4197, lon: 36.9489, verified: true,  rating: 4.4, ratings: 21, hub: true },

  // ---- Need facilities (county / arid-region hospitals) ----
  { id: 8,  name: 'Lodwar County Referral Hospital',            contact: 'Turkana Referral Coordinator',   county: 'Turkana',     lat:  3.1191, lon: 35.5973, verified: true,  rating: 4.2, ratings: 12, hub: false },
  { id: 9,  name: 'Mandera County Referral Hospital',           contact: 'Mandera Referral Coordinator',   county: 'Mandera',     lat:  3.9366, lon: 41.8670, verified: true,  rating: 4.1, ratings: 9,  hub: false },
  { id: 10, name: 'Wajir County Referral Hospital',             contact: 'Wajir Referral Coordinator',     county: 'Wajir',       lat:  1.7471, lon: 40.0573, verified: true,  rating: 4.0, ratings: 8,  hub: false },
  { id: 11, name: 'Marsabit County Referral Hospital',          contact: 'Marsabit Referral Coordinator',  county: 'Marsabit',    lat:  2.3344, lon: 37.9899, verified: true,  rating: 4.0, ratings: 7,  hub: false },
  { id: 12, name: 'Garissa County Referral Hospital',           contact: 'Garissa Referral Coordinator',   county: 'Garissa',     lat: -0.4569, lon: 39.6583, verified: true,  rating: 4.3, ratings: 14, hub: false },
  { id: 13, name: 'Kapenguria County Referral Hospital',        contact: 'West Pokot Referral Coordinator',county: 'West Pokot',  lat:  1.2389, lon: 35.1119, verified: false, rating: 3.9, ratings: 6,  hub: false },
  { id: 14, name: 'Narok County Referral Hospital',             contact: 'Narok Referral Coordinator',     county: 'Narok',       lat: -1.0833, lon: 35.8667, verified: true,  rating: 4.1, ratings: 10, hub: false },
  { id: 15, name: 'Homa Bay County Referral Hospital',          contact: 'Homa Bay Referral Coordinator',  county: 'Homa Bay',    lat: -0.5273, lon: 34.4571, verified: true,  rating: 4.2, ratings: 11, hub: false },
  { id: 16, name: 'Machakos Level 5 Hospital',                  contact: 'Machakos Referral Coordinator',  county: 'Machakos',    lat: -1.5167, lon: 37.2634, verified: true,  rating: 4.3, ratings: 16, hub: false },
  { id: 17, name: 'Malindi Sub-County Hospital',                contact: 'Kilifi Referral Coordinator',    county: 'Kilifi',      lat: -3.2175, lon: 40.1191, verified: false, rating: 3.8, ratings: 5,  hub: false },

  // ---- Nairobi County case study: sub-county facilities served by the KNH referral hub ----
  { id: 19, name: 'Mama Lucy Kimani Hospital',                  contact: 'Embakasi East Coordinator',      county: 'Nairobi',     lat: -1.2841, lon: 36.8990, verified: true,  rating: 4.2, ratings: 13, hub: false },
  { id: 20, name: 'Mbagathi County Hospital',                   contact: 'Dagoretti Coordinator',          county: 'Nairobi',     lat: -1.3108, lon: 36.7957, verified: true,  rating: 4.1, ratings: 11, hub: false },
  { id: 21, name: 'Pumwani Maternity Hospital',                 contact: 'Kamukunji Coordinator',          county: 'Nairobi',     lat: -1.2806, lon: 36.8472, verified: true,  rating: 4.0, ratings: 9,  hub: false },
  { id: 22, name: 'Mathari National Teaching Hospital',         contact: 'Starehe Coordinator',            county: 'Nairobi',     lat: -1.2636, lon: 36.8347, verified: true,  rating: 4.0, ratings: 8,  hub: false },
  { id: 23, name: 'Mutuini Sub-County Hospital',                contact: 'Dagoretti South Coordinator',    county: 'Nairobi',     lat: -1.3047, lon: 36.7361, verified: false, rating: 3.8, ratings: 5,  hub: false },
  { id: 24, name: 'Kayole II Sub-County Hospital',              contact: 'Embakasi Central Coordinator',   county: 'Nairobi',     lat: -1.2742, lon: 36.9135, verified: false, rating: 3.9, ratings: 6,  hub: false },
];

// Demo login accounts map onto real facilities so README credentials still work.
const LOGIN = {
  admin:    { email: 'admin@medimatch.test',    password_hash: adminHash },
  demo:     { email: 'demo@medimatch.test',     password_hash: demoHash },     // -> Kenyatta National (id 2)
  supplier: { email: 'supplier@medimatch.test', password_hash: supplierHash }, // -> JOOTRH Kisumu (id 5)
};

const users: any[] = [
  {
    id: 1, role: 'admin',
    email: 'test@example.com', name: 'MediMatch Coordinator',
    password_hash: legacyTestHash,
    org_name: 'MediMatch National Coordination', org_type: 'Platform', org_license_id: 'MM-ADMIN',
    org_verified: true, average_rating: 0, total_ratings: 0,
    lat: -1.2864, lon: 36.8172,
  },
  {
    id: 18, role: 'admin',
    email: LOGIN.admin.email, name: 'National Demo Coordinator',
    password_hash: LOGIN.admin.password_hash,
    org_name: 'MediMatch National Coordination', org_type: 'Platform', org_license_id: 'MM-CONFERENCE',
    org_verified: true, average_rating: 0, total_ratings: 0,
    lat: -1.2864, lon: 36.8172,
  },
  ...FACILITIES.map((f) => ({
    id: f.id, role: 'user',
    email: f.id === 2 ? LOGIN.demo.email : f.id === 5 ? LOGIN.supplier.email : `facility${f.id}@medimatch.test`,
    name: f.contact,
    password_hash: f.id === 2 ? LOGIN.demo.password_hash : f.id === 5 ? LOGIN.supplier.password_hash : adminHash,
    org_name: f.name, org_type: 'Hospital', org_license_id: `KE-${f.county.slice(0, 3).toUpperCase()}-${f.id}`,
    org_verified: f.verified, average_rating: f.rating, total_ratings: f.ratings,
    county: f.county, lat: f.lat, lon: f.lon,
  })),
];

const byName = (n: string) => FACILITIES.find((f) => f.name === n)!;

function mins(m: number) {
  return new Date(Date.now() - m * 60 * 1000).toISOString();
}

// kind: 'offer' = surplus available; 'request' = urgent need.
// item = normalized supply type — matching pairs like-for-like (insulin to insulin),
// not merely same-category, so a request never sources from an unrelated product.
type Seed = {
  owner: string; title: string; description: string; quantity: number;
  category: 'general' | 'medication' | 'equipment' | 'supplies' | 'other';
  item: string;
  is_urgent: boolean; kind: 'offer' | 'request'; ageMin: number;
};

const SEEDS: Seed[] = [
  // ===== Surplus offers from referral hubs =====
  { owner: 'Kenyatta National Hospital',                 title: 'Oxygen concentrators (10L)',        item: 'oxygen_concentrator', description: 'Surplus from ICU capacity expansion. Serviced, with spare filters.', quantity: 18,  category: 'equipment',  is_urgent: false, kind: 'offer',   ageMin: 180 },
  { owner: 'Kenyatta National Hospital',                 title: 'Insulin (refrigerated)',            item: 'insulin',             description: 'Cold-chain insulin vials, expiry > 8 months.',                       quantity: 240, category: 'medication', is_urgent: false, kind: 'offer',   ageMin: 320 },
  { owner: 'Kenyatta National Hospital',                 title: 'Portable ventilators',              item: 'ventilator',          description: 'Calibrated, last serviced this quarter.',                            quantity: 6,   category: 'equipment',  is_urgent: false, kind: 'offer',   ageMin: 90  },
  { owner: 'Moi Teaching & Referral Hospital',           title: 'Surgical kits (sterile)',           item: 'surgical_kit',        description: 'Disposable surgical kits, sealed.',                                  quantity: 300, category: 'supplies',   is_urgent: false, kind: 'offer',   ageMin: 240 },
  { owner: 'Moi Teaching & Referral Hospital',           title: 'Oxygen concentrators (10L)',        item: 'oxygen_concentrator', description: 'Backup units freed up after plant upgrade.',                         quantity: 9,   category: 'equipment',  is_urgent: false, kind: 'offer',   ageMin: 140 },
  { owner: 'Coast General Teaching & Referral Hospital', title: "IV fluids (Ringer's lactate)",      item: 'iv_fluids',           description: 'Bulk surplus, 500ml bags.',                                          quantity: 800, category: 'supplies',   is_urgent: false, kind: 'offer',   ageMin: 260 },
  { owner: 'Coast General Teaching & Referral Hospital', title: 'Blood bags (O-negative)',           item: 'blood_o_neg',         description: 'Within shelf life, cold-chain maintained.',                          quantity: 60,  category: 'supplies',   is_urgent: false, kind: 'offer',   ageMin: 75  },
  { owner: 'JOOTRH Kisumu',                              title: 'Antimalarials (AL)',                item: 'antimalarial',        description: 'Artemether-Lumefantrine, surplus from seasonal allocation.',         quantity: 500, category: 'medication', is_urgent: false, kind: 'offer',   ageMin: 200 },
  { owner: 'JOOTRH Kisumu',                              title: 'Amoxicillin 500mg',                 item: 'amoxicillin',         description: '120-cap bottles, expiry 2027.',                                      quantity: 350, category: 'medication', is_urgent: false, kind: 'offer',   ageMin: 410 },
  { owner: 'Nakuru Level 5 Hospital',                    title: 'Vaccine cold-chain carriers',       item: 'cold_chain_carrier',  description: 'WHO-PQS carriers with ice packs.',                                   quantity: 40,  category: 'equipment',  is_urgent: false, kind: 'offer',   ageMin: 150 },
  { owner: 'Nakuru Level 5 Hospital',                    title: 'Surgical masks (boxes of 50)',      item: 'surgical_masks',      description: 'Sealed, unused stock.',                                              quantity: 220, category: 'supplies',   is_urgent: false, kind: 'offer',   ageMin: 500 },
  { owner: 'Nyeri County Referral Hospital',             title: 'IV fluids (normal saline)',         item: 'iv_fluids',           description: '500ml bags, surplus stock.',                                         quantity: 400, category: 'supplies',   is_urgent: false, kind: 'offer',   ageMin: 220 },

  // ===== Urgent needs from county / arid-region hospitals =====
  { owner: 'Lodwar County Referral Hospital',            title: 'Oxygen concentrators needed',       item: 'oxygen_concentrator', description: 'Paediatric ward stockout — pneumonia surge.',                        quantity: 6,   category: 'equipment',  is_urgent: true,  kind: 'request', ageMin: 25  },
  { owner: 'Lodwar County Referral Hospital',            title: 'Surgical kits needed',              item: 'surgical_kit',        description: 'Theatre running low ahead of outreach camp.',                        quantity: 80,  category: 'supplies',   is_urgent: true,  kind: 'request', ageMin: 60  },
  { owner: 'Mandera County Referral Hospital',           title: 'Insulin urgently needed',           item: 'insulin',             description: 'Diabetic patients — cold-chain stock depleted.',                     quantity: 120, category: 'medication', is_urgent: true,  kind: 'request', ageMin: 18  },
  { owner: 'Wajir County Referral Hospital',             title: 'Oxygen concentrators needed',       item: 'oxygen_concentrator', description: 'Maternity unit — no functioning units.',                             quantity: 4,   category: 'equipment',  is_urgent: true,  kind: 'request', ageMin: 35  },
  { owner: 'Marsabit County Referral Hospital',          title: 'Portable ventilator needed',        item: 'ventilator',          description: 'Single referral ICU bed without ventilator.',                        quantity: 2,   category: 'equipment',  is_urgent: true,  kind: 'request', ageMin: 45  },
  { owner: 'Garissa County Referral Hospital',           title: 'Blood bags (O-negative) needed',    item: 'blood_o_neg',         description: 'Trauma caseload — bank critically low.',                             quantity: 40,  category: 'supplies',   is_urgent: true,  kind: 'request', ageMin: 22  },
  { owner: 'Garissa County Referral Hospital',           title: 'IV fluids needed',                  item: 'iv_fluids',           description: 'Cholera response — fluids running out.',                             quantity: 300, category: 'supplies',   is_urgent: true,  kind: 'request', ageMin: 70  },
  { owner: 'Kapenguria County Referral Hospital',        title: 'Vaccine cold-chain carriers needed',item: 'cold_chain_carrier',  description: 'Immunisation outreach across West Pokot.',                           quantity: 15,  category: 'equipment',  is_urgent: true,  kind: 'request', ageMin: 90  },
  { owner: 'Narok County Referral Hospital',             title: 'Antimalarials needed',              item: 'antimalarial',        description: 'Malaria spike post-rains.',                                          quantity: 200, category: 'medication', is_urgent: true,  kind: 'request', ageMin: 55  },
  { owner: 'Homa Bay County Referral Hospital',          title: 'Amoxicillin needed',                item: 'amoxicillin',         description: 'Paediatric respiratory infections rising.',                          quantity: 150, category: 'medication', is_urgent: false, kind: 'request', ageMin: 120 },
  { owner: 'Malindi Sub-County Hospital',                title: 'Surgical masks needed',             item: 'surgical_masks',      description: 'Outpatient demand outpacing supply.',                                quantity: 100, category: 'supplies',   is_urgent: false, kind: 'request', ageMin: 160 },
  { owner: 'Machakos Level 5 Hospital',                  title: 'IV fluids (saline) needed',         item: 'iv_fluids',           description: 'Casualty department top-up.',                                        quantity: 120, category: 'supplies',   is_urgent: false, kind: 'request', ageMin: 200 },

  // ===== Nairobi County case study: intra-city needs served by the KNH referral hub =====
  { owner: 'Mama Lucy Kimani Hospital',                  title: 'Oxygen concentrators needed',       item: 'oxygen_concentrator', description: 'Paediatric high-dependency unit — units offline.',                   quantity: 3,   category: 'equipment',  is_urgent: true,  kind: 'request', ageMin: 48  },
  { owner: 'Kayole II Sub-County Hospital',              title: 'Oxygen concentrators needed',       item: 'oxygen_concentrator', description: 'Informal-settlement catchment, respiratory surge.',                  quantity: 2,   category: 'equipment',  is_urgent: true,  kind: 'request', ageMin: 65  },
  { owner: 'Pumwani Maternity Hospital',                 title: 'Oxygen concentrators needed',       item: 'oxygen_concentrator', description: 'Neonatal resuscitation cover.',                                      quantity: 2,   category: 'equipment',  is_urgent: true,  kind: 'request', ageMin: 80  },
  { owner: 'Mathari National Teaching Hospital',         title: 'Insulin urgently needed',           item: 'insulin',             description: 'Inpatient diabetic cohort — cold-chain depleted.',                   quantity: 35,  category: 'medication', is_urgent: true,  kind: 'request', ageMin: 95  },
  { owner: 'Mutuini Sub-County Hospital',                title: 'Insulin needed',                    item: 'insulin',             description: 'Outpatient diabetes clinic top-up.',                                 quantity: 20,  category: 'medication', is_urgent: false, kind: 'request', ageMin: 130 },
  { owner: 'Mbagathi County Hospital',                   title: 'Oxygen concentrators needed',       item: 'oxygen_concentrator', description: 'Adult medical ward — pending maintenance backlog.',                  quantity: 2,   category: 'equipment',  is_urgent: false, kind: 'request', ageMin: 150 },
];

let listingId = 100;
const listings: any[] = SEEDS.map((s) => {
  const f = byName(s.owner);
  return {
    id: listingId++,
    owner_id: f.id,
    title: s.title,
    description: s.description,
    quantity: s.quantity,
    category: s.category,
    item: s.item,
    is_urgent: s.is_urgent,
    kind: s.kind,
    location_wkt: pointWKT(f.lon, f.lat),
    created_at: mins(s.ageMin),
  };
});

export const mockDB: any = {
  users,
  listings,
  matches: [],
  notifications: [],
  messages: [],
  favorites: [],
  ratings: [],
  nextUserId: 100,
  nextListingId: listingId,
  nextMatchId: 1,
  nextNotificationId: 1,
  nextMessageId: 1,
};
