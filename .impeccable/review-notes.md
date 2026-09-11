# Brain prototype review

## Professional refinement

The owner requested a more professional result closer to Slack. Slack's live
homepage was inspected for hierarchy and product storytelling. Its assets,
testimonials, commercial claims, and brand were not copied. The prior Brain
revision is tagged `prototype-v2-native-reviewed`.

This refinement pairs the product stage with the headline and downloads, gives
website text and actions stronger hierarchy, adds a compact feature navigation,
and lets visitors inspect actual saved-review captures in place. Original native
assets and their provenance are unchanged. Speak and the closing download section
receive distinct fields within the existing blue/teal palette.

The independent professional finish reviewer returned `ship` with no material
fixes. The reviewer examined desktop, tablet, phone, narrow, Speak, and 200%
enlargement captures, plus the Slack benchmark and current source. The finding
applies to this prototype, not certification of app runtime behavior.

The detector ran once for this revision. Most findings identified revised tokens
against the previous DESIGN.md, which the documenter reconciles from actual code.
Wrapper-padding flags were checked visually: inset containers keep content away
from section edges. No native app pixels were restyled. The unchanged reading
page disclosure styles remain outside this homepage refinement.

Current browser evidence is in `artifacts/review/`; the prior captures are in
`artifacts/review-v2-native/`. Final packaging repeats the exact source rollback,
three-mode distribution staging, and extracted offline verification against the
new candidate. Nothing was published.

## Native Windows revision

The first prototype was rejected because its simulated interface felt fake.
This revision replaces those illustrations with native Windows captures and
pixel crops. The original bright Brain identity, logo, font, feature coverage,
and download destinations remain.

Impeccable 4.3.1 from `pbakaus/impeccable`, source
`cb56ed6c19a07329a9fa0cd4e657bee040156593`, informed the revision. The mechanical
detector ran once. Its actionable small-text findings were corrected. The
reported section-padding and glow findings were reviewed against the browser:
section content has an inset wrap and vertical padding; image shadows carry a
directional offset. Existing reading-page styles remain in `style.css`.

The independent finish reviewer initially returned `fix` and then returned
`ship`, scoring these five corrections resolved:

1. Nearly full-width native assistant detail on phones.
2. Responsive reflow at 200% enlargement with accessible controls.
3. Larger website captions/controls and opaque captions during image motion.
4. Separate Speak heading phrases at tablet/mobile sizes.
5. Speak indicator and caption clear of the inspection controls.

The final verdict covers those five scored fixes, not an independent
certification of every surface or of the native app's runtime behavior.

`artifacts/review/report.json` records passing browser checks, source hashes,
and limitations; `artifacts/review/gallery.html` opens the captures. Tests cover
both platform choices, 320/390/768/1440px widths, focus views and race handling,
keyboard access, copy/fallback, reduced motion, forced colors, no JavaScript,
200% CSS enlargement, routes, downloads, and native asset hashes. Accessibility
automation found no WCAG A/AA violations in the exercised homepage states.
Native Safari and Firefox were not tested.

The source UI is real; transcript content and several capture states were
seeded fixtures. `screenshots.html` explains that distinction publicly.
`tools/native-captures.json` retains origin and crop receipts. The final origin
scan reported 39 raster assets and zero missing origins. No AI-generated app
screens or reconstructed in-app HTML controls are used.

Publication remains pending owner review. `PROTOTYPE.md` contains the guarded
publication and one-command rollback procedure. The final candidate's rehearsal,
static bundle, and private generator staging reports are under `artifacts/`.
