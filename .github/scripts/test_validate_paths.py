import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("validate_paths", Path(__file__).with_name("validate-paths.py"))
paths = importlib.util.module_from_spec(spec)
spec.loader.exec_module(paths)
BASE = "a" * 40
HEAD = "b" * 40


class PathFilterTests(unittest.TestCase):
    def test_documentation_only(self):
        self.assertFalse(paths.needs_full_validation(["docs/PRD.md", "docs/nested/plan.md"]))

    def test_validation_inputs_and_unknown_paths(self):
        for name in ["docs/QA.md", "README.md", "PUBLIC_README.md", "content/library/books/edition.md",
                     "tests/fixtures/badge-rules.md", "src/app/index.tsx", "tests/game.test.ts",
                     "assets/image.png", "package-lock.json", "app.json", "vitest.config.mts",
                     ".github/workflows/ci.yml", ".github/scripts/validate-paths.py", "docs/code.ts", "new-file"]:
            with self.subTest(name=name):
                self.assertTrue(paths.needs_full_validation(["docs/PRD.md", name]))

    def test_empty_comparison_runs_full_gate(self):
        self.assertTrue(paths.needs_full_validation([]))

    @patch.object(subprocess, "check_output", return_value=b"src/old.ts\0docs/moved.md\0")
    @patch.object(subprocess, "run")
    def test_pull_request_uses_base_to_merge_commit_without_rename_detection(self, run, output):
        changed = paths.changed_paths("pull_request", {"pull_request": {"base": {"sha": BASE}}}, HEAD)
        self.assertTrue(paths.needs_full_validation(changed))
        output.assert_called_once_with(["git", "diff", "--no-renames", "--name-only", "-z", BASE, HEAD], timeout=30)
        self.assertEqual(run.call_count, 1)

    @patch.object(subprocess, "check_output", return_value=b"docs/plan with spaces.md\0docs/deleted.md\0")
    @patch.object(subprocess, "run", side_effect=[subprocess.CalledProcessError(1, "git"), None])
    def test_push_fetches_missing_before_commit(self, run, output):
        self.assertFalse(paths.needs_full_validation(paths.changed_paths("push", {"before": BASE}, HEAD)))
        self.assertEqual(run.call_args.args[0], ["git", "fetch", "--no-tags", "--depth=1", "origin", BASE])

    def test_unknown_event_or_missing_commit(self):
        for event, data, head in [("other", {}, HEAD), ("push", {"before": "0" * 40}, HEAD),
                                  ("push", {"before": BASE}, ""), ("push", {"before": "bad"}, HEAD)]:
            with self.subTest(event=event, data=data), self.assertRaises(ValueError):
                paths.changed_paths(event, data, head)

    def test_uncertain_comparison_fails_open(self):
        for error in [subprocess.CalledProcessError(1, "git"), subprocess.TimeoutExpired("git", 60),
                      OSError("no git"), KeyError("before"), ValueError("bad event")]:
            with self.subTest(error=error), tempfile.TemporaryDirectory() as directory:
                event = Path(directory, "event.json")
                event.write_text(json.dumps({"before": BASE}))
                output = Path(directory, "output")
                with patch.dict(os.environ, {"GITHUB_EVENT_PATH": str(event), "GITHUB_EVENT_NAME": "push",
                                             "GITHUB_SHA": HEAD, "GITHUB_OUTPUT": str(output)}), \
                        patch.object(paths, "changed_paths", side_effect=error):
                    paths.main()
                self.assertEqual(output.read_text(), "full=true\n")

    def test_real_git_docs_only_and_source_rename(self):
        script = Path(__file__).with_name("validate-paths.py").resolve()
        with tempfile.TemporaryDirectory(prefix="lig-path-filter-") as directory:
            root = Path(directory)

            def git(*args):
                return subprocess.check_output(["git", "-C", directory, *args], stderr=subprocess.DEVNULL).decode().strip()

            git("init")
            git("config", "user.name", "CI fixture")
            git("config", "user.email", "fixture@example.invalid")
            (root / "docs").mkdir()
            (root / "src").mkdir()
            (root / "docs/plan.md").write_text("a")
            (root / "src/a.ts").write_text("a")
            git("add", ".")
            git("commit", "-m", "base")
            base = git("rev-parse", "HEAD")
            (root / "docs/plan.md").write_text("b")
            git("add", ".")
            git("commit", "-m", "docs")
            event, output = root / "event.json", root / "output"
            event.write_text(json.dumps({"before": base}))
            env = {**os.environ, "GITHUB_EVENT_NAME": "push", "GITHUB_EVENT_PATH": str(event),
                   "GITHUB_SHA": git("rev-parse", "HEAD"), "GITHUB_OUTPUT": str(output)}
            subprocess.run(["python3", str(script)], cwd=root, env=env, check=True, capture_output=True)
            self.assertEqual(output.read_text(), "full=false\n")
            git("mv", "src/a.ts", "docs/a.md")
            git("commit", "-m", "rename")
            env["GITHUB_SHA"] = git("rev-parse", "HEAD")
            output.write_text("")
            subprocess.run(["python3", str(script)], cwd=root, env=env, check=True, capture_output=True)
            self.assertEqual(output.read_text(), "full=true\n")


if __name__ == "__main__":
    unittest.main()
