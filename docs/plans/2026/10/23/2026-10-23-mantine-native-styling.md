---
title: Mantine-Native Styling Revamp
description: Implementation plan and retrospective for removing the leftover MUI-era styling layer and rebuilding the frontend on Mantine primitives, tokens, and layout components
category: Plan
tags:
  - mantine
  - theming
  - design-system
  - appshell
  - css
  - retrospective
---

# Mantine-Native Styling Revamp

- **Date:** 2026-10-23
- **Status:** Implemented (working tree; commit pending)
- **Components:** React 19 frontend, Mantine 9.7.3, `@tabler/icons-react`, webpack, Redux
- **Primary files:** `packages/frontend/src/hooks/useTheme.ts`,
  `packages/frontend/src/theme/AppThemeProvider.tsx`,
  `packages/frontend/src/Layout.tsx`, `packages/frontend/src/styles/**`,
  `packages/frontend/src/components/**`
- **Commits:** pending (the first squash attempt was reset so the snapshot state
  could be reconsidered)

## Summary

The previous migration replaced MUI components with Mantine components, but it
kept the old design system running underneath: a parallel `--app-*` CSS
variable layer, hand-rolled shell geometry, custom scrollbar CSS, an unbundled
MUI-era `markdown.css`, and inline gradients/`rgba()` math in the dashboard.
The result was "Mantine components wearing MUI clothes".

This revamp removes that shadow layer and moves the UI to 100% Mantine:

1. **Theme foundation.** The 22 palette themes now feed Mantine's real color
   tokens (`colors.app`, `colors.dark`, `--mantine-color-body`) instead of
   custom variables.
2. **Layout.** The hand-rolled `Flex`/`Box` shell with
   `calc(100vh - var(--app-header-height))` was replaced by Mantine `AppShell`
   with a collapsing navbar/aside and built-in mobile behavior.
3. **Scrollbars.** `scrollbar.css` was deleted; every scroll container is a
   Mantine `ScrollArea`.
4. **Content.** The bordered "paper column" became floating `Paper` cards on a
   palette-derived backdrop.
5. **Markdown.** `public/markdown.css` was replaced by a bundled
   `src/styles/markdown.css` that references only Mantine tokens.
6. **Components.** Hand-rolled rows, overlays, error boxes, and notices were
   replaced with `Alert`, `Code`, `EmptyState`, `LoadingOverlay`, `Divider`,
   `Mark`-via-`Text`, and style props (`bg`, `bd`, `c`, `px`, `bdrs`, …).

Verification: 317/317 frontend tests, 125/125 lint tests, clean `tsc`, clean
webpack build, and a Playwright pass measuring real geometry, color tokens,
theme switching, mobile drawers, scrolling, and dialogs.

## Motivation

- **One design system, not two.** Every `--app-*` reference was a place where
  Mantine components quietly ignored the theme (dialogs, inputs, tooltips,
  popovers, focus states).
- **Correct dark mode.** The old layer only tinted backgrounds; Mantine's
  borders, dimmed text, hover states, disabled states, and placeholders stayed
  Mantine-default gray.
- **Less CSS, fewer magic numbers.** Shell heights, borders, scrollbars,
  radii, and spacing should come from Mantine, not from duplicated values.
- **Predictable theming.** Adding a palette should touch `themes.ts` only;
  every Mantine component then follows automatically.

## Design

### Token mapping

`useTheme()` builds a Mantine theme from the active palette:

| Concern | Light scheme | Dark scheme |
| --- | --- | --- |
| Primary | `colors.app` = 10 shades generated from `primary` | same |
| Chrome/body | `--mantine-color-body` = `paper` (via `cssVariablesResolver`) | `colors.dark[7]` = `paper` |
| Raised surface | Mantine default (white) | `colors.dark[6]` ≈ paper + 4 % |
| Borders | Mantine gray-4 | `colors.dark[4]` ≈ paper + 11 % |
| Dimmed text | Mantine gray-6 | `colors.dark[2]` ≈ paper + 61 % |
| Text | Mantine black | `colors.dark[0]` ≈ paper + 87 % |
| Main backdrop | `palette.background` | `useTheme().backdrop` ≈ paper − 11 % |
| Deep surfaces | — | `colors.dark[8]` / `[9]` |

