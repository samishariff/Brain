# Brain website prototype

This branch is a complete local prototype. **Nothing has been published.** The
public site is `https://samishariff.github.io/Brain/`, deployed by GitHub Pages
from the root of `samishariff/Brain`'s `main` branch. Do not merge or push to that
branch until the owner approves the exact reviewed prototype revision.

## Draft PR hold: Mac screenshots required

The owner approved preserving this direction in a draft PR, not publishing it.
Keep the PR in draft and do not merge, enable auto-merge, or deploy until:

- Equivalent current native Mac captures cover meeting detection, live
  transcription, the meeting assistant, speaker review and remembered voices,
  saved meeting review, and Speak including its floating indicator.
- Mac captures retain their source/version receipts and clearly label sample
  content and staged states, following the Windows provenance standard.
- The website presents the corresponding Mac and Windows imagery when a visitor
  chooses a platform; review the layouts and interactions for both.
- Reconcile any newer release/download changes on public `main`, then rerun
  browser checks, distribution staging, and rollback rehearsal for the candidate.
- The owner reviews and explicitly approves the complete Mac/Windows candidate
  for publication.

A feature-branch push backs up the work. GitHub Pages currently publishes only
`main` at the repository root, so this draft PR does not update the public site.

## Speaker screenshot refresh

