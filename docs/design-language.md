# Design language

How Orbis Homelab looks and why, so that a new page or component fits in without a mood board. The tokens live in `web/src/styles/tokens.css`, the building blocks in `web/src/ui/`, the frame in `web/src/shell/`.

## The idea

A homelab is a physical thing: drives in bays, lamps on a front panel, meters. Orbis is drawn as the **front panel of a rack**, not as a SaaS dashboard.

- **Plates, not cards.** Surfaces are nearly square (`--radius-lg` is 10px), flat, edged by a hairline. There is no shadow, no blur, no gradient. A page has one primary object; everything else is a quiet list.
- **Lamps say state.** A round lamp (`StatusDot`) with its label tells whether something is fine. Colour is only ever used for state and for the current page.
- **Meters say quantity.** Amounts that have a limit are drawn as a row of LED cells (`ProgressBar`, `SegmentedGauge`), lit from the left, coloured by thresholds. This is the one memorable element of the interface; use it wherever there is a number with a ceiling, and nowhere else.
- **Numbers are instrument numerals.** One family, two widths: text at normal width, figures and titles condensed (`font-stretch: var(--stretch-gauge)`). The family (Instrument Sans) is bundled, never fetched.
- **Structure is information.** A hairline under a section title groups what follows. A dashed outline means "empty slot, not set up yet". A short bar on the edge of a navigation item is the lamp of the current page. Nothing is there just to decorate.

## Palette

Graphite with a green cast in the dark theme (the default), pale mineral grey in the light one. Tokens, never literals:

| Role                | Tokens                                                                        |
| ------------------- | ----------------------------------------------------------------------------- |
| Ground and plates   | `--bg`, `--surface-1`, `--surface-2`, `--surface-3`                           |
| Recessed wells      | `--recess` (inputs, segmented controls), `--lamp-off`                         |
| Text                | `--text`, `--text-2`, `--text-3`                                              |
| Lines               | `--hairline`, `--hairline-strong`                                             |
| State               | `--ok`, `--warn`, `--crit` (through `data-tone`)                              |
| The current/primary | `--accent` (navigation, links, primary action), overridable with `app.accent` |

Contrast is checked for text on every plate in both themes (`--text-3` is the lowest permitted text colour).

## Type

| Use                       | Style                                                                 |
| ------------------------- | --------------------------------------------------------------------- |
| Page title                | `--text-title`, condensed, 600                                        |
| State of the whole system | `--text-display`, condensed, 600                                      |
| Meter figure              | `--text-gauge`, condensed, 600, with the unit in `--text-2` beside it |
| Section title             | `Section`: `--text-md`, 600, sentence case, hairline below            |
| Body                      | `--text-base`; secondary text `--text-2` at `--text-sm`               |

Sentence case everywhere. No tracked-out upper-case labels, no eyebrow above every heading, no metadata strings glued with middle dots: put separate facts on separate lines or in separate columns.

## Building blocks

| Need                    | Use                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| Group with a title      | `Section` (title left, optional action right, hairline)                                              |
| A primary object        | `Card` (plate); `tone` adds a lamp bar on its left edge                                              |
| Rows of things          | `List` / `ListRow`; separators are hairlines                                                         |
| State                   | `StatusDot` (lamp) + text; `Badge` is a squared tag for a short fact (a version, "update available") |
| A quantity with a limit | `ProgressBar` (LED meter), `SegmentedGauge` (long scale with thresholds)                             |
| A figure                | `StatTile`, or condensed numerals with `--text-gauge`                                                |
| Filters, modes          | `Chip` (selected = inverted plate), `Segmented` (recessed track)                                     |
| A note under a list     | `Notice` (lamp bar on the left)                                                                      |
| Not set up yet          | `SetupSlot` (dashed empty bay: what it adds, three steps, where to read more)                        |
| A product               | `ServiceIcon`: own image, else the product's logo (`brand/`), else a neutral monogram                |

## Layout

- Compact (under 700px): one column, a bottom bar of three to five destinations; Settings sits in the header.
- Medium (700px and up): navigation rail on the left. Wide (1100px and up): sidebar with the overall state at its foot.
- The frame fills the visible area and scrolls its content inside (`shell/AppShell`). The document never scrolls and nothing is `position: fixed` for layout, so the bottom bar cannot drift on mobile browsers.
- Two columns only when two things are really read side by side; otherwise one readable column (line length under 80 characters).

## Behaviour

- Motion answers an action (a tap, an expansion). There is no entrance animation on pages or cards. `prefers-reduced-motion` is honoured globally.
- Touch targets are at least 44px; every control has a visible focus ring; every meter and lamp has a text equivalent.
- Everything works in both themes, both languages, at 320px and at 1440px.
- Logos: see [Service logos](brand-logos.md).
