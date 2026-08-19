#!/bin/bash
# Usage: ./generate_mcqs_robust.sh <Subject> <start_chapter> <end_chapter>
SUBJECT="$1"
START="$2"
END="$3"
BASE_URL="http://localhost:8000/api/v1/admin/mcqs/generate"

for chnum in $(seq "$START" "$END"); do
  success=false
  for attempt in 1 2 3; do
    echo "Generating MCQs for $SUBJECT Ch.$chnum (attempt $attempt) ..."
    response=$(curl -s -X POST "${BASE_URL}?subject=${SUBJECT}&chapter_number=${chnum}&force=false" \
      -H "Authorization: Bearer $ADMIN_TOKEN")
    echo "$response"
    if echo "$response" | grep -q '"generated"'; then
      success=true
      break
    fi
    echo "Attempt $attempt failed, waiting before retry..."
    sleep 15
  done
  if [ "$success" = false ]; then
    echo "GAVE UP on $SUBJECT Ch.$chnum after 3 attempts"
  fi
  echo "---"
  sleep 8
done

echo "Done."
