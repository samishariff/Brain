---
name: Brain
description: A bright blue and teal website framing Brain's authentic native app imagery.
colors:
  ink: "#172f3e"
  muted: "#4d636d"
  blue: "#155fd1"
  teal: "#086f74"
  paper: "#f6f8f5"
  line: "#d5dfdc"
  white: "#fff"
  meeting-surface: "#e8eeeb"
  agents-surface: "#e7f0ed"
  deep-surface: "#142c38"
  deep-text: "#f4f8f5"
  deep-muted: "#b8d0d6"
  command-paper: "#fcfefc"
  command-ink: "#184534"
  reading-ink: "#18242e"
  reading-muted: "#52616d"
  reading-blue: "#1769e0"
  reading-teal: "#006f73"
  reading-line: "#dce3e9"
  wash: "#f5f7fa"
typography:
  display:
    fontFamily: 'Manrope, "Segoe UI", sans-serif'
    fontSize: "clamp(52px, 6.4vw, 88px)"
    fontWeight: 650
    lineHeight: 1.04
    letterSpacing: "-.04em"
  headline:
    fontFamily: 'Manrope, "Segoe UI", sans-serif'
    fontSize: "clamp(34px, 3.7vw, 52px)"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-.04em"
  title:
    fontFamily: 'Manrope, "Segoe UI", sans-serif'
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.18
    letterSpacing: "-.025em"
  body:
    fontFamily: 'Manrope, "Segoe UI", sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.9
  label:
    fontFamily: 'Manrope, "Segoe UI", sans-serif'
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.8
  reading-display:
    fontFamily: 'Manrope, "Segoe UI", sans-serif'
    fontSize: "clamp(40px, 4.2vw, 58px)"
    fontWeight: 650
    lineHeight: 1.14
    letterSpacing: "-.038em"
  reading-body:
    fontFamily: 'Manrope, "Segoe UI", sans-serif'
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.7
  command:
    fontFamily: "ui-monospace, Consolas, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.9
rounded:
  control: "4px"
  button: "6px"
  code: "8px"
  image: "9px"
  workspace: "10px"
  panel: "12px"
  pill: "999px"
spacing:
  compact: "12px"
  control-gap: "18px"
  inset: "20px"
  inset-wide: "24px"
  content-gap: "30px"
  section: "100px"
  section-tablet: "75px"
  section-mobile: "60px"
  reading-section: "clamp(64px, 8vw, 112px)"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.button}"
    padding: "13px 20px"
  button-primary-hover:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.white}"
  button-reading:
    backgroundColor: "{colors.reading-blue}"
    textColor: "{colors.white}"
    rounded: "{rounded.image}"
    padding: "12px 23px"
  platform-option:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "5px 20px"
  platform-option-selected:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
  focus-control:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    padding: "8px 0"
  focus-control-selected:
    textColor: "{colors.teal}"
  replay-button:
    backgroundColor: "transparent"
    textColor: "{colors.teal}"
    padding: "7px 0"
  copy-button:
    backgroundColor: "#edf6f1"
    textColor: "#22513e"
    rounded: "{rounded.control}"
    padding: "6px 10px"
  command-sheet:
    backgroundColor: "{colors.command-paper}"
    rounded: "{rounded.image}"
    padding: "25px"
---

# Design System: Brain

## Overview

**Creative North Star: "Brain, in focus"**

Brain's existing blue and teal identity frames authentic native app captures on bright, lightly tinted website surfaces. Manrope, generous section space, and restrained website controls keep the app imagery prominent. The original Brain logo remains the identity anchor.

This is a record of the completed prototype, derived from `style.css`, `showcase.css`, `index.html`, `showcase.js`, `agents.html`, and `screenshots.html`. “Brain, in focus” describes the implemented image-inspection pattern; it is not a newly approved brand direction. Homepage values are scoped overrides; reading pages retain the incumbent white canvas and base palette. Native screenshot typography, controls, colors, and floating indicators are image content, not website tokens.

**Key Characteristics:**

- Bright paper surfaces, dark blue ink, teal links, and blue keyboard focus.
- Authentic app windows with readable crops and full-size inspection links.
- Manrope headings and compact, quiet website controls.
- Layered imagery with one authored entrance and interruptible selection motion.
- Quieter reading pages sharing the logo, type family, and blue/teal identity.

## Colors

The website combines cool ink and blue with muted teal and pale green surfaces; the frontmatter records the reused values, not every local adjustment.

