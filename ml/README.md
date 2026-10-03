# MathLift models

Training and evaluation use Python 3.10 or newer. The pinned packages are in `requirements.txt` (numpy 2.2.6, pandas 2.3.2, scikit-learn 1.7.2).

```bash
pip install -r ml/requirements.txt
npm run train:ml
npm run train:recommend
python ml/evaluate_pilot.py
python ml/test_raster.py
```

`train:ml` writes:

- `src/lib/cognition/models/misconception_tree.json`
- `src/lib/cognition/models/digit_mlp.json`
- `src/lib/cognition/models/digit_thresholds.json`
- `src/lib/cognition/models/eval.json`
- `ml/golden_rasters.json`

Seeds are fixed. Running the script twice should produce the same `eval.json`.

The digit strokes are hand-written templates plus jitter. They are not real children's handwriting. Chinese numerals are not included. Children in Chinese math class write Western digits.

Reading-time multipliers (`en` 1, `zh-Hans` 0.82, `es` 1.18, `hi` 1.30, `ar` 1.35) are assumptions, not measured classroom values. The app divides timing features by them so the tree stays language-independent.

## Real handwriting

Open `/dev/digits` in a development build, draw labeled digits, and download the JSON. Put files in `ml/data/real/`. The trainer mixes them in, weighted above synthetic strokes, when the folder has files. If the folder is empty, training still runs. Nothing is uploaded.

## Pilot comparison

Copy `ml/pilot_labels.template.csv` to `ml/pilot_labels.csv` and fill anonymized ids only. `evaluate_pilot.py` writes `pilot_eval.json` only when that CSV exists. It does not invent numbers.
