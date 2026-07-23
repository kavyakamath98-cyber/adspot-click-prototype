// Hardcoded mock data for the AdSpot frontend prototype.

export type ScreenAvailability = "available" | "partial" | "booked";

export interface Screen {
  id: string;
  venue: string;
  venueType:
    | "Residential Lobby"
    | "Elevator"
    | "Clinic"
    | "Cafeteria"
    | "Township"
    | "Cafe";
  city: string;
  pincode: string;
  lat: number;
  lng: number;
  width: number;
  height: number;
  pricePerDay: number;
  availability: ScreenAvailability;
}

export interface Creative {
  id: string;
  name: string;
  type: "image" | "video";
  url: string;
  thumbnail?: string;
  width: number;
  height: number;
  sizeKB: number;
  durationSec?: number;
  uploadedAt: string;
  tags: string[];
  status: "approved" | "rejected" | "pending";
  rejectionReason?: string;
}

export type CampaignStatus =
  | "draft"
  | "pending_approval"
  | "live"
  | "paused"
  | "rejected"
  | "completed"
  | "approved_scheduled";

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  pincode: string;
  radiusKm: number;
  centerLat: number;
  centerLng: number;
  screenIds: string[];
  creativeId: string;
  pendingCreativeId?: string; // creative queued during review while old still live
  startDate: string;
  endDate: string;
  daypartStart?: string;
  daypartEnd?: string;
  totalBudget: number;
  spendToDate: number;
  estimatedImpressions: number;
  rejectionReason?: string;
  createdAt: string;
  fitMode: "contain" | "cover" | "fill";
}

export const REJECTION_REASONS = [
  "Alcohol or tobacco promotion",
  "Explicit or inappropriate content",
  "Poor creative quality",
  "Incorrect dimensions for selected screens",
  "Other",
];

// Approx pincode centers
export const PINCODES: Record<string, { city: string; lat: number; lng: number; label: string }> = {
  "560001": { city: "Bangalore", lat: 12.9762, lng: 77.6033, label: "MG Road, Bangalore" },
  "560034": { city: "Bangalore", lat: 12.9279, lng: 77.6271, label: "Koramangala, Bangalore" },
  "400050": { city: "Mumbai", lat: 19.0596, lng: 72.8295, label: "Bandra West, Mumbai" },
  "400076": { city: "Mumbai", lat: 19.1334, lng: 72.9133, label: "Powai, Mumbai" },
};

// Deterministic screen list ~35 items across the 4 pincodes.
const venueTypes: Screen["venueType"][] = [
  "Residential Lobby",
  "Elevator",
  "Clinic",
  "Cafeteria",
  "Township",
  "Cafe",
];

function mkScreens(): Screen[] {
  const base: Omit<Screen, "id">[] = [];
  const seeds = [
    // Bangalore 560001
    ["Prestige Towers", "560001", 0.008, 0.006, "available"],
    ["Brigade Gateway Elevator", "560001", -0.005, 0.011, "partial"],
    ["Cafe Coffee Day MG Rd", "560001", 0.002, -0.004, "available"],
    ["City Central Clinic", "560001", 0.012, -0.008, "booked"],
    ["Manipal Cafeteria", "560001", -0.010, 0.003, "available"],
    ["UB City Lobby", "560001", 0.004, 0.014, "available"],
    ["Bangalore Club Cafe", "560001", -0.015, -0.010, "partial"],
    ["Garuda Mall Lobby", "560001", 0.020, 0.005, "available"],
    // Bangalore 560034 Koramangala
    ["Sobha Sapphire Lobby", "560034", 0.006, 0.010, "available"],
    ["Forum Mall Elevator", "560034", -0.007, 0.004, "partial"],
    ["Third Wave Coffee KRM", "560034", 0.003, -0.008, "available"],
    ["Cloudnine Clinic", "560034", 0.015, 0.012, "available"],
    ["Diamond District Cafeteria", "560034", -0.011, -0.005, "booked"],
    ["Purva Riviera Township", "560034", 0.018, -0.014, "available"],
    ["Jyoti Nivas Lobby", "560034", -0.020, 0.008, "available"],
    ["80 Ft Rd Cafe", "560034", 0.009, 0.020, "partial"],
    ["Koramangala Blocks Lobby", "560034", -0.004, -0.016, "available"],
    // Mumbai Bandra 400050
    ["Pali Hill Residences", "400050", 0.005, 0.008, "available"],
    ["Bandstand Elevator", "400050", -0.008, -0.004, "partial"],
    ["Linking Rd Cafe", "400050", 0.011, 0.002, "available"],
    ["Lilavati Clinic Lobby", "400050", 0.003, 0.014, "available"],
    ["Rizvi Cafeteria", "400050", -0.012, 0.010, "booked"],
    ["Bandra Township Sq", "400050", 0.017, -0.006, "available"],
    ["Waterfield Rd Lobby", "400050", -0.006, 0.018, "available"],
    ["Turner Rd Elevator", "400050", 0.008, -0.012, "partial"],
    // Mumbai Powai 400076
    ["Hiranandani Elevator", "400076", 0.007, 0.005, "available"],
    ["IIT Bombay Cafeteria", "400076", -0.010, 0.011, "available"],
    ["Powai Plaza Lobby", "400076", 0.014, -0.003, "partial"],
    ["Nahar Amrit Shakti Twp", "400076", -0.005, -0.014, "available"],
    ["Galleria Cafe", "400076", 0.019, 0.008, "available"],
    ["Renaissance Elevator", "400076", -0.016, 0.006, "booked"],
    ["Central Avenue Clinic", "400076", 0.004, 0.016, "available"],
    ["Powai Lake Lobby", "400076", 0.011, -0.019, "available"],
    ["Rambaug Township", "400076", -0.013, -0.007, "partial"],
    ["Chandivali Cafe", "400076", 0.006, 0.021, "available"],
  ];
  seeds.forEach((s, i) => {
    const [venue, pin, dLat, dLng, avail] = s as [string, string, number, number, ScreenAvailability];
    const p = PINCODES[pin];
    const portrait = i % 3 === 0;
    const price = 150 + ((i * 37) % 451); // 150-600
    base.push({
      venue,
      venueType: venueTypes[i % venueTypes.length],
      city: p.city,
      pincode: pin,
      lat: p.lat + dLat,
      lng: p.lng + dLng,
      width: portrait ? 1080 : 1920,
      height: portrait ? 1920 : 1080,
      pricePerDay: Math.round(price / 10) * 10,
      availability: avail,
    });
  });
  return base.map((s, i) => ({ ...s, id: `scr_${i + 1}` }));
}

