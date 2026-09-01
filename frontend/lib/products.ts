// Mirrors backend/app/core/products.py -- keep both in sync manually.
// This is the frontend's copy of the purchasable product catalog, used
// to render the picker on /upgrade and to validate/price a checkout
// request before calling Safepay.

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  // Mirrors PRODUCT_CATALOG[...]["subjects"] on the backend; used by
  // diagnostic personalization (dashboard subject ordering) only.
  subjects: string[];
}

export const PRODUCTS: Product[] = [
  { id: "ecat", name: "ECAT", price: 799, description: "Physics · Chemistry · Mathematics · English", subjects: ["Physics", "Chemistry", "Mathematics", "English"] },
  { id: "mdcat", name: "MDCAT", price: 799, description: "Biology · Chemistry · Physics · English", subjects: ["Biology", "Chemistry", "Physics", "English"] },
  { id: "nust", name: "NUST (NET)", price: 999, description: "Physics · Mathematics · Chemistry · Computer Science · English", subjects: ["Physics", "Mathematics", "Chemistry", "Computer Science", "English"] },
  { id: "fast", name: "FAST", price: 999, description: "Mathematics · Computer Science · English", subjects: ["Mathematics", "Computer Science", "English"] },
  {
    id: "engineering_bundle",
    name: "Engineering Bundle",
    price: 2499,
    description: "ECAT + NET + FAST — Physics, Chemistry, Math, CS, English",
    subjects: ["Physics", "Chemistry", "Mathematics", "Computer Science", "English"],
  },
];

export function getProduct(productId: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === productId);
}

// Mirrors backend DIAGNOSTIC_TRACKS: single-test purchasable products
// selectable as target tracks on the /diagnostic and /settings screens.
export const DIAGNOSTIC_TRACK_IDS = ["ecat", "mdcat", "nust", "fast"] as const;

// Ordered union of subjects across the selected tracks, in catalog
// subject order (e.g. ["mdcat"] -> Biology, Chemistry, Physics, English;
// English is included here -- callers filter against whatever subject
// list actually has content). Returns [] when no tracks are selected so
// callers fall back to the un-personalized order.
export function subjectsForTracks(tracks: string[] | null | undefined): string[] {
  if (!tracks || tracks.length === 0) return [];
  const ordered: string[] = [];
  for (const trackId of tracks) {
    for (const subject of getProduct(trackId)?.subjects ?? []) {
      if (!ordered.includes(subject)) ordered.push(subject);
    }
  }
  return ordered;
}
