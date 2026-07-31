"""
Purchasable product catalog. Each product grants unlimited access
(bypassing free-tier daily limits) ONLY within its own subject scope --
a student outside their purchased product's subjects still hits free-tier
limits, even if they have an active paid product.

"Replace" model: a user has at most ONE active product at a time (matches
users.product_id being a single column, not a join table). A new purchase
replaces the old one.
"""

PRODUCT_CATALOG: dict[str, dict] = {
    "ecat": {
        "name": "ECAT",
        "price_pkr": 799,
        "subjects": ["Physics", "Chemistry", "Mathematics", "English"],
        "tests": ["ECAT"],
    },
    "mdcat": {
        "name": "MDCAT",
        "price_pkr": 799,
        "subjects": ["Biology", "Chemistry", "Physics", "English"],
        "tests": ["MDCAT"],
    },
    "nust": {
        "name": "NUST (NET)",
        "price_pkr": 999,
        "subjects": ["Physics", "Mathematics", "Chemistry", "Computer Science", "English"],
        "tests": ["NET"],
    },
    "fast": {
        "name": "FAST",
        "price_pkr": 999,
        "subjects": ["Mathematics", "Computer Science", "English"],
        "tests": ["FAST"],
    },
    "engineering_bundle": {
        "name": "Engineering Bundle (ECAT + NET + FAST)",
        "price_pkr": 2499,
        "subjects": ["Physics", "Chemistry", "Mathematics", "Computer Science", "English"],
        "tests": ["ECAT", "NET", "FAST"],
    },
    # Grandfathered for the accounts that paid the old flat PKR 799 "pro"
    # price before this product model existed. Not purchasable -- only
    # ever assigned via migration/admin, never shown at checkout.
    "legacy_full_access": {
        "name": "Legacy Full Access (pre-product-model)",
        "price_pkr": 0,
        "subjects": ["Biology", "Chemistry", "Physics", "Mathematics", "Computer Science"],
        "tests": ["ECAT", "MDCAT", "NET", "FAST"],
        "purchasable": False,
    },
}

PURCHASABLE_PRODUCTS = {k: v for k, v in PRODUCT_CATALOG.items() if v.get("purchasable", True)}


def get_product(product_id: str | None) -> dict | None:
    if not product_id:
        return None
    return PRODUCT_CATALOG.get(product_id)


def subjects_for_product(product_id: str | None) -> list[str]:
    product = get_product(product_id)
    return product["subjects"] if product else []


def price_for_product(product_id: str) -> int | None:
    product = get_product(product_id)
    return product["price_pkr"] if product else None