---
title: Frontend on Mantine
description: Frontend architecture invariants for the Mantine-based UI — providers, theming, and the Tree renderNode contract
category: Important
tags:
  - frontend
  - mantine
  - theming
  - react
---

# Frontend on Mantine

The frontend runs on Mantine 9 with `@tabler/icons-react`. This document records
the contracts that the migration established and that are easy to break silently.

## Provider and Theming

- `AppThemeProvider` wraps the app in `MantineProvider` with `forceColorScheme`
  and a `cssVariablesResolver` that maps custom keys to CSS variables:
  `--app-background`, `--app-paper`, `--app-primary`.
- Components style themselves with those CSS variables, not with MUI-style theme
  objects. The 20+ custom themes are built by `useTheme()` into a Mantine theme;
  adding a theme means providing those `other` keys, not touching components.
- Header height is shared via `--app-header-height` (compact layout: 52px),
  sidebars 260/56px.

## Tree renderNode contract

`FileTreeView` customizes nodes with `renderNode`. Mantine owns nesting
indentation through the label element's **class**
(`padding-inline-start: var(--label-offset)`, scaled per level). Therefore:

- Always spread `elementProps` onto the rendered label element (it carries the
  class, click handler, and `data-value`).
- Never set an inline `padding` shorthand on that element — the shorthand
  overrides the class-based `padding-inline-start` and flattens the whole tree
  into a list. Use longhands (`paddingBlock`, `paddingInlineEnd`).

This exact regression shipped once: the tree looked fine in tests (snapshots
had captured the flat layout) and was only caught visually.

- Guide lines are a first-class prop: `withLines` + `levelOffset="md"`. Lines
  are drawn with CSS borders on `--mantine-color-default-border` and follow the
  color scheme automatically. Do not hand-draw connectors.

## Tests

- `test/setupTests.ts` wraps `render`/`renderHook` in a `MantineProvider`
  centrally, mocks `useId`, and polyfills `ResizeObserver`. New component tests
  must not add their own provider boilerplate.
- Manual `mount`/`renderToString` calls (if ever needed) must include
  `MantineProvider` — Mantine components throw or render nothing without it.

## Invariants to Test

- Nested tree rows have increasing `padding-inline-start` per level.
- The tree root carries `data-with-lines` and nested nodes show connector lines.
- Every theme in the settings dialog applies its `--app-*` variables.
- Snapshot updates during UI changes are reviewed against the rendered UI, not
  trusted blindly.

## Related Documents

- [Implementation plan](../plans/2026/10/23/2026-10-23-mantine-bun-hot-reload.md)
- [Dashboard & Multi-folder Workspaces](./dashboard-workspaces.md)
- [Frontend Features](../frontend_features.md)
