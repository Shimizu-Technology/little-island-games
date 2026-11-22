"""Skip the app gate only for documentation that validation never reads."""

import json
import os
from pathlib import Path
import re
import subprocess

# Markdown files under docs/ that automated tests read directly. Root READMEs,
# content Markdown, JSON files, assets, config and all unknown paths also keep
# the full gate.
TESTED_DOCS = frozenset({
    "docs/QA.md",
    "docs/ARCADE_BOUNDARIES.md",
    "docs/CRAB_DEPTH.md",
    "docs/ISLAND_HOME_3.md",
    "docs/QA_MATRIX.md",
})


def needs_full_validation(paths):
    return not paths or any(
        not (path.startswith("docs/") and path.endswith(".md") and path not in TESTED_DOCS)
        for path in paths
    )


def changed_paths(event_name, event, head):
    if event_name == "pull_request":
        base = event["pull_request"]["base"]["sha"]
    elif event_name == "push":
        base = event["before"]
    else:
        raise ValueError("Unknown event; run the full gate")
    if not all(re.fullmatch(r"[0-9a-f]{40}", sha or "") and set(sha) != {"0"} for sha in (base, head)):
        raise ValueError("Missing comparison commit; run the full gate")
    # Checkout stays shallow. Fetch just the comparison commit when needed.
    try:
        subprocess.run(["git", "cat-file", "-e", f"{base}^{{commit}}"], check=True, capture_output=True, timeout=10)
    except subprocess.CalledProcessError:
        subprocess.run(["git", "fetch", "--no-tags", "--depth=1", "origin", base], check=True, capture_output=True, timeout=60)
    # Include BOTH paths of a rename so moving/deleting source cannot skip CI.
    names = subprocess.check_output(["git", "diff", "--no-renames", "--name-only", "-z", base, head], timeout=30)
    return [name.decode("utf-8") for name in names.split(b"\0") if name]


def main():
    full = True
    try:
        event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
        full = needs_full_validation(changed_paths(os.environ["GITHUB_EVENT_NAME"], event, os.environ["GITHUB_SHA"]))
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
        # Missing history or uncertain input must never suppress validation.
        print(f"Cannot prove documentation-only change ({type(error).__name__}); running full validation")
    result = f"full={str(full).lower()}\n"
    print(result, end="")
    with open(os.environ["GITHUB_OUTPUT"], "a") as output:
        output.write(result)


if __name__ == "__main__":
    main()
