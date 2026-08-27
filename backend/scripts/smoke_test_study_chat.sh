#!/usr/bin/env bash
# Smoke test: Study Chat endpoints (backend only).
# Flow: register -> /start -> substantive question -> EN reference
# follow-up -> Roman Urdu follow-up -> GET history.
set -euo pipefail

BASE="http://127.0.0.1:${PORT:-8000}/api/v1"
TS=$(date +%s)
EMAIL="chat_smoke_${TS}@example.com"
PASSWORD="SmokeTest123!"
SUBJECT="Biology"
TOPIC="${TOPIC:-Photosynthesis}"
Q1="${Q1:-What happens in the light reactions of photosynthesis?}"
Q2="${Q2:-Can you explain that second part again in simpler words?}"
Q3="${Q3:-yeh samajh nahi aya, dobara batao}"

echo "=== 1. REGISTER (${EMAIL}) ==="
REG=$(curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"full_name\":\"Chat Smoke\",\"subjects\":[\"Biology\"]}")
echo "$REG" | head -c 200; echo

echo "=== LOGIN ==="
TOKEN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
echo "token: ${TOKEN:0:25}..."
AUTH="Authorization: Bearer $TOKEN"

echo
echo "=== 2. POST /study/chat/start (subject=$SUBJECT, topic=$TOPIC) ==="
START=$(curl -s -X POST "$BASE/study/chat/start" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"subject\":\"$SUBJECT\",\"topic\":\"$TOPIC\"}")
echo "$START" | python3 -m json.tool
THREAD=$(echo "$START" | python3 -c "import sys,json;print(json.load(sys.stdin)['thread_id'])")
echo "thread_id: $THREAD"

echo
echo "=== 2b. /start again (same thread, expect created=false, no duplicate) ==="
curl -s -X POST "$BASE/study/chat/start" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"subject\":\"$SUBJECT\",\"topic\":\"$TOPIC\"}" | python3 -c "import sys,json;d=json.load(sys.stdin);print('created:',d['created'],'| same thread:',d['thread_id'])"

echo
echo "=== 3. MESSAGE 1 (substantive English question) ==="
M1=$(curl -s -X POST "$BASE/study/chat/threads/$THREAD/messages" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"content\":\"$Q1\"}")
echo "$M1" | python3 -m json.tool

echo
echo "=== 4. MESSAGE 2 (English reference follow-up: 'that second part') ==="
M2=$(curl -s -X POST "$BASE/study/chat/threads/$THREAD/messages" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"content\":\"$Q2\"}")
echo "$M2" | python3 -m json.tool

echo
echo "=== 5. MESSAGE 3 (Roman Urdu follow-up — language mirroring test) ==="
M3=$(curl -s -X POST "$BASE/study/chat/threads/$THREAD/messages" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"content\":\"$Q3\"}")
echo "$M3" | python3 -m json.tool

echo
echo "=== 6. GET /threads/{id} — history ordering ==="
curl -s "$BASE/study/chat/threads/$THREAD" -H "$AUTH" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('thread:', d['thread_id'], '| subject:', d['subject'], '| topic:', d['topic'])
prev = None
ok = True
for m in d['messages']:
    print(f\"  [{m['created_at']}] {m['role']:<9} | {m['content'][:80]}\")
    if prev and m['created_at'] < prev: ok = False
    prev = m['created_at']
print('ordering monotonic:', 'PASS' if ok else 'FAIL')
"

echo
echo "=== 7. chunks_used_json check (DB) ==="
PGPASSWORD=ilmai_dev_password psql -h localhost -U ilmai_user -d ilmai_db -P pager=off -c "
SELECT left(content, 45) AS assistant_reply,
       jsonb_array_length(chunks_used_json) AS chunks_used,
       chunks_used_json->0->>'chapter' AS first_chunk_chapter,
       left(chunks_used_json->0->>'text', 90) AS first_chunk_text
FROM study_chat_messages
WHERE thread_id = '$THREAD' AND role = 'assistant'
ORDER BY created_at;"

echo
echo "thread_id: $THREAD"