The dark tuple mirrors Mantine's default dark scale weights so component
contrast ratios stay familiar:

```ts
// dark[0..9] generated from the dark paper color
shade(paper, 0.87), 0.73, 0.61, 0.30, 0.11, 0.07, 0.04, /* paper */, -0.11, -0.19
```

Light mode cannot retint surfaces through a tuple, so `cssVariablesResolver`
injects `--mantine-color-body` (paper) while inputs and popovers remain
elevated on white. `useTheme()` additionally returns `backdrop` (the main-area
wash) so `Layout` and `Dashboard` can paint it with a style prop.

### AppShell layout

| Property | Value |
| --- | --- |
| Header | 52px (`header={{ height: 52 }}`) |
| Navbar / Aside | 260px expanded, 56px rail, breakpoint `md` (992px) |
| Mobile | Mantine off-canvas navbar/aside (full-width overlay) |
| Main | `height: 100dvh`, flex column, palette backdrop |
| Borders | `AppShell` `withBorder` (default) |

`useIsMobile` was aligned to the same `md` breakpoint (61.99em) so component
logic and shell behavior cannot drift apart.

### Content surfaces

`MarkdownContent` and `DirectoryContent` render a `Paper`:

- compact mode (desktop): `maw={800}`, `radius="md"`, `shadow="sm"`,
  `withBorder`, `bg="var(--mantine-color-default)"`;
- full mode / mobile: transparent, full width.

Breadcrumbs moved above the card; tab dividers no longer use negative-margin
bleed hacks.

### Markdown styles

`public/markdown.css` (loaded via `<link>`) was replaced by
`src/styles/markdown.css` (bundled through webpack). Typography is preserved,
but every color now resolves through Mantine variables:

| Old | New |
| --- | --- |
| `rgba(0,0,0,.12)` borders | `var(--mantine-color-default-border)` |
| blockquote `rgba(0,0,0,.24)` | `var(--mantine-color-dimmed)` |
| link `--mantine-primary-color-filled` fallback `#1976d2` | `var(--mantine-color-anchor)` |
| hand-rolled dark-scheme block | automatic via Mantine tokens |

Only Mermaid interop rules remain in `index.css`; the body gradient and
scrollbar variables were removed.

## Trials, Errors and Fixes

### 1. The design questionnaire crashed; defaults had to be explicit

**Trial:** Ask the user three questions (palette handling, markdown strategy,
scope) before touching code.

**Error:** The interaction location shut down
(`Interaction cancelled because the location shut down`).

**Fix:** Proceeded with the recommended options and stated them up front:
map palettes into Mantine tokens, preserve markdown typography, full pass.
Recording the defaults kept the decision reviewable later.

### 2. `cssVariablesResolver` is not a theme property

**Trial:** Return `{ ...theme, cssVariablesResolver }` from `useTheme()`.

**Error:** `tsc` rejected it — the resolver is a `MantineProvider` prop, not
part of `MantineThemeOverride`.

**Fix:** `useTheme()` returns `{ theme, cssVariablesResolver, colorScheme,
palette, backdrop }`; `AppThemeProvider` passes the resolver to the provider.

### 3. Dark palettes are not consistently two-tone

**Observation:** Some dark palettes have `background` lighter than `paper`
(default), others unrelated in hue (tropical: brown background, teal paper).

**Fix:** Do not derive dark surfaces from `background`. Treat `paper` as the
chrome/body color and generate the full dark tuple from it; derive the main
backdrop as `paper − 11 %`. Light mode keeps both meanings: `paper` chrome,
`background` backdrop.

