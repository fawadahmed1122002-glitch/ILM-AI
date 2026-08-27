"""One-off verification of the PLAN_PRODUCT_MISMATCH guard: create a
disposable user, force them into plan='pro' + product_id NULL +
daily_explain_count=3, then confirm /query/explain succeeds via the
legacy fallback and /query/usage/me flags the mismatch. Cleans up."""
import json
import subprocess
import sys
import time
import urllib.request

sys.path.insert(0, ".")
from dotenv import load_dotenv
load_dotenv(".env")
from app.core.security import create_access_token

BASE = "http://localhost:8000/api/v1"
EMAIL = f"mismatch_guard_{int(time.time())}@example.com"


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
         "-P", "pager=off", "-t", "-c", sql],
        capture_output=True, text=True,
        env={"PGPASSWORD": "ilmai_dev_password", "PATH": "/usr/bin:/bin"},
    )
    return out.stdout.strip()


# 1. register, then force the inconsistent state directly in the DB
#    (exactly the path that broke corsfawad: raw plan flip, no product).
call("POST", "/auth/register",
     {"email": EMAIL, "password": "TestPass123!", "full_name": "Mismatch Guard"})
uid = psql(f"SELECT id FROM users WHERE email='{EMAIL}';")
psql(f"UPDATE users SET plan='pro', product_id=NULL, is_email_verified=true, "
     f"daily_explain_count=3, last_reset_date=CURRENT_DATE WHERE id='{uid}';")
print(f"forced inconsistent state on {uid}")

token = create_access_token(uid)

# 2. explain at the limit -- must succeed via legacy fallback (Biology)
resp = call("POST", "/query/explain",
            {"subject": "Biology", "query": "Osmosis"}, token)
print("explain: HTTP 200, head:", resp["explanation"][:80].replace("\n", " "))
count = psql(f"SELECT daily_explain_count FROM users WHERE id='{uid}';")
print(f"daily_explain_count after explain: {count} (must still be 3 -- bypassed)")
assert count.strip() == "3"

# 3. usage/me must flag the mismatch + show legacy subjects
usage = call("GET", "/query/usage/me", token=token)
print("usage/me plan_product_mismatch:", usage["plan_product_mismatch"])
print("usage/me unlimited_subjects  :", usage["unlimited_subjects"])
assert usage["plan_product_mismatch"] is True
assert "Biology" in usage["unlimited_subjects"]

# 4. cleanup
psql(f"BEGIN; DELETE FROM users WHERE id='{uid}'; COMMIT;")
left = psql(f"SELECT COUNT(*) FROM users WHERE email LIKE 'mismatch_guard%';")
print(f"cleanup done, leftovers: {left}")
print("\nALL GUARD CHECKS PASSED")
