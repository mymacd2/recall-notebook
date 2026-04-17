#!/usr/bin/env python3
"""
Reads all .md files in notes/, parses YAML frontmatter,
and writes notes/index.json sorted alphabetically by filename.

Usage:
    python3 .github/scripts/build_index.py
"""
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.exit("PyYAML is required. Install with: pip install pyyaml")

REPO_ROOT = Path(__file__).parent.parent.parent
NOTES_DIR = REPO_ROOT / "notes"
FRONTMATTER_RE = re.compile(r"^---\r?\n([\s\S]*?)\r?\n---\r?\n", re.DOTALL)


def parse_frontmatter(text: str) -> dict:
    m = FRONTMATTER_RE.match(text)
    if not m:
        return {}
    return yaml.safe_load(m.group(1)) or {}


def normalize_list(value) -> list:
    """Ensure a value is a list, wrapping bare strings."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def main():
    if not NOTES_DIR.exists():
        sys.exit(f"notes/ directory not found at {NOTES_DIR}")

    notes = []
    for path in sorted(NOTES_DIR.glob("*.md")):
        if path.name.lower() == "readme.md":
            continue
        text = path.read_text(encoding="utf-8")
        fm = parse_frontmatter(text)

        notes.append({
            "filename":      path.name,
            "title":         fm.get("title", path.stem.replace("-", " ").title()),
            "prompt":        fm.get("prompt", ""),
            "tags":          normalize_list(fm.get("tags")),
            "sources":       normalize_list(fm.get("sources")),
            "date_created":  str(fm.get("date_created", "")),
            "date_modified": str(fm.get("date_modified", "")),
            "difficulty":    fm.get("difficulty"),
        })

    index = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "notes": notes,
    }

    output_path = NOTES_DIR / "index.json"
    output_path.write_text(
        json.dumps(index, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(notes)} note(s) to {output_path.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