export const SCREENS: Screen[] = mkScreens();

// Sample creative asset URLs (external images/videos - fine for a prototype)
export const INITIAL_CREATIVES: Creative[] = [
  {
    id: "cre_1",
    name: "Diwali Thali Special",
    type: "image",
    url: "https://images.unsplash.com/photo-1567337710282-00832b415979?w=1200",
    width: 1920,
    height: 1080,
    sizeKB: 420,
    uploadedAt: "2026-06-10",
    tags: ["festival", "food"],
    status: "approved",
  },
  {
    id: "cre_2",
    name: "Weekend Biryani Combo",
    type: "image",
    url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1200",
    width: 1080,
    height: 1920,
    sizeKB: 380,
    uploadedAt: "2026-06-18",
    tags: ["weekend", "food"],
    status: "approved",
  },
  {
    id: "cre_3",
    name: "New Menu Reveal (video)",
    type: "video",
    url: "https://cdn.pixabay.com/video/2020/09/08/49375-458698630_large.mp4",
    thumbnail: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200",
    width: 1920,
    height: 1080,
    sizeKB: 3200,
    durationSec: 12,
    uploadedAt: "2026-07-01",
    tags: ["video", "menu"],
    status: "approved",
  },
  {
    id: "cre_4",
    name: "Late-Night Cocktails",
    type: "image",
    url: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1200",
    width: 1920,
    height: 1080,
    sizeKB: 500,
    uploadedAt: "2026-05-20",
    tags: ["drinks", "night"],
    status: "rejected",
    rejectionReason: "Alcohol or tobacco promotion",
  },
];

export const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: "cmp_1",
    name: "Koramangala Weekend Push",
    status: "live",
    pincode: "560034",
    radiusKm: 3,
    centerLat: PINCODES["560034"].lat,
    centerLng: PINCODES["560034"].lng,
    screenIds: ["scr_9", "scr_11", "scr_16"],
    creativeId: "cre_2",
    startDate: "2026-07-15",
    endDate: "2026-07-30",
    totalBudget: 12400,
    spendToDate: 6800,
    estimatedImpressions: 48200,
    createdAt: "2026-07-14",
    fitMode: "cover",
  },
  {
    id: "cmp_2",
    name: "Bandra Diwali Teaser",
    status: "pending_approval",
    pincode: "400050",
    radiusKm: 2,
    centerLat: PINCODES["400050"].lat,
    centerLng: PINCODES["400050"].lng,
    screenIds: ["scr_18", "scr_20"],
    creativeId: "cre_1",
    startDate: "2026-08-01",
    endDate: "2026-08-10",
    totalBudget: 5400,
    spendToDate: 0,
    estimatedImpressions: 0,
    createdAt: "2026-07-20",
    fitMode: "contain",
  },
  {
    id: "cmp_3",
    name: "Powai Lunch Rush",
    status: "draft",
    pincode: "400076",
    radiusKm: 2.5,
    centerLat: PINCODES["400076"].lat,
    centerLng: PINCODES["400076"].lng,
    screenIds: [],
    creativeId: "cre_2",
    startDate: "2026-08-05",
    endDate: "2026-08-15",
    totalBudget: 0,
    spendToDate: 0,
    estimatedImpressions: 0,
    createdAt: "2026-07-21",
    fitMode: "contain",
  },
  {
    id: "cmp_4",
    name: "Late Night Cocktail Promo",
    status: "rejected",
    pincode: "560001",
    radiusKm: 4,
    centerLat: PINCODES["560001"].lat,
    centerLng: PINCODES["560001"].lng,
    screenIds: ["scr_1", "scr_3", "scr_6"],
    creativeId: "cre_4",
    startDate: "2026-07-25",
    endDate: "2026-08-05",
    totalBudget: 8100,
    spendToDate: 0,
    estimatedImpressions: 0,
    rejectionReason: "Alcohol or tobacco promotion",
    createdAt: "2026-07-19",
    fitMode: "cover",
  },
  {
    id: "cmp_5",
    name: "MG Road Grand Opening",
    status: "completed",
    pincode: "560001",
    radiusKm: 3,
    centerLat: PINCODES["560001"].lat,
    centerLng: PINCODES["560001"].lng,
    screenIds: ["scr_1", "scr_2", "scr_5"],
    creativeId: "cre_1",
    startDate: "2026-06-01",
    endDate: "2026-06-14",
    totalBudget: 9800,
    spendToDate: 9800,
    estimatedImpressions: 71500,
    createdAt: "2026-05-28",
    fitMode: "cover",
  },
];

// Haversine distance in km
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const DEMO_ADVERTISER = {
  name: "Ramesh's Kitchen",
  email: "ramesh@rameshkitchen.in",
};
