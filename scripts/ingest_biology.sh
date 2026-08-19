#!/bin/bash
BASE_URL="http://localhost:8000/api/v1/admin/upload-pdf"
PDF_DIR="/home/fawad/project/ILM-AI/data/pdfs/biology"

declare -A TITLES=(
  [1]="Biodiversity and Classification"
  [2]="Bacteria and Viruses"
  [3]="Cells and Subcellular Organelles"
  [4]="Molecular Biology"
  [5]="Enzymes"
  [6]="Bioenergetics"
  [7]="Structural and Computational Biology"
  [8]="Plant Physiology"
  [9]="Human Digestive System"
  [10]="Human Respiratory System"
  [11]="Human Circulatory System"
  [12]="Human Skeletal and Muscular System"
  [13]="Thermoregulation and Osmoregulation"
  [14]="Human Urinary System"
  [15]="Human Nervous System"
  [16]="Human Endocrine System"
  [17]="Human Reproductive System"
  [18]="Inheritance"
  [19]="Chromosome and DNA"
  [20]="Biotechnology"
  [21]="Immunity"
  [22]="Biostatistics"
  [23]="Pharmacology"
  [24]="Evolution"
  [25]="Ecology"
)

for f in "$PDF_DIR"/ch*.pdf; do
  filename=$(basename "$f")
  chnum=$(echo "$filename" | sed -E 's/^ch0*([0-9]+)_.*/\1/')
  title="${TITLES[$chnum]}"
  if [ -z "$title" ]; then
    echo "SKIP: no title mapped for chapter $chnum ($filename)"
    continue
  fi
  echo "Uploading Ch.$chnum: $title ..."
  response=$(curl -s -X POST "$BASE_URL" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -F "file=@$f" \
    -F "subject=Biology" \
    -F "chapter_number=$chnum" \
    -F "chapter_title=$title")
  echo "$response"
  echo "---"
  sleep 2
done

echo "Done. Run coverage check next."
