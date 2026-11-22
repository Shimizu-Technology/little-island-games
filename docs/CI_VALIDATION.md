# Validate performance — November 21, 2026

Validate keeps one Linux job named `check`. Every application, dependency,
configuration, asset, test, workflow or unknown-path change still runs the full
`npm run check` and `npm run doctor` gates. This change does not publish a build.

## Profile before changing the workflow

The task's 30-day planning baseline is **14.6 minutes**. The latest five
successful `main` jobs available at inspection had a **10.42-minute median
runner duration**, excluding queue time. These are different samples, so neither
is a measured before/after result for this PR.

| Successful main run | Runner minutes | Test seconds | Metro bundle seconds |
| --- | ---: | ---: | ---: |
| [42040568270](https://github.com/Shimizu-Technology/little-island-games/actions/runs/42040568270) | 12.45 | 131.01 | 433.99 |
| [42042704004](https://github.com/Shimizu-Technology/little-island-games/actions/runs/42042704004) | 9.28 | 101.16 | 314.83 |
| [42045057669](https://github.com/Shimizu-Technology/little-island-games/actions/runs/42045057669) | 9.87 | 99.70 | 360.66 |
| [42065734185](https://github.com/Shimizu-Technology/little-island-games/actions/runs/42065734185) | 12.85 | 161.75 | 454.40 |
| [42114843196](https://github.com/Shimizu-Technology/little-island-games/actions/runs/42114843196) | 10.42 | 119.52 | 374.78 |

Step timestamps and Vitest/Metro summaries in those logs identify the main costs:
Metro 5.25–7.57 minutes; tests 1.66–2.70 minutes; lint 51–70 seconds;
typecheck 19–26 seconds; `npm ci` 15–49 seconds; Doctor 7–11 seconds.
Dependency downloads already have the setup-node npm cache. This workflow has
no Playwright/browser installation to cache. The export previously passed
`--clear` on every invocation, discarding reusable transforms.

Six newer successful feature-branch runs were also inspected. Their suites
contain additional, unmerged tests and sometimes extra gates; their durations
are not the baseline for this `main` change.

## Changes and safeguards

- Cache Metro transforms with OS, architecture, Node major, dependency/config
  hashes and a per-commit suffix. Restore only from the same dependency/config
  prefix. The installed Expo 57 configuration stores these in
  `os.tmpdir()/metro-cache`; the workflow sets TMPDIR to runner.temp.
- Stop clearing that store on each web export. Exported bundles, generated
  Library validation/indexing and the offline shell are rebuilt on every full
  run; `dist` is never restored. Metro still keys transforms by source and
  transform options. See [Expo export options](https://docs.expo.dev/more/expo-cli/#exporting)
  and [Metro caching](https://metrobundler.dev/docs/configuration/#cachestores).
- Use two isolated Vitest workers in GitHub Actions and up to two Metro workers.
  On a two-core private runner the previous cores-minus-one defaults use one.
  No shards, extra jobs, reduced assertions or changed test budgets are added.
- Reuse npm's download cache with `npm ci --prefer-offline`; lockfile resolution,
  lifecycle scripts and the existing audit behavior remain enabled.
- Cancel superseded pull-request runs. Main pushes are not canceled. Set the
  job timeout to 30 minutes, about twice the supplied normal duration.
- Skip the app gate only when every changed path is Markdown under `docs/`,
  excluding `docs/QA.md`, which an existing test reads. Root READMEs, content
  Markdown and test fixtures retain full validation. The job still reports
  `check` for documentation changes. Renames include both paths; empty diffs,
  unknown events, missing history, fetch/diff failures and timeouts run the full
  gate. A Python regression suite runs even on the documentation path.

GitHub's branch endpoint reported `main` as `protected: false`, protection
disabled, and required contexts/checks empty. Protection/ruleset endpoints
returned HTTP 403 with the private Free-plan feature restriction. No repository
settings were changed. Workflow `Validate` and job/check `check` are unchanged.

## Local acceptance

Base: `cca8aa0039a46139878d6dadc18bd1db2fff6c7c` (`origin/main`). Agent executed on
the MacBook with Node 22.23.5. CI retains Node 22.22.3.

- Runtime collection with `vitest list --json --no-static-parse` before/after:
  **2,366 identical test names in 194 files**, one worker versus the new Actions
  two-worker setting. Existing test files, discovery glob, isolation and
  timeouts are unchanged. Static parsing alone undercounts parameterized cases.
- Eight Python filter tests passed, including real Git documentation-only and
  source-to-documentation rename cases, mixed inputs and uncertain comparisons.
- Targeted Library foundation/integration/collection, public source export and
  iOS preview-script suites: **33/33 passed**, using the Actions worker setting.
- Typecheck and lint passed; lint reported 41 existing warnings, zero errors.
  actionlint 1.7.11 and `git diff --check` passed.
- A cold local export bundled in 128.00 seconds. Cached exports bundled in
  77.79 and 77.84 seconds (82.60 and 82.15 seconds for the complete commands).
  All **6,482 exported files were byte-identical**, including the offline shell
  fingerprint and 6,480-resource precache. The exploratory cold export used the
  Mac's default worker count; cached runs used two. These are cache correctness
  evidence, not a controlled GitHub speed benchmark.
- A temporary label edit appeared in the next cached JavaScript bundle and
  changed the offline fingerprint, confirming source invalidation. The original
  source was restored byte-for-byte; no application-source diff remains.
- Independent implementation review found no material findings and separately
  passed the filter tests and whitespace check. Recent CodeRabbit free-plan
  comments report summaries without code reviews; that is not review approval.

Full-suite execution remains the CI gate. UI/native/device acceptance was not
rerun because this changes validation infrastructure, not application behavior.

## Expected result and lead verification

**Projection, not measured:** warm full runs around **6–8 minutes**, consuming
about **6–8 Linux runner minutes** because there is still one job. Against the
supplied 14.6-minute baseline, that is about 6.6–8.6 fewer minutes per full run.
Documentation-only runs should round to roughly one billed minute. Cold cache
misses retain full work plus cache-transfer overhead; confirm their cost too.
No increase in org job concurrency is introduced.

At inspection, recent runs failed before any steps started. The annotation on
[44409220706](https://github.com/Shimizu-Technology/little-island-games/actions/runs/44409220706)
says recent account payments failed or the spending limit needs increasing.
No billing change is authorized or made here. This prevents claiming a measured
post-change CI median or a green full gate.

The desk lead must verify the final head's full gate, then compare several cold
and warm completed runs with comparable source/test counts. Use job start/end
times and GitHub's rounded per-job billed minutes, separately from queue time;
include cache restore/save overhead. Confirm docs-only, mixed-change and
missing-history behavior. Keep the draft held until full CI passes and the
speed/minutes requirement is supported. The implementation worker does not
watch CI, merge, deploy or change billing.
