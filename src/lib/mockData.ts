// Hardcoded mock data for the Additv frontend prototype.

export type ScreenAvailability = "available" | "partial" | "booked";
export type LocationTag =
  | "Residential"
  | "Clinic"
  | "Mall"
  | "Cafeteria"
  | "Township"
  | "Other";

export const LOCATION_TAGS: LocationTag[] = [
  "Residential",
  "Clinic",
  "Mall",
  "Cafeteria",
  "Township",
  "Other",
];

export const INDUSTRIES = [
  "Restaurant",
  "Clinic/Healthcare",
  "Retail",
  "Salon/Beauty",
  "Gym/Fitness",
  "Education",
  "Real Estate",
  "Insurance",
  "Other",
] as const;
export type Industry = (typeof INDUSTRIES)[number];

/** Fixed standard DOOH day-part slots. */
export interface Daypart {
  id: string;
  label: string;
}
export const DAYPARTS: Daypart[] = [
  { id: "dp1", label: "6:00–9:00 AM" },
  { id: "dp2", label: "9:00 AM–12:00 PM" },
  { id: "dp3", label: "12:00–4:00 PM" },
  { id: "dp4", label: "4:00–8:00 PM" },
  { id: "dp5", label: "8:00–11:00 PM" },
];
export const ALL_DAYPART_IDS = DAYPARTS.map((d) => d.id);

export interface ScreenBooking {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD inclusive
  slots: string[]; // booked daypart ids
}

export const CONTENT_TAGS = ["General/Info", "Alcohol", "Sensitive", "Adult"] as const;
export type ContentTag = (typeof CONTENT_TAGS)[number];

export interface Screen {
  id: string;
  venue: string;
  venueType:
    | "Residential Lobby"
    | "Elevator"
    | "Clinic"
    | "Cafeteria"
    | "Township"
    | "Cafe"
    | "Mall";
  locationTag: LocationTag;
  city: string;
  pincode: string;
  lat: number;
  lng: number;
  width: number;
  height: number;
  pricePerDay: number;
  bookings: ScreenBooking[];
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
  industry?: Industry;
  contentTag?: ContentTag;
  status: "approved" | "rejected" | "pending";
  rejectionReason?: string;
  // true if this creative has ever cleared review — enables it to reuse without
  // the 48-hour review buffer on start date.
  previouslyApproved?: boolean;
}


export type CampaignStatus =
  | "draft"
  | "pending_approval"
  | "live"
  | "paused"
  | "rejected"
  | "completed"
  | "approved_scheduled";

export type Recurrence =
  | "none"
  | "weekdays"
  | "weekends"
  | "weekly"
  | "monthly";

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  pincode: string;
  radiusKm: number;
  centerLat: number;
  centerLng: number;
  locationLabel?: string;
  screenIds: string[];
  creativeId: string;
  pendingCreativeId?: string;
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
  playSec?: number;
  recurrence?: Recurrence;
  recurrenceDays?: number[]; // 0-6 (Sun-Sat) for weekly
  daysOfWeek?: number[]; // 0-6 (Sun-Sat) — days the ad runs
  dayparts?: string[]; // daypart ids the ad runs in

  pausedAt?: string;
  totalPausedDays?: number;
  lastStep?: number;
}

export const REJECTION_REASONS = [
  "Alcohol or tobacco promotion",
  "Explicit or inappropriate content",
  "Poor creative quality",
  "Incorrect dimensions for selected screens",
  "Other",
];

// Approx pincode centers
export const PINCODES: Record<
  string,
  { city: string; lat: number; lng: number; label: string }
> = {
  "560001": { city: "Bangalore", lat: 12.9762, lng: 77.6033, label: "MG Road, Bangalore" },
  "560034": { city: "Bangalore", lat: 12.9279, lng: 77.6271, label: "Koramangala, Bangalore" },
  "560038": { city: "Bangalore", lat: 12.9784, lng: 77.6408, label: "Indiranagar, Bangalore" },
  "560095": { city: "Bangalore", lat: 12.9352, lng: 77.6245, label: "HSR Layout, Bangalore" },
  "400050": { city: "Mumbai", lat: 19.0596, lng: 72.8295, label: "Bandra West, Mumbai" },
  "400076": { city: "Mumbai", lat: 19.1334, lng: 72.9133, label: "Powai, Mumbai" },
  "400053": { city: "Mumbai", lat: 19.1197, lng: 72.8468, label: "Andheri West, Mumbai" },
};