**Proof:** computed `body` colors after switching themes via `/api/config`:
default `#eef1f5`, solarized `#f4efdc`, forest `#e6f2eb`, sakura
`#ffeeef`; sakura dark `#1f1115` with backdrop `#1c0f13`.

### 4. Border shorthand style prop produced invalid CSS

**Trial:** `bd="0 0 1px 0 var(--mantine-color-default-border)"` for a
bottom-only border.

**Error:** Mantine's border resolver splits `size style color…`; the value
became `border: 0 0 1px 0 …`, which is invalid (`0` is not a border style).

**Fix:** Use `style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}`
for single-side borders (still Mantine-token driven). The `bd` prop remains
correct for uniform borders such as `bd="1px solid …"`.

### 5. Style-prop API gaps (`align`, `ta`, `truncate`)

**Error:** `align`, `ta`, and `truncate` are not Box style props; `tsc`
rejected them on `UnstyledButton`/`Box`.

**Fix:** Use polymorphic Mantine layout components:
`<Flex component={UnstyledButton} align="center" …>`, and
`<Text component="span" inherit truncate>`.

### 6. Nested `<button>` in dashboard rows

**Error:** React warned that `<button>` cannot be a descendant of `<button>`.
`Group component={UnstyledButton}` wrapped the row, and the remove
`ActionIcon` was rendered inside it.

**Attempted fix that does not work:** absolutely positioning the icon still
leaves it in the button's DOM subtree.

**Fix:** `Box pos="relative"` → sibling `UnstyledButton` row and
`ActionIcon pos="absolute" right="md" top="50%"`. Valid DOM, same visual.

### 7. ScrollArea viewport grew instead of scrolling

**Symptom:** `scrollHeight == clientHeight == 2879` on an 848px-tall viewport;
long documents were clipped with no way to scroll.

**Cause:** classic column-flex trap — an intermediate wrapper had
`flexGrow: 1` but default `min-height: auto`, so it refused to shrink.

**Fix:** `minHeight: 0` on the wrapper between `AppShell.Main` and
`ScrollArea`. Re-measured: `clientHeight: 848`, `scrollTop: 500` persists.

**Lesson recorded in** `docs/important/frontend-mantine.md`.

### 8. Mobile overlay was unreachable

**Trial:** Custom click-away `Overlay` behind the mobile navbar.

**Observation:** Below `md`, Mantine's navbar is a 100%-width overlay, so the
custom overlay was completely covered and could never receive a click.

**Fix:** Remove the overlay; rely on the shell's burger toggle and auto-close
on file selection. Verified `nav.x: -390 → 0` on open, and closing via the
toggle.

### 9. Snapshot fallout and stale assertions

**Facts:** 23 snapshots failed after the structural rewrite; 37 snapshots
total were updated deliberately with `-u`.

**Stale tests fixed:**

- `Layout.test.tsx` asserted `--markdown-font-family` /
  `--markdown-monospace-font-family` document variables. Those were dead code:
  `Layout` wrote them, nothing read them; the real font is applied inline in
  `MarkdownContent`. The assertions were removed.
- PlantUML tests asserted the old plain-text loading message and
  `PlantUML Error:` label. Now they assert `role="progressbar"` and the
  `Alert` title.
- `OutlineContent` padding assertion switched to logical longhands
  (`paddingBlock`, `paddingInlineStart`, `paddingInlineEnd`) matching Mantine's
  style-prop output (`calc(Nrem * var(--mantine-scale))`).

**Lesson:** snapshot diffs are expected in a design revamp, but every
assertion failure that is *not* a snapshot must be inspected — most of ours
encoded behavior that no longer existed.

### 10. Browser verification traps

- **`/` opens the dashboard, not the workspace.** Workspace URLs need
  `?folder=…`; otherwise the header controls under test do not exist.