### Primary

- **Blue:** Keyboard outlines and active navigation on the homepage. The reading-blue variant also fills incumbent primary buttons.
- **Teal:** Links, selected image controls, headline emphasis, and primary-button hover.

### Secondary

- **Meeting surface / Agents surface:** Pale green section bands supporting native imagery and real command examples.
- **Deep surface / Deep text / Deep muted:** The saved-meeting review section's dark website frame and readable foreground hierarchy.
- **Command paper / Command ink:** The CLI example sheet and command text.

### Neutral

- **Ink / Muted:** Homepage heading and body hierarchy.
- **Paper / White:** Homepage canvas and selected platform surfaces.
- **Line:** Homepage boundaries and header/footer dividers.
- **Reading ink / Reading muted / Reading line / Wash:** Incumbent reading-page text, borders, and inset notes on white.

**The Scoped Identity Rule.** Homepage overrides refine the existing identity; preserve the reading-page palette unless that surface is intentionally changed.

## Typography

**Display Font:** Manrope, with Segoe UI and sans-serif fallbacks.  
**Body Font:** The same Manrope stack.  
**Label/Mono Font:** Manrope for website controls; system monospace only for real commands and technical values.

The locally hosted variable font supplies restrained intermediate weights. Headings use balanced wrapping and tight tracking; body paragraphs use readable line spacing. These are role-specific sizes, not a uniform mathematical scale.

### Hierarchy

- **Display:** Homepage hero; the responsive overrides below supersede its fluid token.
- **Headline:** Homepage section headings; local closing/privacy headings use smaller sizes.
- **Title:** Feature scene headings.
- **Body:** Repeated homepage feature copy. Intro copy is (16px, line-height 1.8); scene copy is (14px, line-height 1.9). At narrow widths, feature copy becomes (14px).
- **Label:** Captions and supporting copy. Buttons and selected states use heavier weights, not a separate display face.
- **Reading display / Reading body:** Reading-page heading and long-form text. Reading section headings use (28px), then (26px) below the base mobile breakpoint.
- **Command:** Literal executable examples. Reading-page code uses a separate inherited monospace presentation.

Paragraphs inherit a maximum measure of (68ch); homepage intros and section summaries use narrower local limits. The body element's base (18px, line-height 1.7) remains a fallback, not the size of all visible homepage copy.

**The One Family Rule.** Use Manrope for website display and prose; reserve monospace for technical content.

## Layout

The homepage body establishes the named inline-size container `brain-site`. Its content is centered at a maximum width of (1248px), with total horizontal subtraction of (96px). Body container queries respond to available content width, including browser zoom, rather than assuming the nominal device width.

- At container width (1100px) or less: total subtraction becomes (64px); paired layouts tighten; the hero title becomes (68px).
- At (800px) or less: the hero, meeting scene, memory, Speak, and agents layouts become one column. Hero supporting copy briefly uses two columns; its title is (74px). Section padding becomes the tablet spacing token.
- At (600px) or less: total subtraction becomes (40px), hero supporting copy stacks, the title uses `clamp(43px, 10.8vw, 64px)`, section headings become (35px), and titles become (28px). Section padding uses the mobile token. The header hides its first link and retains the other routes.
- Homepage type still uses viewport units inside some clamps. Container queries choose the composition; those clamps do not become container units.

Desktop sections alternate paired text/image arrangements with full-width evidence. Gaps commonly range from (60px) to (100px). Screenshot compositions have deliberately reserved room for attached detail crops. On narrow screens the workspace detail enters normal flow at (90%) width, retaining a small overlap; memory details remain positioned within reserved padding. Full-size links remain available.

Reading pages use a (1200px) maximum container with total subtraction of (80px), then (56px) at viewport widths of (1000px), (48px) at (700px), and (36px) at (360px). Their reading layout pairs a (210px) sticky contents rail with a reading column capped at (760px). The rail narrows at (1000px), then becomes a static contents panel above the text at (700px). Base media rules remain in the cascade alongside the homepage container queries.

## Elevation & Depth

Depth belongs primarily to real app captures. Pale section bands and thin boundaries organize the website; diffuse shadows lift windows and detail crops. The dark saved-review section uses tonal framing. Command sheets and selected platform choices have modest elevation.

### Shadow Vocabulary

