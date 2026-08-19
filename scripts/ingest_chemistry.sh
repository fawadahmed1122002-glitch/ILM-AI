#!/bin/bash
BASE_URL="http://localhost:8000/api/v1/admin/upload-pdf"
PDF_DIR="/home/fawad/project/ILM-AI/data/pdfs/chemistry"

declare -A TITLES=(
  [1]="Periodic Table and Periodic Properties"
  [2]="Atomic Structure"
  [3]="Chemical Bonding"
  [4]="Stoichiometry"
  [5]="States and Phases of Matter"
  [6]="Chemical Energetics"
  [7]="Reaction Kinetics"
  [8]="Chemical Equilibrium"
  [9]="Acid-Base Chemistry"
  [10]="Electrochemistry"
  [11]="Hydrocarbons"
  [12]="Nitrogen and Sulphur"
  [13]="Halogens"
  [14]="Atmosphere"
  [15]="Basic Separation Techniques"
  [16]="Lab Safety and Practical Skills"
  [17]="Group 2 Elements"
  [18]="Transition Metals"
  [19]="Basics of Organic Chemistry"
  [20]="Aromatic Hydrocarbons"
  [21]="Halogenoalkanes"
  [22]="Hydroxy Compounds"
  [23]="Carbonyl Compounds and Carboxylic Acid"
  [24]="Organic Nitrogen Compounds"
  [25]="Organic Synthesis"
  [26]="Polymers"
  [27]="Biochemistry"
  [28]="Chromatography"
  [29]="Spectroscopy 1"
  [30]="Spectroscopy 2 (NMR)"
  [31]="Materials and Energy"
  [32]="Medicine, Agriculture, and Industry"
  [33]="Water"
)

for f in "$PDF_DIR"/[Cc]h*.pdf; do
  filename=$(basename "$f")
  chnum=$(echo "$filename" | sed -E 's/^[Cc]h0*([0-9]+)_.*/\1/')
  title="${TITLES[$chnum]}"
  if [ -z "$title" ]; then
    echo "SKIP: no title mapped for chapter $chnum ($filename)"
    continue
  fi
  echo "Uploading Ch.$chnum: $title ..."
  response=$(curl -s -X POST "$BASE_URL" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -F "file=@$f" \
    -F "subject=Chemistry" \
    -F "chapter_number=$chnum" \
    -F "chapter_title=$title")
  echo "$response"
  echo "---"
  sleep 2
done

echo "Done. Run coverage check next."