The speaker-diarization scene now shows the saved transcript's distinct voice
turns and playback controls. The voice-memory section shows the revised People
sample and Assign person / This is me / Skip controls. Both use fresh native
captures of the interface merged in
[Windows PR #114](https://github.com/samishariff/Brain-Windows/pull/114), with
seeded demonstration content. These development images do not establish that
the revised UI is in the downloadable installer or that real speech was tested.

`tools/native-captures.json` keeps the original source/date defaults for older
images. Refreshed assets have their own `sourceCommit` and `capturedUtc`, as well
as original-image hashes and exact pixel crops. `screenshots.html` links the full
saved transcript and People captures. Source pixels are never repainted.

The isolated capture receipt, fixture-only overlay, build log and original PNGs
are retained locally in `artifacts/native-speaker-refresh/`. To import those
captures again, run `tools/Import-SpeakerCaptures.ps1`; the committed
`tools/speaker-capture-crops.json` defines the crops. If regenerating all older
assets with `tools/Import-NativeCaptures.ps1`, run the speaker importer afterward
to apply the refresh without changing the older images' provenance.

The previous browser evidence is preserved in
`artifacts/review-before-speaker-refresh/`. The current `npm test` review writes
`artifacts/review/`; additional selected-speaker and People section captures at
1440, 768, 390 and 320 pixels are in `artifacts/speaker-refresh-browser-final/`.
These section captures use taller viewports to frame the complete section below
the sticky header; the ordinary browser suite also checks standard screen sizes.
The initial screenshot framing artifacts are retained in
`artifacts/speaker-refresh-browser/`.

Final native capture build/run passed. `npm test` passed all 14 browser test
groups plus its crawled-route receipt, with zero findings and 23 screenshots.
Independent review verified all four refreshed assets against original decoded
native pixels/crops, preserved all eight older assets and their receipts, and
cleared all eight final speaker/People section captures. No app inference,
native Mac capture, distribution staging or publication was performed for this
focused screenshot update.
The publication and Mac-capture hold above still applies.

## Review it

With Node.js 22 or later installed, run from this directory:

```powershell
npm run preview
```

Open `http://127.0.0.1:4173/Brain/`. The preview binds only to this computer.
No dependency installation is needed to serve it. Ctrl+C stops it; set `PORT`
to choose another port. You can also open `index.html` directly from disk.
Clipboard behavior depends on the browser; a selection fallback is included.

Suggested review:

1. Switch between Mac and Windows, then reload. Check the selected download
   and platform-specific explanations.
2. Select each of the three meeting stages. Tab, Enter, and arrow keys work.
3. Use Workspace, Transcript, and Assistant to inspect the native Windows
   capture. Replay its layered entrance; open any capture at full size.
4. Review voice memory and Speak. Focus on dictation history to inspect a
   genuine crop. The floating Listening pill is the actual Windows control.
5. Copy the CLI example and follow **Connect your tools**. Switch platforms in
   the guide to see the appropriate launch and export commands.
6. Review the page at a narrow phone width and with reduced motion enabled.

The professional refinement pairs the headline and download with the Windows
product stage in the first desktop screen. The sticky header, feature navigation,
larger supporting type, blue actions, and separate Speak and closing sections
make the page easier to scan. In saved meeting review, switch between the actual
question, summary, and action captures without leaving the page. Keyboard arrows
work; the original image links remain available when JavaScript is disabled.

Slack's live homepage was inspected as a reference for product storytelling and
hierarchy, not copied as a visual template. Brain retains its own logo, palette,
font, imagery, and truthful preview qualifications. The preceding native revision
is preserved at `prototype-v2-native-reviewed` (`4f873b52`), with its local review
gallery in `artifacts/review-v2-native/` and its existing offline bundle intact.

Download buttons retain the current production targets. Clicking a download
can download the real app. The Microsoft Store option remains disabled.

All application visuals are native captures, with sample content clearly
identified. There are no recreated HTML app controls, fake transcript playback,
invented assistant output in website code, or simulated cross-app insertion.
The website animates image presentation, not a running app. See
`screenshots.html` for the public explanation of the capture method and limits.

The new captures use Windows source `7dd614a9e383ba4a565b6755fe41dd753b4b93d8`.
Production UI code was unchanged; a capture-only test orchestration overlay
seeded meeting content, voice review, assistant text, recording health/timer,
Speak history, and Listening state on an isolated desktop/profile. These images
prove the native appearance, not successful live calls, ASR, or text insertion.
The older saved-review image retains its generated sample meeting and actual
local-model answer. Development captures may differ from the downloadable preview.

`tools/native-captures.json` records source hashes, crop rectangles, and final
asset hashes. `tools/Import-NativeCaptures.ps1` reproduces the imports from the
local `artifacts/native-capture-v2` receipts. PNG origins are embedded; unchanged
legacy WebP files carry origin sidecars. Private capture fixtures stay out of
the public bundle. The rejected first prototype remains tagged
`prototype-v1-reviewed` for easy local comparison.

This revision applies [Impeccable](https://github.com/pbakaus/impeccable),
version 4.3.1 at `cb56ed6c19a07329a9fa0cd4e657bee040156593`: real artifacts lead,
native details create the depth, typography carries the hierarchy, and motion
serves image inspection. `PRODUCT.md`, `.impeccable/surface-brief.md`, and
`DESIGN.md` preserve product facts and the implemented design system.

## Verification and evidence

```powershell
npm ci
npm test
```

Tests use headless Microsoft Edge by default. Set `BRAIN_WEBSITE_BROWSER` to a
Chromium executable or `BRAIN_WEBSITE_BROWSER_CHANNEL` to `chrome` to override.
Browser installation is not automatic. `npm ci` installs the pinned development
dependencies only; the public site loads no third-party JavaScript or fonts.

Open `artifacts/review/gallery.html` for the screenshot gallery and
`artifacts/review/report.json` for source hashes, checks, findings, and limits.
Coverage includes both platforms at 1440, 768, 390, and 320 pixels; keyboard
navigation; all walkthrough stages; native focus and saved-review controls; clipboard fallback;
WCAG A/AA checks; reduced motion; forced colors; no JavaScript; blocked storage;
200% CSS zoom; local routes/fragments; and preserved release destinations.

The review exercises the website in Chromium/Edge. It does not certify app
features, native Safari/Firefox rendering, or physical microphones.

## Offline review bundle

After committing the candidate:

```powershell
npm run bundle
```

`artifacts/brain-prototype-<commit>/site.zip` is a standalone static site: extract
and open `index.html`. `source.zip` includes preview, testing, rollback tooling,
and this guide. The bundle also includes a SHA-256 file manifest and the release
pipeline handoff manifest. No private app source, meetings, or personal data are
included. Review evidence stays in `artifacts/review/`.

## Prepare an approved launch

1. Finish owner review and record the approved candidate commit. Re-run affected
   checks after any changes. Keep the redesign in a dedicated two-parent merge
   commit; do not squash it or mix in unrelated release updates.
2. Run `node tools/release.mjs prepare`. It checks live GitHub Pages settings and
   the production commit. If production advanced, reconcile those changes,
   update `tools/release-baseline.json`, retest, and obtain approval of the new
   candidate. The command archives the current production source and static
   site, writes file hashes, and creates a local backup tag. It never publishes.
3. Run `npm run test:rollback`. Review `artifacts/rollback-rehearsal.json`.
4. Stage the existing application release integration with the command below.
   Review its rendered output before publishing; keep the staged integration
   with the approved candidate.
5. Only after approval, push the prototype branch and backup tag and open/merge
   its dedicated PR using a merge commit. Record the resulting merge SHA next
   to the prelaunch `baseline.json`, plus this runbook and rollback script in an
   external backup directory. Keep that directory outside any checkout that
   will be reverted.
6. Check `gh api repos/samishariff/Brain/pages/builds/latest` for a successful
   build of the merge revision. Verify the public homepage, both platforms,
   walkthrough, Speak, guide, asset loads, and download URLs. GitHub Pages build
   and cache propagation can take several minutes.

There is deliberately no automatic publication command for the prototype.

## One-command rollback

Use a clean, dedicated production checkout at the current public `main`. Its
`tools/release.mjs` and `tools/release-baseline.json` come from the redesign.
Keep the prelaunch snapshot outside that checkout. Substitute the recorded
redesign merge SHA and the snapshot's full path:

```powershell
node tools/release.mjs rollback --merge MERGE_SHA --manifest E:/Backups/Brain-site/baseline.json --publish
```

This verifies the deployment target, snapshot hashes, merge ancestry, clean
checkout, and current production head; makes a new revert commit; checks restored
public-file hashes; and pushes that commit to `main`. It never rewrites history,
changes release assets, or downgrades installed apps. A normal non-force push
also rejects a remote advance that occurs during rollback.

Omit `--publish` to create only the local revert commit. Reverting removes the
new tools from that checkout, so do not try to re-run the removed script to
publish afterward. Inspect the local commit and use an ordinary `git push
origin HEAD:main` only when publication is authorized and main is still current.

If later commits touched a redesign file, rollback stops before changing
anything and names the overlapping files. Reconcile those changes explicitly
instead of restoring an old homepage over a newer download. Later non-overlapping
updates are preserved. The rehearsal tests both cases and exact baseline recovery
in a separate temporary repository with no remote.

After rollback, check the Pages build revision and the public URLs again. This
is a single-command source rollback, not an instant cache purge. Preserve both
the archived source and `site.zip` as a recovery fallback.

## Application release pipeline integration

The older private Windows distribution generator pins an earlier public site
and rejects JavaScript assets. The prototype includes a staging adapter to
reconcile those assumptions without changing the app checkout:

```powershell
powershell -NoProfile -File tools/Stage-Distribution.ps1 -ApplicationRepository E:/OpenCode/Brain-Windows
```

The adapter creates a fresh fixture beneath `artifacts/`, preserving the
application generator's release substitutions. It stages the complete site,
adds the reviewed local JavaScript asset type and validated WebP origin sidecars,
updates the public repository
binding to `samishariff/Brain`, and regenerates the hashed baseline. It runs the
existing generator in Holding, LocalPreview, and Release modes and verifies the
new features, scripts, guide, Store setting, and Mac download survive.

The staged `integration-report.json` identifies the source and render paths.
The application checkout is unchanged. After approved publication, bind the
staged baseline's commit to the actual public merge SHA, then integrate the
reviewed scripts, templates, and baseline into the application release pipeline
before its next site publication. Keep remote-head and file-hash guards enabled.
If the app's generator has changed, the adapter stops for reconciliation.

## Feature evidence used

- Current public Mac setup/release notes: Zoom/Teams detection, live source
  tracks, voice learning, post-meeting speaker attribution, and preview limits.
- Windows app recording settings and implementation notes: ask/automatic
  detection policy, live transcripts, enrolled voices, and Speak insertion limits.
- Mac CLI `DataCommands.swift`, `ExportCommand.swift`, and README: scoped reads,
  JSON search, directory export, and MCP registration.
- Windows CLI `Program.cs`, portable launcher, and README: scope-bound reads,
  file export, launcher/database selection, and standard versus review MCP access.

Claims are intentionally limited to those interfaces. “Any harness” means a
local harness capable of invoking CLI commands; MCP requires a compatible
client. A harness's model settings control whether retrieved context leaves
the computer.
