"""สรุปไฟล์ stats ของ http_sensor_lite.py (CS_SENSOR_STATS) — stdlib ล้วน รันบน VM ได้

ไฟล์ stats เก็บ "ผลต่อ request" เท่านั้น (ชนิดผล + ชื่อกฎ) ไม่เก็บข้อความ request

  python3 http_stats_summary.py ~/cs/stats.jsonl
"""

import json
import sys
from collections import Counter

path = sys.argv[1] if len(sys.argv) > 1 else "stats.jsonl"
total, kinds, rules = 0, Counter(), Counter()
first = last = None
with open(path, encoding="utf-8") as f:
    for line in f:
        try:
            row = json.loads(line)
        except ValueError:
            continue
        total += 1
        first = row["t"] if first is None else first
        last = row["t"]
        if row.get("kind"):
            kinds[row["kind"]] += 1
            if row.get("rule"):
                rules[row["rule"]] += 1

flagged = sum(kinds.values())
print(f"requests seen      : {total}" + (f"  over {last - first:.0f}s" if total > 1 else ""))
print(f"flagged            : {flagged}  ({flagged / total:.1%})" if total else "flagged            : 0")
print(f"  by rules         : {kinds['rules']}")
print(f"  by model         : {kinds['model']}")
print(f"not flagged        : {total - flagged}")
if rules:
    print("rules that fired   :", ", ".join(f"{r} x{n}" for r, n in rules.most_common()))
