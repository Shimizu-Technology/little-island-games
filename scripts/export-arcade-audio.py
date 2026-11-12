#!/usr/bin/env python3
"""Stage Arcade's registered English lines for the lead's combined narration generation.
Run this immediately before scripts/generate-neural-audio.py at integration. Workers
must not generate speech or leave an incomplete live manifest in scripts/learn/.
"""
import json, subprocess
from pathlib import Path
root = Path(__file__).resolve().parents[1]
lines = json.loads((root / 'scripts/arcade-speech.json').read_text())
assert all(key.startswith('arcade-') and isinstance(text, str) and text.strip() for key, text in lines.items())
subprocess.run(['node', str(root/'scripts/words/generated-admission.mjs'), 'speech'], input=json.dumps(list(lines)), text=True, check=True, cwd=root)
(root / 'scripts/learn/arcade.json').write_text(json.dumps(lines, indent=2) + '\n')
print(f'Staged {len(lines)} Arcade lines. Generate and verify both banks before committing the staged manifest.')
