/**
 * Single source of truth for the two-level Industry → Sub-Industry taxonomy.
 * Every form, filter, chip and label in the app must read from this file.
 */

export const INDUSTRY_TAXONOMY = {
  FMCG: [
    "Personal Care & Grooming",
    "Home & Household Care",
    "Packaged Foods & Snacks",
    "Non-Alcoholic Beverages",
    "Baby Care",
    "Pet Care",
    "Tobacco",
  ],
  "Food & Beverage (F&B)": [
    "Restaurants & QSR",
    "Cafes & Bakeries",
    "Cloud Kitchens",
    "Food Delivery",
    "Alcoholic Beverages",
    "Catering & Events",
  ],
  "Healthcare & Pharma": [
    "Hospitals & Clinics",
    "Pharmaceuticals & OTC",
    "Diagnostics & Labs",
    "Wellness & Nutrition",
    "Medical Devices",
    "Dental & Eye Care",
  ],
  "Financial Services (BFSI)": [
    "Retail Banking",
    "Insurance",
    "Mutual Funds & Wealth",
    "Lending & NBFC",
    "Payments & Fintech",
    "Stock Broking & Trading",
    "Crypto & Digital Assets",
  ],
  Telecom: [
    "Mobile Network Operators",
    "Broadband & Fibre",
    "DTH & Cable",
    "Telecom Devices & Equipment",
    "Enterprise Connectivity",
  ],
  Automotive: [
    "Passenger Vehicles",
    "Two-Wheelers",
    "Commercial Vehicles",
    "EV & Charging",
    "Auto Components & Accessories",
    "Tyres & Lubricants",
    "Used Cars & Dealerships",
  ],
  "Retail & E-commerce": [
    "Marketplaces",
    "Fashion & Apparel",
    "Consumer Electronics Retail",
    "Grocery & Quick Commerce",
    "Furniture & Home Decor",
    "Jewellery & Watches",
  ],
  "Technology & Software": [
    "SaaS & Enterprise Software",
    "Consumer Apps",
    "Consumer Electronics & Devices",
    "IT Services & Consulting",
    "Cybersecurity",
    "AI & Data",
  ],
  "Media & Entertainment": [
    "Streaming & OTT",
    "Broadcast TV & Radio",
    "Film & Cinema",
    "Music & Audio",
    "Publishing & News",
    "Gaming & eSports",
  ],
  "Travel & Hospitality": [
    "Airlines",
    "Hotels & Resorts",
    "Online Travel Agencies",
    "Tourism Boards",
    "Cruises & Rail",
    "Car Rental & Ride Hailing",
  ],
  "Real Estate & Construction": [
    "Residential Developers",
    "Commercial & Office Space",
    "Property Portals",
    "Building Materials",
    "Interiors & Home Improvement",
    "Co-working & Co-living",
  ],
  Education: [
    "K-12 Schools",
    "Higher Education",
    "Test Prep & Coaching",
    "EdTech & Online Learning",
    "Professional Certification",
    "Preschool & Early Learning",
  ],
  "Beauty & Cosmetics": [
    "Skincare",
    "Makeup & Colour Cosmetics",
    "Haircare",
    "Fragrances",
    "Salons & Spas",
    "Aesthetic Clinics",
  ],
  "Sports & Fitness": [
    "Sports Leagues & Events",
    "Gyms & Fitness Centres",
    "Sportswear & Equipment",
    "Fantasy Sports",
    "Sports Nutrition",
  ],
  "Energy & Utilities": [
    "Oil & Gas",
    "Renewable Energy & Solar",
    "Power & Electricity",
    "Water & Waste Management",
  ],
  "Industrials & Manufacturing": [
    "Heavy Machinery",
    "Chemicals",
    "Metals & Mining",
    "Logistics & Supply Chain",
    "Aerospace & Defence",
    "Packaging",
  ],
  "Professional Services": [
    "Legal",
    "Accounting & Audit",
    "Consulting",
    "HR & Staffing",
    "Advertising & Marketing Agencies",
  ],
  "Government & Public Sector": [
    "Government Schemes",
    "Public Health Campaigns",
    "Civic & Municipal",
    "Defence Recruitment",
    "Political & Election Advertising",
  ],
  "NGO & Social": [
    "Charities & Fundraising",
    "Awareness Campaigns",
    "Religious & Spiritual Organisations",
    "Environmental Causes",
  ],
  Other: ["Other"],
} as const;

