# Dependency audit — 2026-10-19

The Expo57/RN0.86.3 lockfile passes Expo Doctor21/21. `npm audit` reports21 affected package entries:18 high,3 moderate,0 critical. These are transitive chains from three underlying advisories:

- `braces`3.0.3: nested-pattern stack exhaustion (GHSA-vfj7-8cjw-p6xm), propagated through Metro/build tooling. The registry's latest release is still3.0.3.
- `node-forge`1.4.0: RSA signature verification issue (GHSA-86w9-cpqp-85rv), propagated through Expo CLI signing utilities. The registry's latest release is still1.4.0.
- `decode-uri-component`0.2.2 through Expo Router's `query-string`7.1.3: malformed-percent decoding denial of service (GHSA-vcc3-ghjq-m6fr). Patched0.5.0 is an ESM release; overriding the CommonJS dependency without integration evidence is not an accepted fix.

The audit's automatic proposals include incompatible Expo44/RN downgrades or a move to SDK58; do not run `npm audit fix --force`. No child gameplay feature supplies patterns or certificates to the build-tool dependencies. The Router URI decoder can be reached by links, so review this dependency and malformed external-link handling before public distribution. A local offline family preview has no hosted service processing arbitrary request URLs, but that does not make the dependency report clean.

Track compatible upstream fixes and repeat the full engineering/native/browser gates after a dependency change. A public release requires resolving or explicitly accepting these advisories with current exploit-path evidence. The current family-preview PR records them as residual dependency findings, separate from passing game-rule and saved-data tests.
