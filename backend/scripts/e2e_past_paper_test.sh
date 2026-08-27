#!/bin/bash
# End-to-end verification for the Past Papers feature (step 5).
# Flow: register -> list -> start -> double-start guard -> answer Q1-Q5
# correctly -> submit -> results. Expects 5 correct out of 100 (score 5%).
set -e

BASE="http://127.0.0.1:${PORT:-8000}/api/v1"
PAPER_ID="c5a16c38-cee4-4ff8-94a5-472b471074e8"
EMAIL="e2e_pastpaper_$(date +%s)@example.com"

echo "== 1. Register test user ($EMAIL) =="
REG=$(curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" \
  -d "{\"full_name\": \"E2E PastPaper\", \"email\": \"$EMAIL\", \"password\": \"TestPass123!\"}")
TOKEN=$(python3 -c "import json,sys; print(json.loads(sys.argv[1]).get('access_token',''))" "$REG")
if [ -z "$TOKEN" ]; then echo "REGISTER FAILED: $REG"; exit 1; fi
echo "token acquired: ${TOKEN:0:20}..."
AUTH="Authorization: Bearer $TOKEN"

echo ""
echo "== 2. GET /past-papers (student-visible list) =="
curl -s "$BASE/past-papers" -H "$AUTH" | python3 -m json.tool

echo ""
echo "== 3. POST /past-papers/{paper_id}/start =="
START=$(curl -s -X POST "$BASE/past-papers/$PAPER_ID/start" -H "$AUTH" -H "Content-Type: application/json" -d "{}")
ATTEMPT_ID=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['attempt_id'])" "$START")
QCOUNT=$(python3 -c "import json,sys; d=json.loads(sys.argv[1]); print(len(d['questions']))" "$START")
echo "attempt_id=$ATTEMPT_ID  questions_returned=$QCOUNT"

echo ""
echo "== 4. Double-start guard (expect 400 ATTEMPT_IN_PROGRESS) =="
curl -s -w "\nHTTP %{http_code}\n" -X POST "$BASE/past-papers/$PAPER_ID/start" -H "$AUTH" -H "Content-Type: application/json" -d "{}"

echo ""
echo "== 5. PATCH answers for Q1-Q5 (all correct) =="
for QA in \
  "6e522893-cd48-4039-bf61-213df85ec81c A" \
  "35024fe9-9531-41aa-aec5-d42736d91471 C" \
  "e416981d-ca68-44d9-90d7-18c4c3ca3e0b B" \
  "e771c492-25cd-4138-92a7-0e07a681f891 B" \
  "dd02adee-da7b-46bc-834a-c4d02c3eaf71 A"; do
  set -- $QA
  curl -s -X PATCH "$BASE/past-papers/attempts/$ATTEMPT_ID/answer" -H "$AUTH" \
    -H "Content-Type: application/json" -d "{\"question_id\": \"$1\", \"selected_option\": \"$2\"}"
  echo "  <- answered $1 with $2"
done

echo ""
echo "== 6. POST /attempts/{attempt_id}/submit (expect correct_count=5, score=5) =="
curl -s -X POST "$BASE/past-papers/attempts/$ATTEMPT_ID/submit" -H "$AUTH" | python3 -m json.tool

echo ""
echo "== 7. GET /attempts/{attempt_id}/results (Q1-Q5 breakdown) =="
curl -s "$BASE/past-papers/attempts/$ATTEMPT_ID/results" -H "$AUTH" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('score:', d['score'], '| correct_count:', d['correct_count'], '| question_count:', d['question_count'])
print('time_taken_seconds:', d['time_taken_seconds'], '| status:', d['status'])
for q in d['questions'][:5]:
    print(f\"  Q{q['question_number']} selected={q['selected_option']} correct={q['correct_option']} is_correct={q['is_correct']}\")
unanswered = [q['question_number'] for q in d['questions'] if q['selected_option'] is None]
print('unanswered count:', len(unanswered))
"

echo ""
echo "E2E DONE"
