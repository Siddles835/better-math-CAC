# MathLift models

Training and evaluation use Python 3.10 or newer. Pinned packages are in `requirements.txt`
(numpy, pandas, scikit-learn, torch, torchvision).

```bash
pip install -r ml/requirements.txt
# CPU torch wheels if needed:
# pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
npm run train:digits   # 28×28 CNN + thresholds + digit eval fragment
DIGIT_SKIP_TRAIN=1 npm run train:ml   # misconception tree + merge digit fragment
python ml/test_raster.py
```

## Digit recognizer (28×28)

`train_digit_cnn.py` trains a small CNN (~65k params) in PyTorch and exports flat JSON
weights to `src/lib/cognition/models/digit_mlp.json` for a dependency-free TypeScript
forward pass.

### Datasets and licenses

| Dataset | Role | License / note |
|---|---|---|
| **MNIST** via `torchvision.datasets.MNIST` | Primary western digit images | Yann LeCun et al., **CC BY-SA 3.0** |
| Fallback: `sklearn.datasets.fetch_openml('mnist_784')` | If torchvision download fails | Same MNIST corpus |
| Fallback: `sklearn.datasets.load_digits` | Offline 8×8 upscaled | Only if no network |
| Synthetic stroke templates | Child-style augmentation (wobble, ≤20° rotation, slant, multi-stroke 4/5/7, scale) | Hand-authored in this repo — **not** real children’s handwriting |
| `ml/data/real/*.json` | Optional real samples from `/dev/digits` | Local only; never uploaded |

Chinese math class uses Western digits; hanzi numerals are not in the drawing model.
Arabic-Indic and Devanagari synthetic classes are kept for script-aware reversal safety.

### Collecting real samples

1. Run a development build (`npm run dev`).
2. Open `/dev/digits`.
3. Draw labeled digits (aim for **20+ per digit**), download JSON.
4. Put files in `ml/data/real/` and rerun `npm run train:digits`.

Seeds are fixed. Two digit training runs with the same environment should hash-match the exported weights.
