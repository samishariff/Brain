# Native Windows prototype review

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
