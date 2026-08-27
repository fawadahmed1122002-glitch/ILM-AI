"""One-off fix + verification: grant legacy_full_access to corsfawad via the
admin endpoint, then verify user row, payments audit row, subject coverage,
and a live /query/explain call for Biology."""
import json
import subprocess
import sys
import urllib.request

sys.path.insert(0, ".")
from dotenv import load_dotenv
load_dotenv(".env")

BASE = "http://localhost:8000/api/v1"
USER_ID = "3e31a3fd-7152-42ec-b3a6-ec6dc30aa467"


def call(method: str, path: str, payload=None, token=None):
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(payload).encode() if payload else None,
        headers={
            "Content-Type": "application/json",
            **({"Authorization": f"Bearer {token}"} if token else {}),
        },
        method=method,
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read())


def psql(sql: str) -> str:
    out = subprocess.run(
        ["psql", "-h", "localhost", "-U", "ilmai_user", "-d", "ilmai_db",
         "-P", "pager=off", "-c", sql],
        capture_output=True, text=True,
        env={"PGPASSWORD": "ilmai_dev_password", "PATH": "/usr/bin:/bin"},
    )
    return out.stdout.strip()


# --- Mint admin JWT locally (same pattern as earlier admin scripts).
# fawad123009@gmail.com (corsfawad) IS the admin user, so this grants
# the product to himself via the proper audited endpoint.
from app.core.security import create_access_token
admin_token = create_access_token(USER_ID)

# --- 0. Apply the fix via the admin endpoint.
grant = call(
    "POST", f"/admin/users/{USER_ID}/plan",
    {
        "plan": "pro",
        "product_id": "legacy_full_access",
        "method": "manual",
        "amount": 799,
        "transaction_ref": "manual-grant-legacy-full-access-2026-08-27",
    },
    admin_token,
)
print("--- grant response:")
print(json.dumps(grant, indent=2, default=str))

# --- 1. user row: product_id set?
print("\n--- 1. user row:")
print(psql(f"SELECT email, plan, product_id FROM users WHERE id='{USER_ID}';"))

# --- 2. payments audit row exists?
print("--- 2. payments rows:")
print(psql(f"SELECT amount, method, status, plan, product_id, transaction_ref "
           f"FROM payments WHERE user_id='{USER_ID}' ORDER BY created_at;"))

# --- 3. subjects_for_product coverage.
from app.core.products import subjects_for_product
subs = subjects_for_product("legacy_full_access")
print(f"\n--- 3. subjects_for_product('legacy_full_access') = {subs}")
assert "Biology" in subs and len(subs) >= 5

# --- 4. live /query/explain for Biology as corsfawad (count is already
# at the free limit of 3 -- this must now bypass it).
user_token = create_access_token(USER_ID)
print("\n--- 4. POST /query/explain (Biology, daily_explain_count already 3):")
resp = call("POST", "/query/explain",
            {"subject": "Biology", "query": "Photosynthesis"}, user_token)
print("HTTP 200 -- explanation head:", resp["explanation"][:120].replace("\n", " "), "...")
print("cached:", resp["cached"])

# counter must NOT have incremented (unlimited subjects bypass it)
print("\n--- counter after explain (must still be 3):")
print(psql(f"SELECT daily_explain_count FROM users WHERE id='{USER_ID}';"))
