#!/usr/bin/env python3
"""Replace hardcoded English prose in pages and components with tx() keys."""
import hashlib
import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
LOCALES = SRC / "locales"
ALLOW = {
    "MathLift",
    "Chrome",
    "Firefox",
    "Safari",
    "Edge",
    "Opera",
    "Firebase",
    "Firestore",
    "Vercel",
    "FERPA",
    "COPPA",
    "PIN",
    "PDF",
    "OK",
}
PROSE = re.compile(r"[A-Za-z]{4,}")
ATTR = re.compile(
    r"\b(aria-label|title|placeholder|alt|text|prompt)\s*=\s*(\"([^\"]+)\"|'([^']+)')"
)
JSX = re.compile(r">([^<>{}]*[A-Za-z][^<>{}]*)<")


def looks(text: str) -> bool:
    text = re.sub(r"\s+", " ", text).strip()
    if not text or text in ALLOW:
        return False
    if not PROSE.search(text):
        return False
    if text.startswith("http"):
        return False
    if re.fullmatch(r"[a-z0-9_.:/-]+", text):
        return False
    if re.search(r"[{};]|=>|const |let |function |\.split\(", text):
        return False
    letters = len(re.findall(r"[A-Za-z]", text))
    if letters < 4 or letters / max(len(text), 1) < 0.45:
        return False
    return True


def clean(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    text = text.replace("—", ", ").replace("–", ", ")
    text = re.sub(r"\s+,", ",", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text


def key_for(text: str) -> str:
    digest = hashlib.sha1(text.encode("utf-8")).hexdigest()[:10]
    return f"s_{digest}"


def walk():
    for base in (SRC / "pages", SRC / "components"):
        for dirpath, dirnames, filenames in os.walk(base):
            if "ui" in Path(dirpath).parts:
                continue
            for name in filenames:
                if name.endswith(".tsx"):
                    yield Path(dirpath) / name


def main():
    catalog = {}
    changed = 0
    for path in walk():
        source = path.read_text()
        original = source

        def attr_sub(match: re.Match) -> str:
            raw = match.group(3) if match.group(3) is not None else match.group(4)
            text = clean(raw)
            if not looks(text):
                return match.group(0)
            key = key_for(text)
            catalog[key] = text
            return f"{match.group(1)}={{tx('ui:{key}')}}"

        source = ATTR.sub(attr_sub, source)

        def jsx_sub(match: re.Match) -> str:
            raw = match.group(1)
            text = clean(raw)
            if not looks(text):
                return match.group(0)
            # Keep surrounding whitespace out of the key, but preserve indentation-free text.
            key = key_for(text)
            catalog[key] = text
            return ">{tx('ui:" + key + "')}<"

        source = JSX.sub(jsx_sub, source)
        if source != original:
            if "from '@/i18n/tx'" not in source and 'from "@/i18n/tx"' not in source:
                source = "import { tx } from '@/i18n/tx';\n" + source
            path.write_text(source)
            changed += 1

    en_path = LOCALES / "en" / "ui.json"
    existing = json.loads(en_path.read_text()) if en_path.exists() else {}
    existing.update(catalog)
    en_path.write_text(json.dumps(existing, ensure_ascii=False, indent=2) + "\n")
    print(f"updated {changed} files, {len(catalog)} strings")


if __name__ == "__main__":
    main()
