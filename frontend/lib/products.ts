// Mirrors backend/app/core/products.py -- keep both in sync manually.
// This is the frontend's copy of the purchasable product catalog, used
// to render the picker on /upgrade and to validate/price a checkout
// request before calling Safepay.

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
}

export const PRODUCTS: Product[] = [
  { id: "ecat", name: "ECAT", price: 799, description: "Physics · Chemistry · Mathematics · English" },
  { id: "mdcat", name: "MDCAT", price: 799, description: "Biology · Chemistry · Physics · English" },
  { id: "nust", name: "NUST (NET)", price: 999, description: "Physics · Mathematics · Chemistry · Computer Science · English" },
  { id: "fast", name: "FAST", price: 999, description: "Mathematics · Computer Science · English" },
  {
    id: "engineering_bundle",
    name: "Engineering Bundle",
    price: 2499,
    description: "ECAT + NET + FAST — Physics, Chemistry, Math, CS, English",
  },
];

export function getProduct(productId: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === productId);
}