// Preset location search suggestions (mock Google-Maps-style suggestions)
export const LOCATION_SUGGESTIONS: {
  label: string;
  pincode: string;
  city: string;
  lat: number;
  lng: number;
}[] = Object.entries(PINCODES).map(([pin, v]) => ({
  label: v.label,
  pincode: pin,
  city: v.city,
  lat: v.lat,
  lng: v.lng,
}));

const tagFromVenueType = (v: Screen["venueType"]): LocationTag => {
  switch (v) {
    case "Residential Lobby":
    case "Elevator":
      return "Residential";
    case "Clinic":
      return "Clinic";
    case "Cafeteria":
      return "Cafeteria";
    case "Township":
      return "Township";
    case "Mall":
      return "Mall";
    case "Cafe":
    default:
      return "Other";
  }
};

const venueTypes: Screen["venueType"][] = [
  "Residential Lobby",
  "Elevator",
  "Clinic",
  "Cafeteria",
  "Township",
  "Cafe",
  "Mall",
];

/* ---------- Date + availability helpers ---------- */

export function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}
export function addDaysISO(iso: string, n: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
/** Inclusive list of YYYY-MM-DD days between start and end. */
export function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  if (!start || !end || end < start) return out;
  let cur = start;
  let guard = 0;
  while (cur <= end && guard < 400) {
    out.push(cur);
    cur = addDaysISO(cur, 1);
    guard++;
  }
  return out;
}
export function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** Deterministic mock bookings (0–3) per screen, seeded by index. */
function mkBookings(i: number): ScreenBooking[] {
  const today = toISO(new Date());
  const out: ScreenBooking[] = [];
  // Every 9th screen is a long-running full-day takeover -> fully booked example.
  if (i % 9 === 4) {
    out.push({ start: today, end: addDaysISO(today, 60), slots: [...ALL_DAYPART_IDS] });
    return out;
  }
  const count = i % 4; // 0..3
  for (let b = 0; b < count; b++) {
    const offset = (i * 7 + b * 13) % 26;
    const len = 2 + ((i + b * 3) % 6);
    const start = addDaysISO(today, offset);
    const end = addDaysISO(start, len - 1);
    const fullDay = (i + b) % 3 === 0;
    const slots = fullDay
      ? [...ALL_DAYPART_IDS]
      : ALL_DAYPART_IDS.filter((_, si) => (si + i + b) % 2 === 0);
    out.push({ start, end, slots: slots.length ? slots : [ALL_DAYPART_IDS[0]] });
  }
  return out;
}

/** Booked daypart ids on a given day for a screen. */
export function bookedSlotsOn(screen: Screen, day: string): Set<string> {
  const set = new Set<string>();
  for (const b of screen.bookings) {
    if (day >= b.start && day <= b.end) b.slots.forEach((s) => set.add(s));
  }
  return set;
}

/** A day counts as blocked when every requested daypart is already booked. */
function dayBlocked(screen: Screen, day: string, slots: string[]) {
  const booked = bookedSlotsOn(screen, day);
  const wanted = slots.length ? slots : ALL_DAYPART_IDS;
  return wanted.every((s) => booked.has(s));
}

export type ScreenStatus = "available" | "partial" | "booked";

/** Screen availability for a date range (optionally limited to weekdays + dayparts). */
export function screenAvailability(
  screen: Screen,
  start?: string,
  end?: string,
  daysOfWeek: number[] = [0, 1, 2, 3, 4, 5, 6],
  slots: string[] = ALL_DAYPART_IDS,
): ScreenStatus {
  if (!start || !end) return "available";
  const all = daysBetween(start, end).filter((d) => daysOfWeek.includes(new Date(d).getDay()));
  if (all.length === 0) return "available";
  const blocked = all.filter((d) => dayBlocked(screen, d, slots));
  if (blocked.length === 0) return "available";
  if (blocked.length === all.length) return "booked";
  return "partial";
}

