# Bug: Inline code rendered above the surrounding text baseline — FIXED

- **Date:** 2026-10-23
- **Status:** FIXED
- **Component:** `packages/frontend/src/styles/markdown.css` (interaction with Mantine `Code`)
- **Reported against:** `@lamnguyenx/mdts2` 2026.9.29, `main` @ `30691c5`
- **Environment:** Mantine 9.7.3, Chromium (Playwright 1.64.1), Linux

## Summary

Inline code spans in rendered Markdown appeared vertically raised relative to the
surrounding paragraph text — e.g. `sth` in a sentence looked like it had "jumped up"
from the line. The code text itself was readable; only its baseline was wrong.

The problem affected every inline code span rendered through the Mantine `Code`
component. Fenced code blocks were not affected because their layout is owned by
the wrapping `<pre>`.

## Steps to reproduce

1. Start mdts with any folder containing a Markdown file.
2. Render a paragraph with inline code, for example:

   ```markdown
   This line has inline `code` in the middle and some more text after it.
   ```

3. Observe that the `code` text sits higher than the surrounding text baseline.

Measured in the browser, the inline code text was **7.47px above** the baseline of
the surrounding paragraph text.

## Root cause

Two rules combined:

1. `packages/frontend/src/styles/markdown.css` renders all Markdown code as an
   `inline-block`:

   ```css
   code {
     display: inline-block;
     padding: 0.1em 0.6em;
     ...
   }
   ```

2. Mantine's `Code` root (`.m_b183c0a2`) sets `overflow: auto`:

   ```css
   .m_b183c0a2 {
     font-family: var(--mantine-font-family-monospace);
     line-height: var(--mantine-line-height);
     padding: 2px calc(var(--mantine-spacing-xs) / 2);
     ...
     overflow: auto;
   }
   ```

Per CSS 2.1 §10.8.1, the baseline of an `inline-block` is the baseline of its last
line box **only while its `overflow` is `visible`**. With any other computed
`overflow` value, the baseline becomes the **bottom margin edge** of the box. The
browser therefore aligned the bottom edge of the code chip with the text baseline,
which pushed the code glyphs upward by the box's descender space plus bottom
padding.

This was a regression from commit `30691c5` ("Revamp frontend styling to native
Mantine tokens and AppShell"), which replaced the previously hand-rendered
`<code>` element with Mantine's `<Code>`:

```diff
-    <code {...props} className={className} style={{ ... }}>
+    <Code {...props} className={className} ff={fontFamilyMonospace} ...>
       {children}
-    </code>
+    </Code>
```

The `display: inline-block` rule already existed before that commit, but the raw
`<code>` element kept `overflow: visible`, so its baseline was correct. Mantine's
`Code` introduced the non-visible overflow that broke it.

## Fix

Keep the inline-block chip (so `padding`, `border-radius`, and Mantine token-based
background/color continue to work) but force `overflow: visible` in the Markdown
prose styles:

```css
code {
  display: inline-block;
  /*
   * Mantine's Code root uses overflow: auto. On an inline-block that makes
   * the bottom margin edge the baseline, which lifts inline code above the
   * surrounding text. Keep overflow visible so the code text sits on the
   * same baseline; pre handles horizontal scrolling for code blocks.
   */
  overflow: visible;
  padding: 0.1em 0.6em;
  margin: 0;
  font-size: 0.8em;
  border-radius: var(--mantine-radius-xs);
}
```

`.markdown-body code` has higher specificity (one class + one type) than
Mantine's `.m_b183c0a2`, so no `!important` is needed.

For fenced blocks, horizontal scrolling is already provided by the surrounding
`pre { overflow-x: auto; }`, so removing `overflow: auto` from the inner code
element does not change block scrolling.

## Trials and errors

- **False lead — `display: inline-block` itself.** The first suspicion was that
  the inline-block chip was the problem. It was not: that rule predates the
  Mantine migration, and the old raw `<code>` rendered correctly with the same
  `display`, `padding`, and `font-size`. Removing `inline-block` (or switching to
  `display: inline`) would also work, but changes how the chip wraps and how its
  padding participates in line layout, so it was rejected as the least surgical
  option.
- **False lead — font size / line height.** The code font is `0.8em` with
  Mantine's line height, which looks like an obvious alignment culprit. Changing
  either does not move the glyph baseline; the box baseline was the actual
  problem.
- **Rejected — `vertical-align: middle`.** This can visually centre the chip, but
  it is an approximation based on the parent's x-height and the chip's full box
  height. It would drift with font settings and theme changes. Default `baseline`
  alignment is correct once the box's baseline is correct.
- **Rejected — raw `<code>` with inline styles.** Reverting `MarkdownCode` to the
  pre-Mantine element would restore the baseline, but throws away Mantine token
  integration (`bg`, `c`, `ff`, theme-aware color scheme) that the revamp
  deliberately introduced.
- **Confirmation.** Setting `overflow: auto` at runtime on the fixed page
  reproduced the bug (baseline delta `-7.47px`), and removing it returned the
  delta to `0px`. This isolated the exact property before changing source CSS.

## Verification

- Built the frontend:

  ```bash
  cd packages/frontend && bun run build
  ```

- Ran the app against a temporary Markdown file and measured text baselines with
  Playwright:

  | State | `overflow` | Baseline delta |
  | --- | --- | --- |
  | Before (simulated) | `auto` | **-7.47px** |
  | After | `visible` | **0px** |

  Screenshots of the same paragraph confirmed the code chip now sits on the text
  baseline instead of above it.
- Focused unit tests:

  ```bash
  cd packages/frontend
  bun run jest -- --selectProjects test \
    --runTestsByPath test/unit/components/Content/MarkdownContent/MarkdownRenderer/MarkdownCode.test.tsx
  ```

  **4 tests / 3 snapshots passed.**

## Notes

- Only `packages/frontend/src/styles/markdown.css` changed; no component, server,
  or API changes.
- Snapshot tests capture DOM structure, not geometry, so they could not catch this
  regression. The CSS comment is intentional to prevent the `overflow: auto`
  interaction from being reintroduced.
- The same rule applies to any future inline-block wrapper around a Mantine
  component that sets `overflow`: check the computed baseline, not just the box
  metrics.
