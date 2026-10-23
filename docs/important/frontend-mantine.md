---
title: Frontend on Mantine
description: Frontend architecture invariants for the Mantine-native UI — provider, token-based theming, AppShell, scroll containers, and the Tree renderNode contract
category: Important
tags:
  - frontend
  - mantine
  - theming
  - appshell
  - react
---

# Frontend on Mantine

The frontend runs on Mantine 9 with `@tabler/icons-react`. This document records
the contracts that the Mantine-native revamp established and that are easy to
break silently.

## Provider and Theming

- `AppThemeProvider` wraps the app in `MantineProvider` with `forceColorScheme`.
  There are **no custom `--app-*` CSS variables** — all styling flows through
  Mantine's own CSS variables and components.
- The 20+ custom themes (`src/styles/themes.ts`) are wired into Mantine natively
  by `useTheme()`:
  - `colors.app` — a 10-step scale generated from the theme's `primary`.
  - `colors.dark` — Mantine's dark surface scale rebuilt around the theme's dark
    `paper`, which retints body, borders, dimmed text, hover and surface colors
    for every component in dark mode.
  - Light mode injects the theme's `paper` as `--mantine-color-body` via
    `cssVariablesResolver`, so the app chrome (header, navbar, modals) carries
    the palette while inputs/popovers stay elevated on white.
- Content uses the palette `background` (dark: one step deeper than `paper`) as
  the main-area backdrop, returned by `useTheme().backdrop`.
- The application shell is Mantine `AppShell` (header 52px, panels 260px
  collapsing to 56px rails, mobile breakpoint `md`). Do not reintroduce
  `calc(100vh - …)` layout math — `AppShell` owns offsets.
- Scrolling uses Mantine `ScrollArea` only; there is no custom scrollbar CSS.
- Markdown prose styles live in `src/styles/markdown.css`, are bundled by
  webpack, and may only reference Mantine CSS variables (never raw colors).

## Style props and component defaults

- Prefer Mantine style props (`bg`, `c`, `bd`, `bdrs`, `px`, `py`, `w`, `maw`,
  …) over inline `style` objects. `var()` strings and raw hex values pass
  through, and theme colors resolve with shade syntax (`c="app.6"`,
  `bg="var(--mantine-color-default)"`).
- `bd` is a **uniform border** shorthand (`bd="1px solid …"`). One-sided
  borders are not style props; use `style={{ borderBottom: '1px solid
  var(--mantine-color-default-border)' }}` (token-driven, not raw colors).
- `align`, `justify`, `gap`, `wrap` are `Flex`/`Group` props, not Box style
  props. `truncate` belongs to `Text`. Compose polymorphically instead of
  adding inline styles: `<Flex component={UnstyledButton} align="center">`,
  `<Text component="span" inherit truncate>`.
- Do not nest interactive elements. A full-row `UnstyledButton` must not
  contain an `ActionIcon`; render the action as an absolutely positioned
  sibling inside a `Box pos="relative"` row. Absolute positioning does not
  make nested buttons valid.

## AppShell and scrolling

- `Layout` is a Mantine `AppShell`: 52px header, 260px navbar/aside collapsing
  to 56px rails, and Mantine's off-canvas behavior below the `md` breakpoint
  (992px). `useIsMobile` must stay aligned with `md`.
- Below `md`, the navbar/aside are full-width overlays; do not rely on clicking
  outside them to close — the shell's toggle or navigation actions close them.
- The content viewport is a `ScrollArea` with `viewportRef` used for scroll
  position save/restore.
- Any wrapper between the fixed-height main column and `ScrollArea` needs
  `minHeight: 0` (see below).

## Tree renderNode contract

`FileTreeView` customizes nodes with `renderNode`. Mantine owns nesting
indentation through the label element's **class**
(`padding-inline-start: var(--label-offset)`, scaled per level). Therefore:

- Always spread `elementProps` onto the rendered label element (it carries the
  class, click handler, and `data-value`).
- Never set an inline `padding` shorthand on that element — the shorthand
  overrides the class-based `padding-inline-start` and flattens the whole tree
  into a list. Use style props / longhands (`py`, `pe`, `paddingBlock`,
  `paddingInlineEnd`).

This exact regression shipped once: the tree looked fine in tests (snapshots
had captured the flat layout) and was only caught visually.

- Guide lines are a first-class prop: `withLines` + `levelOffset="md"`. Lines
  are drawn with CSS borders on `--mantine-color-default-border` and follow the
  color scheme automatically. Do not hand-draw connectors.

## Flex column scroll containers

Any intermediate wrapper between a fixed-height flex column and a `ScrollArea`
must set `minHeight: 0`. Without it `min-height: auto` keeps the wrapper at
content height, the viewport grows instead of scrolling, and content below the
fold becomes unreachable (it is clipped, not scrollable). This bit `Content`
once after the AppShell migration.

## Tests

- `test/setupTests.ts` wraps `render`/`renderHook` in a `MantineProvider`
  centrally, mocks `useId`, and polyfills `ResizeObserver`. New component tests
  must not add their own provider boilerplate.
- Manual `mount`/`renderToString` calls (if ever needed) must include
  `MantineProvider` — Mantine components throw or render nothing without it.

## Snapshots

- `__snapshots__` directories are **tracked intentionally** (upstream has 44
  entries and dedicated snapshot-update commits). Update them with
  `bun run test -- -u` and commit them with the UI change.
- Review snapshot diffs instead of accepting them blindly: they capture
  structure, not geometry, and will happily encode a broken layout.
- Do **not** rewrite shared git history to purge snapshots; they are part of
  the project's test suite and upstream history.

## Invariants to Test

- Nested tree rows have increasing `padding-inline-start` per level.
- The tree root carries `data-with-lines` and nested nodes show connector lines.
- Every theme in the settings dialog retints Mantine surfaces (check
  `--mantine-color-body` after switching, in both color schemes).
- Snapshot updates during UI changes are reviewed against the rendered UI, not
  trusted blindly.
- Interactive rows contain no nested interactive elements (`button` inside
  `button`).

## Related Documents

- [Mantine-native styling revamp](../plans/2026/10/23/2026-10-23-mantine-native-styling.md)
- [Implementation plan](../plans/2026/10/23/2026-10-23-mantine-bun-hot-reload.md)
- [Dashboard & Multi-folder Workspaces](./dashboard-workspaces.md)
- [Frontend Features](../frontend_features.md)
