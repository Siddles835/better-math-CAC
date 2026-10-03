"""Compare anonymized teacher labels with model labels. Writes nothing if the CSV is absent."""
import csv
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CSV_PATH = ROOT / "pilot_labels.csv"
OUT = ROOT.parent / "src" / "lib" / "cognition" / "models" / "pilot_eval.json"


def kappa(pairs):
    labels = sorted({label for pair in pairs for label in pair})
    n = len(pairs)
    if n == 0 or not labels:
        return 0.0
    matrix = {label: {other: 0 for other in labels} for label in labels}
    for teacher, model in pairs:
        matrix[teacher][model] += 1
    agree = sum(matrix[label][label] for label in labels) / n
    teacher_p = {label: sum(matrix[label].values()) / n for label in labels}
    model_p = {label: sum(matrix[other][label] for other in labels) / n for label in labels}
    chance = sum(teacher_p[label] * model_p[label] for label in labels)
    if chance == 1:
        return 1.0
    return (agree - chance) / (1 - chance)


def main():
    if not CSV_PATH.exists():
        print("Pilot comparison not yet added. No pilot_labels.csv, so no pilot_eval.json was written.")
        return
    pairs = []
    per_class = defaultdict(lambda: {"agree": 0, "support": 0})
    with CSV_PATH.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            teacher = (row.get("teacher_label") or "").strip()
            model = (row.get("model_label") or "").strip()
            if not teacher or not model:
                continue
            pairs.append((teacher, model))
            per_class[teacher]["support"] += 1
            if teacher == model:
                per_class[teacher]["agree"] += 1
    if not pairs:
        print("pilot_labels.csv has no usable rows. No pilot_eval.json was written.")
        return
    payload = {
        "agreement": round(sum(teacher == model for teacher, model in pairs) / len(pairs), 4),
        "kappa": round(kappa(pairs), 4),
        "support": len(pairs),
        "perClass": [
            {
                "label": label,
                "agreement": round(stats["agree"] / stats["support"], 4) if stats["support"] else 0,
                "support": stats["support"],
            }
            for label, stats in sorted(per_class.items())
        ],
        "dataSource": "anonymized_pilot_csv",
    }
    OUT.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