- **Theme vs color scheme live in different places.** `darkMode` is in
  `localStorage.appSetting`; the palette id is server config (`POST
  /api/config`). Writing `theme` to `localStorage` silently does nothing.
- **`pkill -f "bun dist/index.js …"` matched its own shell command line** and
  SIGTERM'd the shell twice. Use exact PIDs or `pgrep -f` excluding `$$`.
- **`EMFILE` watcher spam** came from `ulimit -n 1024` in the development
  environment. Livereload was disabled; the UI and HTTP server were unaffected.
  Not a code issue.
- **Screenshots are not directly reviewable in this workflow.** Verification
  used DOM geometry (`getBoundingClientRect`), computed styles, CSS custom
  properties, `scrollHeight/clientHeight`, and accessibility roles instead.

### 11. "The snapshots are in upstream history" — do not purge it

**Question raised:** Should `__snapshots__` be removed from git history?

**Investigation (GitHub API):**

- `unhappychoice/mdts` main tracks 44 snapshot entries (files + dirs).
- Upstream `.gitignore` does **not** ignore them.
- Upstream has dedicated snapshot-maintenance commits, e.g.
  *"test(frontend): update tree view snapshots for @mui/x-tree-view 9.15"* and
  *"chore(deps): bump @mui/material from 7.3.8 to 7.3.9 and update snapshots"*.
- Snapshots were introduced by `e2e0a8b` ("Add frontend unit tests") and have
  been updated across 43 commits.

**Conclusion:** They are a deliberately maintained test artifact, not an
accident. Purging them would rewrite all 1,777 commits (including upstream
history), force-push the fork, and create permanent merge friction. The
project convention is to update and commit snapshots with UI changes. The
`**/__snapshots__/` `.gitignore` entry added during the confusion should be
dropped; the 37 updated snapshots belong in the revamp commit.

## Lessons Learnt

1. **A component migration is not a design-system migration.** Swapping MUI
   imports for Mantine imports left two systems running; correctness only came
   from deleting the old variable layer and adopting Mantine's tokens.
2. **Theme the framework's own tokens.** `colors.dark` plus
   `--mantine-color-body` retints every Mantine surface. Parallel `--app-*`
   variables only style the places you remember to touch.
3. **Prefer layout components over geometry math.** `AppShell`, `ScrollArea`,
   and `AppShell.Main` padding replaced `calc(100vh - header)` and magic
   scroll heights. Fewer numbers, fewer breakages.
4. **Check the style-prop surface before writing markup.** `bd`, `bg`, `c`,
   `px`, `bdrs` cover most styling, but `align`/`gap` are Flex props and
   `truncate` is a Text prop. Use polymorphic components instead of falling
   back to inline styles.
5. **Invalid HTML is a real bug, not a warning.** Nested buttons break
   keyboard and screen-reader behavior; absolute positioning does not fix DOM
   nesting.
6. **Column flex containers need a `minHeight: 0` chain.** Measure
   `scrollHeight` vs `clientHeight` in the browser; snapshots and jsdom will
   happily accept a clipped layout.
7. **Verify non-snapshot assertions individually.** Dead variables and old
   copy are easy to miss when dozens of snapshots fail at once.
8. **Investigate shared history before rewriting it.** Check what upstream
   actually does (tracked files, dedicated commits) before any `filter-repo`
   or rebase. Most "accidents" are documented conventions.
9. **Snapshot tests capture structure, not geometry.** They cannot catch
   clipped scroll areas, off-canvas mobile panels, or token remapping. Pair
   them with a live browser probe.
10. **Record default decisions when the user cannot answer.** The failed
    questionnaire was fine because the defaults were written down and could be
    revisited.
11. **Align breakpoints once.** Shell and component logic both use `md`
    (992px) now; drifting values (`900px` vs `996px`) produce states where the
    shell and content disagree about "mobile".

## Verification

### Automated