/** Bookings that overlap the given range, for the info popover. */
export function conflictingBookings(screen: Screen, start?: string, end?: string) {
  if (!start || !end) return [];
  return screen.bookings.filter((b) => b.start <= end && b.end >= start);
}

/** Does this screen have the given daypart free on at least one day in range? */
export function slotFreeSomewhere(
  screen: Screen,
  slot: string,
  start?: string,
  end?: string,
  daysOfWeek: number[] = [0, 1, 2, 3, 4, 5, 6],
) {
  if (!start || !end) return true;
  const all = daysBetween(start, end).filter((d) => daysOfWeek.includes(new Date(d).getDay()));
  if (all.length === 0) return true;
  return all.some((d) => !bookedSlotsOn(screen, d).has(slot));
}

/**
 * Of the campaign-wide chosen slots, which ones this screen can actually honor
 * in the selected date range. `allDays` = free on every applicable day.
 */
export function freeChosenSlots(
  screen: Screen,
  chosenSlots: string[],
  start?: string,
  end?: string,
  daysOfWeek: number[] = [0, 1, 2, 3, 4, 5, 6],
): { id: string; label: string; allDays: boolean }[] {
  const wanted = chosenSlots.length ? chosenSlots : ALL_DAYPART_IDS;
  const labelOf = (id: string) => DAYPARTS.find((d) => d.id === id)?.label ?? id;
  if (!start || !end) return wanted.map((id) => ({ id, label: labelOf(id), allDays: true }));
  const all = daysBetween(start, end).filter((d) => daysOfWeek.includes(new Date(d).getDay()));
  if (all.length === 0) return wanted.map((id) => ({ id, label: labelOf(id), allDays: true }));
  const out: { id: string; label: string; allDays: boolean }[] = [];
  for (const id of wanted) {
    const freeDays = all.filter((d) => !bookedSlotsOn(screen, d).has(id)).length;
    if (freeDays > 0) out.push({ id, label: labelOf(id), allDays: freeDays === all.length });
  }
  return out;
}

export type SlotAvailability = {
  id: string;
  label: string;
  /** Dates (ISO) in the user's schedule where this slot is free on this screen. */
  freeDates: string[];
  /** Dates (ISO) in the user's schedule where this slot is already taken. */
  bookedDates: string[];
  totalDates: number;
};

/**
 * Per-slot, per-date breakdown of what the user can actually book on a screen,
 * limited to the slots/days/dates they chose on the Schedule step.
 */
export function slotAvailabilityBreakdown(
  screen: Screen,
  chosenSlots: string[],
  start?: string,
  end?: string,
  daysOfWeek: number[] = [0, 1, 2, 3, 4, 5, 6],
): { slots: SlotAvailability[]; dates: string[] } {
  const wanted = chosenSlots.length ? chosenSlots : ALL_DAYPART_IDS;
  const labelOf = (id: string) => DAYPARTS.find((d) => d.id === id)?.label ?? id;
  const dates =
    start && end
      ? daysBetween(start, end).filter((d) => daysOfWeek.includes(new Date(d).getDay()))
      : [];
  const slots = wanted.map((id) => {
    const freeDates = dates.filter((d) => !bookedSlotsOn(screen, d).has(id));
    const bookedDates = dates.filter((d) => bookedSlotsOn(screen, d).has(id));
    return { id, label: labelOf(id), freeDates, bookedDates, totalDates: dates.length };
  });
  return { slots, dates };
}



