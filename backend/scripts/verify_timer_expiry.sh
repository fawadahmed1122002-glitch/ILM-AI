#!/bin/bash
# Verify timer-expiry enforcement for past papers (SQL rewind trick).
# Flow: register -> start -> answer Q1 (correct) + Q2 (wrong) -> rewind
# started_at 105 min -> PATCH Q3 must return 403 TIME_EXPIRED -> submit
# still grades the 2 saved answers -> results breakdown.
set -e

BASE="http://127.0.0.1:${PORT:-8000}/api/v1"
PAPER_ID="c5a16c38-cee4-4ff8-94a5-472b471074e8"
EMAIL="timer_exp_$(date +%s)@example.com"
export PGPASSWORD=ilmai_dev_password
PSQL="psql -h localhost -U ilmai_user -d ilmai_db -P pager=off -t -A -c"

echo "== 1. Register ($EMAIL) =="
REG=$(curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" \
  -d "{\"full_name\": \"Timer Expiry Test\", \"email\": \"$EMAIL\", \"password\": \"TestPass123!\"}")
TOKEN=$(python3 -c "import json,sys; print(json.loads(sys.argv[1]).get('access_token',''))" "$REG")
if [ -z "$TOKEN" ]; then echo "REGISTER FAILED: $REG"; exit 1; fi
AUTH="Authorization: Bearer $TOKEN"
echo "token acquired"

echo ""
echo "== 2. Start paper + answer Q1 (correct=A) and Q2 (wrong=A, correct=C) =="
START=$(curl -s -X POST "$BASE/past-papers/$PAPER_ID/start" -H "$AUTH" -H "Content-Type: application/json" -d "{}")
ATTEMPT_ID=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['attempt_id'])" "$START")
echo "attempt_id=$ATTEMPT_ID"
curl -s -X PATCH "$BASE/past-papers/attempts/$ATTEMPT_ID/answer" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"question_id": "6e522893-cd48-4039-bf61-213df85ec81c", "selected_option": "A"}'
echo "  <- Q1 answered (pre-expiry, expect ok)"
curl -s -X PATCH "$BASE/past-papers/attempts/$ATTEMPT_ID/answer" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"question_id": "35024fe9-9531-41aa-aec5-d42736d91471", "selected_option": "A"}'
echo "  <- Q2 answered (pre-expiry, expect ok)"

echo ""
echo "== 3. Rewind started_at by 105 minutes (timer expired 5 min ago) =="
$PSQL "UPDATE past_paper_attempts SET started_at = NOW() - INTERVAL '105 minutes' WHERE id = '$ATTEMPT_ID' RETURNING 'started_at now: ' || started_at;"

echo ""
echo "== 4. PATCH Q3 after expiry (expect 403 TIME_EXPIRED) =="
curl -s -w "\nHTTP %{http_code}\n" -X PATCH "$BASE/past-papers/attempts/$ATTEMPT_ID/answer" -H "$AUTH" \
  -H "Content-Type: application/json" -d '{"question_id": "e416981d-ca68-44d9-90d7-18c4c3ca3e0b", "selected_option": "B"}'

echo ""
echo "== 5. Submit after expiry (expect SUCCESS, grading the 2 saved answers) =="
curl -s -w "\nHTTP %{http_code}\n" -X POST "$BASE/past-papers/attempts/$ATTEMPT_ID/submit" -H "$AUTH" | python3 -c "
import json, sys
lines = sys.stdin.read().rsplit('\n', 2)
d = json.loads(lines[0])
print('score:', d['score'], '| correct_count:', d['correct_count'], '| question_count:', d['question_count'])
print('time_taken_seconds:', d['time_taken_seconds'], '(expect ~6300 = 105 min)')
print(lines[1])
"

echo ""
echo "== 6. Results breakdown (Q1 correct, Q2 incorrect, Q3 unanswered) =="
curl -s "$BASE/past-papers/attempts/$ATTEMPT_ID/results" -H "$AUTH" | python3 -c "
import json, sys
d = json.load(sys.stdin)
for q in d['questions'][:3]:
    print(f\"  Q{q['question_number']} selected={q['selected_option']} correct={q['correct_option']} is_correct={q['is_correct']}\")
"

echo ""
echo "TIMER EXPIRY VERIFICATION DONE (attempt_id=$ATTEMPT_ID, email=$EMAIL)"
