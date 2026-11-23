"""Keep classification and the three independent validation lanes wired together."""
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = (ROOT / '.github/workflows/ci.yml').read_text()
JOBS = dict(re.findall(r'^  (\w+):\n(.*?)(?=^  \w+:\n|\Z)', WORKFLOW.split('jobs:\n', 1)[1], re.M | re.S))


class WorkflowTests(unittest.TestCase):
    def test_three_parallel_lanes_depend_only_on_classification(self):
        self.assertEqual(set(JOBS), {'changes', 'puzzles', 'check', 'export'})
        for name, timeout in [('puzzles', 45), ('check', 30), ('export', 30)]:
            with self.subTest(job=name):
                job = JOBS[name]
                self.assertIn('    needs: changes\n', job)
                self.assertIn("    if: needs.changes.outputs.full == 'true'\n", job)
                self.assertIn(f'    timeout-minutes: {timeout}\n', job)
                self.assertIn('run: npm ci --prefer-offline', job)

    def test_fast_classification_has_no_node_install(self):
        job = JOBS['changes']
        self.assertIn('timeout-minutes: 5', job)
        self.assertIn('full: ${{ steps.paths.outputs.full }}', job)
        self.assertIn('run: python3 .github/scripts/validate-paths.py', job)
        self.assertIn("run: python3 -m unittest discover -s .github/scripts -p 'test_*.py'", job)
        self.assertIn("if: steps.paths.outputs.full == 'false'", job)
        self.assertNotIn('npm', job)
        self.assertNotIn('fetch-depth: 0', job)

    def test_commands_and_export_policy_stay_in_their_lanes(self):
        self.assertIn('run: npm run registry:check && npm run save:catalog && npm run puzzles:verify', JOBS['puzzles'])
        for ref in ['program/4.0', 'main']:
            self.assertIn(f'+refs/heads/{ref}:refs/remotes/origin/{ref}', JOBS['puzzles'])
        self.assertIn('run: npm run typecheck && npm run lint && npm test', JOBS['check'])
        export = JOBS['export']
        for text in ['Restore Metro transforms', '${{ runner.temp }}/metro-cache', 'run: npm run export:web',
                     'run: npm run check:words:export', 'run: npm run doctor',
                     'LITTLE_ISLAND_WORD_POLICY_GZIP_BASE64: ${{ secrets.LITTLE_ISLAND_WORD_POLICY_V2_GZIP_BASE64 }}']:
            self.assertIn(text, export)
        self.assertLess(export.index('run: npm run export:web'), export.index('run: npm run check:words:export'))
        self.assertLess(export.index('run: npm run check:words:export'), export.index('run: npm run doctor'))
        self.assertIn("cancel-in-progress: ${{ github.event_name == 'pull_request' }}", WORKFLOW)

    def test_local_gate_contract_is_unchanged(self):
        scripts = json.loads((ROOT / 'package.json').read_text())['scripts']
        self.assertEqual(scripts['check'], 'npm run check:source && npm run check:words:export')
        self.assertEqual(scripts['check:source'], 'npm run registry:check && npm run save:catalog && npm run puzzles:verify && npm run typecheck && npm run lint && npm test && npm run export:web')