function mkScreens(): Screen[] {
  const base: Omit<Screen, "id" | "locationTag">[] = [];
  const seeds: [string, string, number, number, ScreenAvailability][] = [
    // Bangalore 560001
    ["Prestige Towers", "560001", 0.008, 0.006, "available"],
    ["Brigade Gateway Elevator", "560001", -0.005, 0.011, "partial"],
    ["Cafe Coffee Day MG Rd", "560001", 0.002, -0.004, "available"],
    ["City Central Clinic", "560001", 0.012, -0.008, "booked"],
    ["Manipal Cafeteria", "560001", -0.01, 0.003, "available"],
    ["UB City Lobby", "560001", 0.004, 0.014, "available"],
    ["Bangalore Club Cafe", "560001", -0.015, -0.01, "partial"],
    ["Garuda Mall", "560001", 0.02, 0.005, "available"],
    ["Phoenix Marketcity MG", "560001", 0.006, -0.012, "available"],
    // Bangalore 560034 Koramangala
    ["Sobha Sapphire Lobby", "560034", 0.006, 0.01, "available"],
    ["Forum Mall Koramangala", "560034", -0.007, 0.004, "partial"],
    ["Third Wave Coffee KRM", "560034", 0.003, -0.008, "available"],
    ["Cloudnine Clinic", "560034", 0.015, 0.012, "available"],
    ["Diamond District Cafeteria", "560034", -0.011, -0.005, "booked"],
    ["Purva Riviera Township", "560034", 0.018, -0.014, "available"],
    ["Jyoti Nivas Lobby", "560034", -0.02, 0.008, "available"],
    ["80 Ft Rd Cafe", "560034", 0.009, 0.02, "partial"],
    ["Koramangala Blocks Lobby", "560034", -0.004, -0.016, "available"],
    ["Sony Signal Elevator", "560034", 0.011, -0.006, "available"],
    // Bangalore 560038 Indiranagar
    ["100ft Rd Lobby", "560038", 0.004, 0.006, "available"],
    ["Indiranagar Metro Cafe", "560038", -0.006, 0.008, "available"],
    ["ESI Clinic Indiranagar", "560038", 0.012, -0.005, "partial"],
    ["1MG Lido Mall", "560038", -0.011, 0.014, "available"],
    ["12th Main Cafeteria", "560038", 0.017, 0.009, "available"],
    // Bangalore 560095 HSR
    ["HSR Township Sq", "560095", 0.005, 0.007, "available"],
    ["HSR Clinic Hub", "560095", -0.008, 0.011, "partial"],
    ["Central Silk Board Mall", "560095", 0.014, -0.004, "available"],
    // Mumbai Bandra 400050
    ["Pali Hill Residences", "400050", 0.005, 0.008, "available"],
    ["Bandstand Elevator", "400050", -0.008, -0.004, "partial"],
    ["Linking Rd Cafe", "400050", 0.011, 0.002, "available"],
    ["Lilavati Clinic Lobby", "400050", 0.003, 0.014, "available"],
    ["Rizvi Cafeteria", "400050", -0.012, 0.01, "booked"],
    ["Bandra Township Sq", "400050", 0.017, -0.006, "available"],
    ["Waterfield Rd Lobby", "400050", -0.006, 0.018, "available"],
    ["Turner Rd Elevator", "400050", 0.008, -0.012, "partial"],
    ["Palladium Mall Bandra", "400050", 0.013, 0.005, "available"],
    // Mumbai Powai 400076
    ["Hiranandani Elevator", "400076", 0.007, 0.005, "available"],
    ["IIT Bombay Cafeteria", "400076", -0.01, 0.011, "available"],
    ["Powai Plaza Lobby", "400076", 0.014, -0.003, "partial"],
    ["Nahar Amrit Shakti Twp", "400076", -0.005, -0.014, "available"],
    ["Galleria Cafe", "400076", 0.019, 0.008, "available"],
    ["Renaissance Elevator", "400076", -0.016, 0.006, "booked"],
    ["Central Avenue Clinic", "400076", 0.004, 0.016, "available"],
    ["Powai Lake Lobby", "400076", 0.011, -0.019, "available"],
    ["Rambaug Township", "400076", -0.013, -0.007, "partial"],
    ["Chandivali Cafe", "400076", 0.006, 0.021, "available"],
    ["R City Mall Powai", "400076", 0.009, 0.013, "available"],
    // Mumbai Andheri 400053
    ["Andheri Lokhandwala Lobby", "400053", 0.006, 0.005, "available"],
    ["Infinity Mall Andheri", "400053", -0.007, 0.009, "available"],
    ["Kokilaben Clinic", "400053", 0.013, -0.004, "partial"],
    ["Yari Rd Cafeteria", "400053", -0.011, 0.011, "available"],
    ["Versova Township", "400053", 0.016, 0.007, "available"],
  ];
  seeds.forEach((s, i) => {
    const [venue, pin, dLat, dLng] = s;
    const p = PINCODES[pin];
    const preset = DIMENSION_PRESETS[i % DIMENSION_PRESETS.length];
    const price = 150 + ((i * 37) % 451);
    let vt: Screen["venueType"] = venueTypes[i % venueTypes.length];
    // Force Mall venueType when venue name contains "Mall"
    if (/mall|marketcity|palladium|galleria/i.test(venue)) vt = "Mall";
    else if (/clinic/i.test(venue)) vt = "Clinic";
    else if (/cafeteria/i.test(venue)) vt = "Cafeteria";
    else if (/elevator/i.test(venue)) vt = "Elevator";
    else if (/township/i.test(venue)) vt = "Township";
    else if (/cafe/i.test(venue)) vt = "Cafe";
    else if (/lobby|residenc|prestige|sobha|hiranandani|jyoti|pali/i.test(venue))
      vt = "Residential Lobby";
    base.push({
      venue,
      venueType: vt,
      city: p.city,
      pincode: pin,
      lat: p.lat + dLat,
      lng: p.lng + dLng,
      width: preset.width,
      height: preset.height,
      pricePerDay: Math.round(price / 10) * 10,
      bookings: mkBookings(i),
    });
  });

  return base.map((s, i) => ({
    ...s,
    id: `scr_${i + 1}`,
    locationTag: tagFromVenueType(s.venueType),
  }));
}

