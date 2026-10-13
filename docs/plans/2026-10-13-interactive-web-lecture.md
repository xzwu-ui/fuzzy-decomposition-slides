# Interactive Web Lecture Implementation Plan

**Goal:** Add a continuous, responsive Chinese interactive lecture alongside the existing eight-slide presentation.

**Architecture:** A new `web.html` entry uses its own layout and reading controls, sharing the existing local KaTeX, fonts, fuzzy-set arithmetic and mathematical demonstrations. The slide entry and controls stay independent. A separate self-contained lecture can be opened offline or packaged as a private static Site.

**Tech Stack:** Buildless HTML, CSS, browser JavaScript, local KaTeX and SVG; Python standard-library bundling.

## 1. Reading experience

- Create `web.html`, `css/web.css`, and `js/web.js`.
- Use a paper-colored editorial layout, a sticky chapter directory, reading progress, accessible mobile navigation and print styles.
- Present six chapters: cut definitions; legal H choices; intersection/union recovery; all four inclusion proofs; the six-element course example; endpoint conventions and summary.
- Reuse the existing demonstration IDs and scripts without loading slide navigation, timers or speaker-note controls.
- Replace slide-specific instructional language in the web experience and pause demonstrations when their sections leave the viewport or the document becomes hidden.
- Add a midpoint explorer for the witness used in the proof, using the same exact integer arithmetic.

## 2. Offline distribution

- Extend `tools/build-standalone.py` with optional entry/output arguments, retaining the original defaults.
- Produce `web-standalone.html`, embedding the lecture's local fonts, KaTeX, styles and scripts.
- Add the lecture entry and bundling instructions to `README.md`.

## 3. Verification

- Run the existing mathematical regression checks.
- Check the real browser at desktop and mobile sizes for chapter navigation, rendered formulas, range and SVG interactions, H legality, recovery controls, midpoint witnesses, course-example boundary invariance and offline loading.
- Inspect representative screenshots, check horizontal overflow and confirm the slide entry still opens independently.

## 4. Static Site

- Register one new owner-private Site if the connector is available, immediately persisting its exact ID under `website/.openai/hosting.json`.
- Package the checked lecture as `website/dist/index.html` and the original self-contained presentation as `website/dist/presentation.html`, with the presentation link adjusted.
- Push and package with the Sites helper; publish the exact checked source and confirm the returned deployment state.
- If the hosted service is unavailable, deliver the complete local lecture and state the precise hosting limitation.
