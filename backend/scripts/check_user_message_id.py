"""One-off live check: POST /study/chat/threads/{id}/messages now returns
user_message_id alongside message_id, and both match the persisted rows.
Cleans up after itself."""
import json
import subprocess
import urllib.request
import uuid
import time

BASE = "http://localhost:8000/api/v1"
EMAIL = f"chat_idcheck_{int(time.time())}@example.com"
PASSWORD = "TestPass123!"


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


# 1. register -> login
call("POST", "/auth/register",
     {"email": EMAIL, "password": PASSWORD, "full_name": "ID Check"})
token = call("POST", "/auth/login",
             {"email": EMAIL, "password": PASSWORD})["access_token"]

# 2. start thread
thread_id = call("POST", "/study/chat/start",
                 {"subject": "Biology", "topic": "Photosynthesis"},
                 token)["thread_id"]
print(f"thread_id: {thread_id}")

# 3. send message
resp = call("POST", f"/study/chat/threads/{thread_id}/messages",
            {"content": "What do light reactions produce?"}, token)
print(f"user_message_id: {resp['user_message_id']}")
print(f"message_id     : {resp['message_id']}")
print(f"response head  : {resp['response'][:70]}")

# 4. compare against DB rows
rows = psql(f"SELECT role, id FROM study_chat_messages "
            f"WHERE thread_id='{thread_id}' ORDER BY created_at;")
print("--- DB rows:")
print(rows)
db_ids = {line.split("|")[0].strip(): line.split("|")[1].strip()
          for line in rows.splitlines() if line.strip()}
assert db_ids["user"] == resp["user_message_id"], "user id MISMATCH"
assert db_ids["assistant"] == resp["message_id"], "assistant id MISMATCH"
uuid.UUID(resp["user_message_id"])  # valid UUID
print("MATCH: both ids are the real persisted row ids")

# 5. cleanup (wipes any chat_idcheck* leftovers from earlier debug runs too)
psql("BEGIN; "
     f"DELETE FROM study_chat_messages WHERE thread_id='{thread_id}'; "
     f"DELETE FROM study_chat_threads WHERE id='{thread_id}'; "
     f"DELETE FROM users WHERE email='{EMAIL}'; "
     "DELETE FROM users WHERE email LIKE 'chat_idcheck%'; COMMIT;")
left = psql(f"SELECT COUNT(*) FROM users WHERE email LIKE 'chat_idcheck%';")
print(f"cleanup done, leftover chat_idcheck users: {left}")
