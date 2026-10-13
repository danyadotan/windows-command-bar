# WinPilot controlled beta and paid-distribution readiness

Assessment: 2026-10-13. Baseline: main `9ee22e0440f26ec9f21ec9f5f438983e67ebcc10`, version 0.1.1. WinPilot is an internal-test candidate, not yet an approved customer beta or paid release. This assessment does not select it as a sales finalist.

## Verified release evidence

[Windows main run 38044816264](https://github.com/danyadotan/windows-command-bar/actions/runs/38044816264) succeeded on October 10: dependency audit, tests, TypeScript/Vite build, x64 NSIS packaging, packaged Native Messaging ping, and extension ZIP creation. Installer artifact 11666767137 and extension artifact 11666986969 were unexpired on October 13; both expire January 8, 2027. Artifact archive digests are not installer-file hashes or Authenticode evidence. No GitHub Releases existed at inspection.

The repository is public and MIT licensed. `private: true` in package.json only prevents npm publishing; it does not control customer downloads or software use. No customer entitlement, checkout, license enforcement, or automatic updater is implemented in the inspected source. Signing certificate/service availability is unknown; secret availability was not inspected. Existing builds are explicitly unsigned/internal-only.

| Requirement | Current evidence | Next action / dependency |
| --- | --- | --- |
| Dependency gate, unit tests, build | Existing Windows CI passed; Electron lockfile 44.7.0 | Rerun on every candidate; audit is time-sensitive |
| x64 per-user installer | Built successfully | New install/launch/uninstall CI smoke must pass |
| Native host | Packaged ping passed | Test actual Edge/Chrome profile retrieval with synthetic data |
| Trusted signing | Not verified; artifacts labeled unsigned | Approved identity and signing service/certificate; may require identity checks and spending |
| Final-binary identity | Archive digest exists | New CI installer hash evidence; final signed hashes must be recorded separately |
| Clean Windows validation | Not evidenced | Windows 11 standard-user VM/hardware and human interactive testing |
| Onboarding | Developer instructions exist | Follow the five-minute flow below; verify with a first-time tester |
| Customer access | No entitlement system | Authenticated delivery portal and invitation roster; approval before external invitations |
| Extension production delivery | Unpacked testing instructions only | Store review and confirmed store extension ID, or approved enterprise policy deployment |
| Update integrity | No updater found | Start with signed manual updates; add verified updater only when needed |
| Paid offering | Public MIT source; no billing system | Choose paid support/setup or managed service; approve pricing, billing, terms and support scope |

## Fastest maintainable path

1. Keep unsigned candidates inside an internal test team. Pass the new installation smoke; preserve run, commit and checksum evidence. Do not describe an internal artifact as a public beta.
2. Scope the first external beta to the desktop command bar, local library, and Downloads preview/undo using disposable sample files. Browser companion and local-model hardware support stay optional experimental features until their separate checks pass. Full MCP is not required for this narrow beta; do not claim native MCP support.
3. Select an approved signing provider supporting the publisher's identity and region. Prefer managed signing or hardware-backed certificate storage. Validate current provider eligibility and pricing before any purchase. Existing certificate-file variables are one integration option, not proof that a usable certificate exists. Sign the host before packaging, then app and installer; verify all final signatures and timestamps using `verify-signatures.ps1`.
4. Validate the exact signed candidate on a clean Windows 11 x64 standard-user machine. CI smoke is complementary evidence, not a substitute for interactive testing or SmartScreen observation.
5. After release approval, invite a small named cohort (suggested: 5–10 testers). Deliver via authenticated accounts and short-lived download URLs, maintain a version/access roster, and provide one support channel. Public GitHub prereleases are public downloads; labels and obscure URLs are not access controls. A private artifact repository is an alternative but requires explicit repository setup/visibility approval. Never change this repository's visibility as part of this plan.
6. Use manually delivered signed updates initially. Notify approved testers of fixes and revoked versions through the agreed channel. Revoking a download link cannot revoke an installed offline app; strong entitlement requires additional application/server work.
7. Charge only after installation, recovery, support and value are demonstrated. Given the MIT license, sell onboarding/support or managed convenience rather than assuming source-code exclusivity. No revenue forecast or guaranteed day-one sales is established.

## Five-minute first-use onboarding

Before download: disclose experimental scope, supported Windows version, publisher identity, uninstall instructions, local storage, cloud-provider data boundaries, and that BYOK provider usage may incur separate costs. Obtain beta participation agreement through the approved delivery process.

1. Download the approved version; compare SHA-256 against the authenticated release record and verify the publisher signature. Stop on unexpected publisher, invalid signature, or tampering. Do not instruct customers to disable SmartScreen or antivirus.
2. Install as a standard user and open WinPilot. Confirm the visible command bar and test Alt+Space (check shortcut conflicts).
3. Save a non-sensitive note and retrieve it. Preview organizing a dedicated sample Downloads set; confirm exactly what moves, then undo. Do not begin with real customer files.
4. Add an AI provider only if desired. Use a restricted test key, explain external processing and separate provider charges, and verify key removal. Private-data routing is heuristic and must not be represented as comprehensive data-loss prevention.
5. Ask the tester to perform one useful action; record time to first successful action and any blocked step using opt-in feedback without collecting file names, keys, profiles, screenshots, or prompt content by default.

## Clean-machine acceptance record (all fields required before external beta)

Record candidate commit, version, installer SHA-256, approved publisher thumbprint, signature/timestamp verification output, Windows build, test date, tester, and pass/fail evidence. Use synthetic data.

- Standard-user install, custom install directory with spaces, first launch, Alt+Space, and a restart/relaunch.
- Local save/search and screenshot from a populated clipboard; clear errors with an empty clipboard.
- Downloads preview, cancellation, explicit confirm, collision handling, changed-file rejection, and undo.
- Windows Update read-only scan; winget absence/error behavior; an approved exact-package test only on a disposable machine.
- Cloud key save/remove, provider error behavior, private-data hold without local runtime, failed local runtime with no cloud fallback. Confirm shipped model IDs against live provider availability before offering cloud functionality.
- Optional extension: approved fixed ID, real browser Native Messaging, empty-field-only filling, forbidden fields excluded, session clearing, no profile persistence, and valid links. Store identity may differ from the unpacked ID; update/test both origin allowlists before store deployment.
- Uninstall removes browser registrations and generated host manifests. Verify saved data retention and document how users can delete remaining app data; do not erase user data automatically merely to pass a test.
- Upgrade from previous beta without loss of saved data, install rollback/recovery, Windows security/SmartScreen behavior, accessibility and Hebrew RTL usability.

## Distribution choices

| Option | Fit | Gate |
| --- | --- | --- |
| Existing GitHub Actions unsigned artifact | Internal engineering tests | Not customer access control; no public production claim |
| Signed installer through authenticated portal | Fastest narrow external beta | Signing, clean-machine acceptance, approved invitations, access roster |
| Microsoft Store / reviewed browser store | Later broad consumer distribution | Packaging/store requirements, identity, review, current policy validation |
| Enterprise-managed distribution | Organization pilot | Customer IT approval, signed packages, policy-controlled extension delivery |

No portal, payment account, signing subscription, store listing, invitation, or public release has been created by this assessment.

## Beta exit metrics (proposed targets, not results)

For a 5–10-person cohort: all installs pass signature checks; at least 80% complete a first useful action within five minutes; zero unexplained file mutations or private-data cloud fallback; all tested undo operations restore expected files; fewer than 20% need installation assistance. Record recovery time from a blocked action and repeat use of the chosen workflow. Any data-loss or unintended-upload incident stops expansion. Review after one week before deciding on a paid pilot.

## Implementation boundaries

This change adds installation smoke, installer identity evidence, a fail-closed signature verifier, and this beta runbook. Linux tests cannot verify Windows installer behavior, certificate trust, browser integration, SmartScreen, or signing. The new Windows scripts require a successful Windows CI run before being called validated. Human release approval remains required.
