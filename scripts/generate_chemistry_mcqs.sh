#!/bin/bash
BASE_URL="http://localhost:8000/api/v1/admin/mcqs/generate"

for chnum in $(seq 1 33); do
  echo "Generating MCQs for Chemistry Ch.$chnum ..."
  response=$(curl -s -X POST "${BASE_URL}?subject=Chemistry&chapter_number=${chnum}&force=false" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  echo "$response"
  echo "---"
  sleep 4
done

echo "Done. Check /admin/mcq-coverage next."