export type Industry = keyof typeof INDUSTRY_TAXONOMY;
export type SubIndustry = (typeof INDUSTRY_TAXONOMY)[Industry][number];

export const INDUSTRIES = Object.keys(INDUSTRY_TAXONOMY) as Industry[];

export function subIndustriesFor(industry?: Industry | string): string[] {
  if (!industry) return [];
  return [...((INDUSTRY_TAXONOMY as Record<string, readonly string[]>)[industry] ?? [])];
}

/** Parent industry of a sub-industry name, if it exists in the taxonomy. */
export function parentOf(subIndustry?: string): Industry | undefined {
  if (!subIndustry) return undefined;
  return INDUSTRIES.find((i) => subIndustriesFor(i).includes(subIndustry));
}

export function isValidPair(industry?: string, subIndustry?: string): boolean {
  if (!industry || !subIndustry) return false;
  return subIndustriesFor(industry).includes(subIndustry);
}

/**
 * Sub-industries that are not permitted on our screens. Used by the mock
 * brand-safety review to reject a creative.
 */
export const RESTRICTED_SUB_INDUSTRIES: Record<string, string> = {
  "Alcoholic Beverages": "Alcohol promotion is not permitted on our screens",
  Tobacco: "Tobacco promotion is not permitted on our screens",
  "Political & Election Advertising": "Political advertising is not permitted on our screens",
};

export function restrictionFor(subIndustry?: string): string | undefined {
  if (!subIndustry) return undefined;
  return RESTRICTED_SUB_INDUSTRIES[subIndustry];
}

/** Legacy tag values (old free-text industry / content tags) → new taxonomy pair. */
const LEGACY_MAP: Record<string, { industry: Industry; subIndustry: string }> = {
  Restaurant: { industry: "Food & Beverage (F&B)", subIndustry: "Restaurants & QSR" },
  "Clinic/Healthcare": { industry: "Healthcare & Pharma", subIndustry: "Hospitals & Clinics" },
  Retail: { industry: "Retail & E-commerce", subIndustry: "Marketplaces" },
  "Salon/Beauty": { industry: "Beauty & Cosmetics", subIndustry: "Salons & Spas" },
  "Gym/Fitness": { industry: "Sports & Fitness", subIndustry: "Gyms & Fitness Centres" },
  Education: { industry: "Education", subIndustry: "Test Prep & Coaching" },
  "Real Estate": { industry: "Real Estate & Construction", subIndustry: "Residential Developers" },
  Insurance: { industry: "Financial Services (BFSI)", subIndustry: "Insurance" },
  Alcohol: { industry: "Food & Beverage (F&B)", subIndustry: "Alcoholic Beverages" },
};

export const FALLBACK_PAIR = { industry: "Other" as Industry, subIndustry: "Other" };

/**
 * Migrate any legacy/unknown industry + tag values onto the taxonomy.
 * Nothing may ever render blank: unmatched values become Other / Other.
 */
export function migrateTag(
  industry?: string,
  subIndustry?: string,
): { industry: Industry; subIndustry: string } {
  if (isValidPair(industry, subIndustry)) {
    return { industry: industry as Industry, subIndustry: subIndustry as string };
  }
  const byChild = parentOf(subIndustry);
  if (byChild) return { industry: byChild, subIndustry: subIndustry as string };
  if (subIndustry && LEGACY_MAP[subIndustry]) return LEGACY_MAP[subIndustry];
  if (industry && LEGACY_MAP[industry]) return LEGACY_MAP[industry];
  if (industry && INDUSTRIES.includes(industry as Industry)) {
    return { industry: industry as Industry, subIndustry: subIndustriesFor(industry)[0] };
  }
  return FALLBACK_PAIR;
}
