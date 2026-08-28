#!/bin/bash
# Usage: ./generate_mcqs_robust.sh <Subject> <start_chapter> <end_chapter>
# The generate endpoint returns 202 and runs the LLM call in the
# background, so each chapter is accepted first and then polled via
# /generation-status until it completes or fails.
SUBJECT="$1"
START="$2"
END="$3"
BASE_URL="http://localhost:8000/api/v1/admin/mcqs"

for chnum in $(seq "$START" "$END"); do
  success=false
  for attempt in 1 2 3; do
    echo "Generating MCQs for $SUBJECT Ch.$chnum (attempt $attempt) ..."
    response=$(curl -s -X POST "${BASE_URL}/generate?subject=${SUBJECT}&chapter_number=${chnum}&force=false" \
      -H "Authorization: Bearer $ADMIN_TOKEN")
    echo "$response"
    if echo "$response" | grep -q '"MCQ generation started"'; then
      # Accepted -- poll until the background job finishes (up to ~3 min).
      for _ in $(seq 1 36); do
        sleep 5
        status=$(curl -s "${BASE_URL}/generation-status?subject=${SUBJECT}&chapter_number=${chnum}" \
          -H "Authorization: Bearer $ADMIN_TOKEN")
        if echo "$status" | grep -q '"completed"'; then
          echo "$status"
          success=true
          break
        fi
        if echo "$status" | grep -q '"failed"'; then
          echo "$status"
          break
        fi
      done
      if [ "$success" = true ]; then
        break
      fi
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