// Standard screen dimension presets — all screens use one of these five.
export interface DimensionPreset {
  id: string;
  label: string;
  width: number;
  height: number;
}

export const DIMENSION_PRESETS: DimensionPreset[] = [
  { id: "fhd_land", label: "1920×1080 (Full HD landscape)", width: 1920, height: 1080 },
  { id: "fhd_port", label: "1080×1920 (Full HD portrait)", width: 1080, height: 1920 },
  { id: "hd_land", label: "1280×720 (16:9 landscape)", width: 1280, height: 720 },
  { id: "hd_port", label: "720×1280 (9:16 portrait)", width: 720, height: 1280 },
  { id: "mpu", label: "300×250 (MPU)", width: 300, height: 250 },
];

export const presetIdFor = (w: number, h: number): string => {
  const p = DIMENSION_PRESETS.find((x) => x.width === w && x.height === h);
  return p?.id ?? `${w}x${h}`;
};
export const presetLabelShort = (w: number, h: number): string => `${w}×${h}`;

export const SCREENS: Screen[] = mkScreens();

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
    industry: "Restaurant",
    contentTag: "General/Info",
    status: "approved",
    previouslyApproved: true,
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
    industry: "Restaurant",
    contentTag: "General/Info",
    status: "approved",
    previouslyApproved: true,
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
    industry: "Restaurant",
    contentTag: "General/Info",
    status: "approved",
    previouslyApproved: true,
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
    industry: "Restaurant",
    contentTag: "Alcohol",
    status: "rejected",
    rejectionReason: "Alcohol or tobacco promotion",
  },
  {
    id: "cre_5",
    name: "Kitchen Kickoff (video)",
    type: "video",
    url: "https://cdn.pixabay.com/video/2019/05/22/23759-338617877_large.mp4",
    thumbnail: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=1200",
    width: 1920,
    height: 1080,
    sizeKB: 4100,
    durationSec: 15,
    uploadedAt: "2026-07-05",
    tags: ["video", "grand-opening"],
    industry: "Restaurant",
    contentTag: "General/Info",
    status: "approved",
    previouslyApproved: true,
  },
];

