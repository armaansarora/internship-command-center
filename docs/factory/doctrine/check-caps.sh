#!/usr/bin/env bash
# Mechanical doctrine-cap enforcement (doctrine §6) — no honor system.
# Run at Debrief (a doctrine edit that breaks caps cannot land) and at Briefing
# (over-cap file => compress NOW, non-destructively: demote lessons to their source AAR).
set -euo pipefail
cd "$(dirname "$0")"

fail=0
check() { # file max_lines
  [ -f "$1" ] || return 0
  local n; n=$(wc -l < "$1" | tr -d ' ')
  if [ "$n" -gt "$2" ]; then
    echo "OVER CAP: $1 is $n lines (cap $2) — compress before landing (demote, don't delete)"
    fail=1
  else
    echo "ok: $1 ($n/$2)"
  fi
}

check PLAYBOOK.md 150
check GOTCHAS.md 400        # entry-structured: ~100 entries × ~4 lines
check VERDICTS.md 200
for kit in class-kits/*.md; do
  [ -e "$kit" ] && check "$kit" 150
done

exit $fail