- **Workspace:** `0 38px 66px -35px #142f3d66, 0 4px 12px #142f3d13` for the large app window.
- **Workspace detail:** `0 24px 45px -20px #142f3d80` for its attached native crop.
- **Native figure:** `0 24px 40px -24px #17392e50` for supporting app captures.
- **Command sheet:** `0 18px 30px -24px #194e3550` for the real CLI example surface.
- **Selected platform:** `0 1px 2px #213a5826, 0 6px 16px -10px #213a5866` for the active segmented choice.

**The Native Layer Rule.** Build image layers from authentic captures and crops, with original full frames available for inspection; do not recreate app chrome in website markup.

## Shapes

Website buttons have compact rounded corners; images and command sheets use slightly softer corners; segmented platform choices are fully rounded. Thin, muted borders provide section and selection structure. Native app shapes visible inside images retain their own identity.

Homepage workspace frames reduce to the button radius at narrow widths. The outcomes frame uses the panel radius, reducing to the code radius on mobile. The closing area uses straight dividers and no enclosing rounded card. Icons are inline stroked SVG (normally 18px), with smaller caption variants; screenshots retain their original native iconography.

## Components

### Buttons

Compact, readable actions with clear color changes. The homepage primary uses ink with white text, its documented padding, a minimum height of (48px), and (12px / 700) typography. Hover changes the fill to teal. Incumbent reading buttons remain blue, (15px), and at least (52px) tall. Website focus uses a (3px) blue outline with (5px) offset; links also inherit a small focus radius. Color transitions use (140ms ease-out).

### Platform choice

A real website segmented control, not an app mockup. The homepage track uses pale green with a muted border and (4px) inset. Choices have a (34px) minimum height; selected choices are white with ink text and modest shadow. Base reading-page choices use (40px) minimum height and larger type. Selection is exposed through `aria-pressed`; platform preference persists when storage is available. Platform choice does not relabel Windows imagery as Mac.

### Image inspection controls

Workspace choices use quiet text buttons, a thin selected teal underline, and a visible focus outline. Meeting-step buttons use a stronger selected underline and heavier text. Arrow keys, Home, and End navigate each image-selection group. Replay and Speak-focus actions are transparent teal buttons with SVG icons; hover underlines their text. Captions and status messages identify the displayed image.

### Cards / Containers

Native figures preserve their captures with contained image sizing, rounded frames, and full-size links. The CLI command sheet is a pale bordered panel with the documented padding, a divided header, wrapped monospace commands, and a footnote. Its copy button reports “Copied” or selects the command with a fallback message. No editable website text field is implemented; screenshot fields do not establish an input component.

### Navigation

The homepage header has a bottom divider, compact Manrope links, and the original logo. Links turn blue and underline on hover/current-page state. Reading pages retain their base header, sticky desktop contents rail, and mobile contents panel. A focus-revealed skip link reaches the main content.

### Image motion

The workspace entrance plays once when observed: the main frame settles over (700ms) and its detail over (800ms). User image selections use interruptible (350ms) motion with `cubic-bezier(.16,1,.3,1)`; images decode before replacement, and stale selection requests are ignored. Replay is explicit. Speak inspection switches between the real full window and its real history crop.

Reduced-motion preference skips Web Animations and removes CSS animations/transitions; all focus states remain available immediately. Changing that preference or hiding the document cancels running animations. Without JavaScript, meeting scenes remain readable and enhanced-only controls stay hidden; the agent guide exposes both platform instructions. Forced-colors rules preserve visible borders and selected-control indicators.

## Do's and Don'ts

### Do:

- **Do** preserve the original Brain logo and the existing blue/teal identity.
- **Do** use native captures, explicit platform/sample captions, and full-size inspection links.
- **Do** preserve container-based homepage reflow and the reading-page responsive layout.
- **Do** keep image selection usable by keyboard, without motion, and with readable static content.
- **Do** keep literal commands distinct from ordinary prose.

### Don't:

- **Don't** redraw app controls or import native screenshot colors, typography, or indicators into website tokens.
- **Don't** introduce decorative eyebrows, invented app chrome, or fake terminal output.
- **Don't** turn the authored entrance into perpetual animation or repeated page-wide scroll reveals.
- **Don't** treat selected download platform as proof of the platform shown in a screenshot.

Not canonized: the unstyled uppercase eyebrow in `agents.html` and the base verification disclosure's generated plus/minus glyph icon are carried defects, not reusable identity rules. This documentation pass does not repair UI. Small supporting text is recorded only where it is an actual role; it is not a universal minimum-size recommendation.