const today2026 = "2026-07-26";

function daysAgo(n: number) {
  const d = new Date(today2026);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function daysAhead(n: number) {
  const d = new Date(today2026);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: "cmp_1",
    name: "Koramangala Weekend Push",
    status: "live",
    pincode: "560034",
    radiusKm: 3,
    centerLat: PINCODES["560034"].lat,
    centerLng: PINCODES["560034"].lng,
    locationLabel: PINCODES["560034"].label,
    screenIds: ["scr_10", "scr_12", "scr_17"],
    creativeId: "cre_2",
    startDate: daysAgo(6),
    endDate: daysAhead(8),
    totalBudget: 12400,
    spendToDate: 6800,
    estimatedImpressions: 48200,
    createdAt: daysAgo(8),
    fitMode: "cover",
    playSec: 5,
    recurrence: "none",
  },
  {
    id: "cmp_2",
    name: "Bandra Diwali Teaser",
    status: "pending_approval",
    pincode: "400050",
    radiusKm: 2,
    centerLat: PINCODES["400050"].lat,
    centerLng: PINCODES["400050"].lng,
    locationLabel: PINCODES["400050"].label,
    screenIds: ["scr_28", "scr_30"],
    creativeId: "cre_1",
    startDate: daysAhead(4),
    endDate: daysAhead(14),
    totalBudget: 5400,
    spendToDate: 0,
    estimatedImpressions: 0,
    createdAt: daysAgo(2),
    fitMode: "contain",
    playSec: 5,
  },
  {
    id: "cmp_3",
    name: "Powai Lunch Rush",
    status: "draft",
    pincode: "400076",
    radiusKm: 2.5,
    centerLat: PINCODES["400076"].lat,
    centerLng: PINCODES["400076"].lng,
    locationLabel: PINCODES["400076"].label,
    screenIds: [],
    creativeId: "cre_2",
    startDate: daysAhead(6),
    endDate: daysAhead(16),
    totalBudget: 0,
    spendToDate: 0,
    estimatedImpressions: 0,
    createdAt: daysAgo(1),
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
    locationLabel: PINCODES["560001"].label,
    screenIds: ["scr_1", "scr_3", "scr_6"],
    creativeId: "cre_4",
    startDate: daysAgo(1),
    endDate: daysAhead(10),
    totalBudget: 8100,
    spendToDate: 0,
    estimatedImpressions: 0,
    rejectionReason: "Alcohol or tobacco promotion",
    createdAt: daysAgo(4),
    fitMode: "cover",
  },
  {
    id: "cmp_5",
    name: "MG Road Grand Opening (video)",
    status: "live",
    pincode: "560001",
    radiusKm: 3,
    centerLat: PINCODES["560001"].lat,
    centerLng: PINCODES["560001"].lng,
    locationLabel: PINCODES["560001"].label,
    screenIds: ["scr_1", "scr_2", "scr_5", "scr_8"],
    creativeId: "cre_3",
    startDate: daysAgo(3),
    endDate: daysAhead(11),
    totalBudget: 14800,
    spendToDate: 3200,
    estimatedImpressions: 21500,
    createdAt: daysAgo(5),
    fitMode: "cover",
    playSec: 10,
    recurrence: "weekdays",
  },
  {
    id: "cmp_6",
    name: "Indiranagar Sunday Brunch",
    status: "live",
    pincode: "560038",
    radiusKm: 2,
    centerLat: PINCODES["560038"].lat,
    centerLng: PINCODES["560038"].lng,
    locationLabel: PINCODES["560038"].label,
    screenIds: ["scr_20", "scr_21", "scr_23"],
    creativeId: "cre_1",
    startDate: daysAgo(4),
    endDate: daysAhead(6),
    totalBudget: 7200,
    spendToDate: 2900,
    estimatedImpressions: 18100,
    createdAt: daysAgo(6),
    fitMode: "cover",
    playSec: 6,
    recurrence: "weekends",
  },
  {
    id: "cmp_7",
    name: "HSR Layout Family Combo",
    status: "approved_scheduled",
    pincode: "560095",
    radiusKm: 3,
    centerLat: PINCODES["560095"].lat,
    centerLng: PINCODES["560095"].lng,
    locationLabel: PINCODES["560095"].label,
    screenIds: ["scr_25", "scr_27"],
    creativeId: "cre_2",
    startDate: daysAhead(3),
    endDate: daysAhead(13),
    totalBudget: 6100,
    spendToDate: 0,
    estimatedImpressions: 0,
    createdAt: daysAgo(1),
    fitMode: "contain",
    playSec: 5,
  },
  {
    id: "cmp_8",
    name: "Powai Weekday Lunch",
    status: "paused",
    pincode: "400076",
    radiusKm: 2,
    centerLat: PINCODES["400076"].lat,
    centerLng: PINCODES["400076"].lng,
    locationLabel: PINCODES["400076"].label,
    screenIds: ["scr_37", "scr_38", "scr_46"],
    creativeId: "cre_2",
    startDate: daysAgo(7),
    endDate: daysAhead(4),
    totalBudget: 9200,
    spendToDate: 4300,
    estimatedImpressions: 24800,
    createdAt: daysAgo(9),
    fitMode: "cover",
    playSec: 5,
    pausedAt: daysAgo(1),
    totalPausedDays: 0,
  },
  {
    id: "cmp_9",
    name: "Andheri Salon Launch",
    status: "completed",
    pincode: "400053",
    radiusKm: 2,
    centerLat: PINCODES["400053"].lat,
    centerLng: PINCODES["400053"].lng,
    locationLabel: PINCODES["400053"].label,
    screenIds: ["scr_47", "scr_48", "scr_50"],
    creativeId: "cre_1",
    startDate: daysAgo(20),
    endDate: daysAgo(6),
    totalBudget: 6800,
    spendToDate: 6800,
    estimatedImpressions: 52000,
    createdAt: daysAgo(22),
    fitMode: "cover",
    playSec: 5,
  },
  {
    id: "cmp_10",
    name: "Bandra Bakery Promo",
    status: "live",
    pincode: "400050",
    radiusKm: 2.5,
    centerLat: PINCODES["400050"].lat,
    centerLng: PINCODES["400050"].lng,
    locationLabel: PINCODES["400050"].label,
    screenIds: ["scr_28", "scr_31", "scr_36"],
    creativeId: "cre_1",
    startDate: daysAgo(2),
    endDate: daysAhead(9),
    totalBudget: 8400,
    spendToDate: 1500,
    estimatedImpressions: 9800,
    createdAt: daysAgo(3),
    fitMode: "cover",
    playSec: 5,
  },
  {
    id: "cmp_11",
    name: "MG Road Evening Snacks",
    status: "draft",
    pincode: "560001",
    radiusKm: 2,
    centerLat: PINCODES["560001"].lat,
    centerLng: PINCODES["560001"].lng,
    locationLabel: PINCODES["560001"].label,
    screenIds: [],
    creativeId: "cre_1",
    startDate: daysAhead(2),
    endDate: daysAhead(9),
    totalBudget: 0,
    spendToDate: 0,
    estimatedImpressions: 0,
    createdAt: daysAgo(1),
    fitMode: "contain",
  },
  {
    id: "cmp_12",
    name: "Koramangala Late Night",
    status: "rejected",
    pincode: "560034",
    radiusKm: 3,
    centerLat: PINCODES["560034"].lat,
    centerLng: PINCODES["560034"].lng,
    locationLabel: PINCODES["560034"].label,
    screenIds: ["scr_10", "scr_11"],
    creativeId: "cre_4",
    startDate: daysAhead(2),
    endDate: daysAhead(12),
    totalBudget: 7200,
    spendToDate: 0,
    estimatedImpressions: 0,
    rejectionReason: "Alcohol or tobacco promotion",
    createdAt: daysAgo(3),
    fitMode: "cover",
  },
  {
    id: "cmp_13",
    name: "HSR Monthly Newsletter",
    status: "live",
    pincode: "560095",
    radiusKm: 2.5,
    centerLat: PINCODES["560095"].lat,
    centerLng: PINCODES["560095"].lng,
    locationLabel: PINCODES["560095"].label,
    screenIds: ["scr_25", "scr_27"],
    creativeId: "cre_2",
    startDate: daysAgo(5),
    endDate: daysAhead(9),
    totalBudget: 5600,
    spendToDate: 2100,
    estimatedImpressions: 12400,
    createdAt: daysAgo(6),
    fitMode: "cover",
    playSec: 5,
    recurrence: "monthly",
  },
  {
    id: "cmp_14",
    name: "Indiranagar Weekend Vibes (video)",
    status: "live",
    pincode: "560038",
    radiusKm: 2,
    centerLat: PINCODES["560038"].lat,
    centerLng: PINCODES["560038"].lng,
    locationLabel: PINCODES["560038"].label,
    screenIds: ["scr_20", "scr_23"],
    creativeId: "cre_5",
    startDate: daysAgo(1),
    endDate: daysAhead(13),
    totalBudget: 9100,
    spendToDate: 700,
    estimatedImpressions: 4200,
    createdAt: daysAgo(2),
    fitMode: "cover",
    playSec: 12,
    recurrence: "weekends",
  },
  {
    id: "cmp_15",
    name: "Andheri Metro Rush",
    status: "approved_scheduled",
    pincode: "400053",
    radiusKm: 2,
    centerLat: PINCODES["400053"].lat,
    centerLng: PINCODES["400053"].lng,
    locationLabel: PINCODES["400053"].label,
    screenIds: ["scr_47", "scr_51"],
    creativeId: "cre_1",
    startDate: daysAhead(5),
    endDate: daysAhead(15),
    totalBudget: 5900,
    spendToDate: 0,
    estimatedImpressions: 0,
    createdAt: daysAgo(1),
    fitMode: "cover",
    playSec: 5,
  },
  {
    id: "cmp_16",
    name: "Powai Family Weekend",
    status: "pending_approval",
    pincode: "400076",
    radiusKm: 3,
    centerLat: PINCODES["400076"].lat,
    centerLng: PINCODES["400076"].lng,
    locationLabel: PINCODES["400076"].label,
    screenIds: ["scr_38", "scr_46"],
    creativeId: "cre_2",
    startDate: daysAhead(3),
    endDate: daysAhead(10),
    totalBudget: 4800,
    spendToDate: 0,
    estimatedImpressions: 0,
    createdAt: daysAgo(0),
    fitMode: "cover",
    playSec: 5,
  },
  {
    id: "cmp_17",
    name: "MG Road Monsoon Launch",
    status: "completed",
    pincode: "560001",
    radiusKm: 3,
    centerLat: PINCODES["560001"].lat,
    centerLng: PINCODES["560001"].lng,
    locationLabel: PINCODES["560001"].label,
    screenIds: ["scr_1", "scr_5"],
    creativeId: "cre_1",
    startDate: daysAgo(30),
    endDate: daysAgo(15),
    totalBudget: 8200,
    spendToDate: 8200,
    estimatedImpressions: 44100,
    createdAt: daysAgo(32),
    fitMode: "cover",
    playSec: 5,
  },
  {
    id: "cmp_18",
    name: "Bandra Fitness Week",
    status: "live",
    pincode: "400050",
    radiusKm: 2,
    centerLat: PINCODES["400050"].lat,
    centerLng: PINCODES["400050"].lng,
    locationLabel: PINCODES["400050"].label,
    screenIds: ["scr_29", "scr_33"],
    creativeId: "cre_1",
    startDate: daysAgo(3),
    endDate: daysAhead(4),
    totalBudget: 4400,
    spendToDate: 1900,
    estimatedImpressions: 11200,
    createdAt: daysAgo(4),
    fitMode: "cover",
    playSec: 5,
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