- Frontend tests: **317/317 passed**, 54 suites, 37 snapshots.
- Lint: **125/125 passed**.
- TypeScript: `tsc --noEmit` clean.
- Webpack production build: compiled successfully.

### Browser (Playwright, 1440×900)

| Check | Result |
| --- | --- |
| Header | 1440×52 at `y=0` |
| Navbar | 260px at `y=52`, height 848, 1px `border-inline-end` |
| Aside | 260px at `x=1180` |
| Main backdrop | light `#f5f7fa` (palette background) |
| Content card | 760px wide inside the 920px content area, white surface |
| Rail collapse | navbar 260 → **56px** |
| Theme switch (light) | body `#eef1f5` → solarized `#f4efdc` → forest `#e6f2eb` → sakura `#ffeeef` |
| Dark scheme | sakura body `#1f1115`, backdrop `#1c0f13` |
| ScrollArea | `clientHeight=848`, programmatic `scrollTop=500` persists |
| Fuzzy dialog | 620×450, 15 results, closes on `Escape` |
| Settings dialog | 760×580, theme + syntax selects render, font tab has 19 controls |
| Outline | 4 items; click scrolls content |
| Raw tab | renders code block |
| Mobile (390×844) | navbar `x=-390` closed → `x=0` full-width open |
| Console | no page errors (only the dev-server livereload WebSocket) |

### Regression checks kept from before

- Scroll-position save/restore still fires on unmount (same behavior as the
  pre-revamp implementation).
- File-tree indentation and guide lines unchanged (`py`/`pe` longhands only).
- PlantUML caching and loading behavior unchanged.

## File Changes

| Area | Files |
| --- | --- |
| Theme foundation | `hooks/useTheme.ts`, `theme/AppThemeProvider.tsx` |
| Shell | `Layout.tsx`, `components/AppHeader.tsx`, `hooks/useIsMobile.ts` |
| Panels | `components/LeftPane/**`, `components/RightPane/**` |
| Content | `components/Content/**` (Content, BreadCrumb, MarkdownContent, DirectoryContent, FileTreeList, Tabs) |
| Dialogs | `components/FuzzySearch/FuzzySearchDialog.tsx`, `components/SettingsDialog/**` |
| Dashboard | `components/Dashboard/Dashboard.tsx`, `FolderPickerDialog.tsx` |
| Renderers | `MarkdownCode.tsx`, `PlantUMLRenderer.tsx` |
| CSS | `src/index.css`, `src/styles/markdown.css` (new), `src/styles/scrollbar.css` (deleted), `public/markdown.css` (deleted), `public/index.html` |
| Docs | `docs/important/frontend-mantine.md`, `docs/important/README.md`, `README.md` |
| Tests | `Layout.test.tsx`, `PlantUMLRenderer.test.tsx`, `MarkdownCode.test.tsx`, `OutlineContent.test.tsx`, snapshots |

## Follow-ups

- Commit the updated snapshots with the revamp (project convention); drop the
  temporary `**/__snapshots__/` ignore rule.
- Consider a small DOM-geometry test (panel widths, scroll viewport height) so
  the AppShell/ScrollArea invariants are caught without a browser.
- If more components need the backdrop color, promote `useTheme().backdrop`
  to a CSS variable to avoid threading it through props.
- Revisit `themes.ts`: palettes now only need `primary`, `paper`, and
  `background`; document those roles (especially the dark `background`, which
  the new model does not consume).
- Upstream the styling revamp once the fork has been validated, to avoid
  drifting from `origin/main`.

## Related Documents

- [Frontend on Mantine](../../../../important/frontend-mantine.md)
- [Dashboard & Multi-folder Workspaces](../../../../important/dashboard-workspaces.md)
- [Mantine, Bun and Docker Hot Reload](./2026-10-23-mantine-bun-hot-reload.md)
- [Frontend Features](../../../../frontend_features.md)
