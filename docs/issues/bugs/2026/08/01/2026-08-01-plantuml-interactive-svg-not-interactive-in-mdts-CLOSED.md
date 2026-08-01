# Bug: PlantUML interactive SVG not interactive when rendered by mdts — CLOSED

- **Date:** 2026-08-01
- **Status:** CLOSED
- **Component:** `packages/frontend/src/components/Content/MarkdownContent/MarkdownRenderer/PlantUMLRenderer.tsx`
- **Reported against:** `mdts` 0.20.6, PlantUML Server `plantuml/plantuml-server:jetty` v1.2026.6

## Summary

PlantUML diagrams generated with `!pragma svgInteractive true` rendered correctly in
mdts but were **not interactive**: hovering/clicking a diagram element did nothing
(gray-out of non-connected elements, sequence participant filtering, floating headers —
none worked).

The SVG markup itself was correct (it contained the interactive `<script>` bundle,
`g.entity` groups and `data-entity-*` link attributes); the failure was in how mdts
injected the SVG into the DOM.

## Root cause

Two compounding causes, both in `PlantUMLRenderer.tsx`:

1. **`dangerouslySetInnerHTML` does not execute `<script>` inside `<svg>`.**
   The component injected the server SVG with:

   ```tsx
   return <div dangerouslySetInnerHTML={{ __html: svg }} ... />;
   ```

   Per the HTML spec, `<script>` elements inside SVG (foreign content) inserted via
   `innerHTML` are **never executed**. The interactive JS bundle was present in the DOM
   but dead on arrival.

2. **The bundle only initialises on `DOMContentLoaded`.**
   Even if the script ran, the interactive bundle registers its init on
   `document.addEventListener("DOMContentLoaded", ...)`. For dynamically injected content
   that event has already fired, so the callback would never run.

Verified live: clicking a `g.entity` in the rendered diagram left the `<svg>` without
`click-active`; after manually re-executing the SVG's `<script>` via the DOM API **and**
re-firing `DOMContentLoaded`, the same click applied `click-selected`/`click-highlighted`.

## Fix

Reworked `PlantUMLRenderer.tsx`:

- Replaced `dangerouslySetInnerHTML` with a `ref` + `useEffect` that sets
  `container.innerHTML = svg`.
- After injection, re-created each inline `<script>` via `document.createElement` and
  `oldScript.replaceWith(freshScript)` so the browser actually executes it
  (`document.currentScript` resolves correctly, so the bundle finds its `<svg>` root).
- Instead of re-firing a document-wide `DOMContentLoaded` (which would re-initialise
  **every** diagram already on the page, duplicating sequence-diagram floating headers),
  temporarily patched `document.addEventListener` during script execution to capture the
  `DOMContentLoaded` callback, then invoked that callback directly for the freshly
  injected diagram only.

Key part of the resulting component:

```tsx
useEffect(() => {
  const container = containerRef.current;
  if (!svg || !container) {
    return;
  }

  container.innerHTML = svg;

  container.querySelectorAll('script').forEach((oldScript) => {
    const initialisers: Array<() => void> = [];
    const originalAddEventListener = document.addEventListener.bind(document);

    document.addEventListener = ((type, listener) => {
      if (type === 'DOMContentLoaded' && typeof listener === 'function') {
        initialisers.push(listener);
        return;
      }
      return originalAddEventListener(type, listener);
    }) as typeof document.addEventListener;

    const freshScript = document.createElement('script');
    freshScript.textContent = oldScript.textContent;
    oldScript.replaceWith(freshScript);

    document.addEventListener = originalAddEventListener;

    initialisers.forEach((initialise) => initialise());
  });
}, [svg]);
```

## Verification

- Frontend unit tests: `npx jest --config jest.config.js --selectProjects test` — **319
  tests, 56 suites, all passing** (incl. `PlantUMLRenderer.test.tsx`).
- Lint: `npx jest --config jest.config.js --selectProjects lint` — **126 suites passing**.
- TypeScript: clean (only pre-existing tsconfig deprecation warnings for `target=ES5` /
  `moduleResolution=node10`, unrelated to this change).
- Manual (browser): rebuilt the frontend (`npm run build` in `packages/frontend`),
  restarted `mdts`, opened
  `server/web/ui/asv/src/pages-wireframes/flows/svg.md` — the class diagram now responds
  to hover/click (non-connected elements gray out, connected ones stay at full opacity).

## Notes

- Only `PlantUMLRenderer.tsx` was changed; no server-side, PlantUML, or bundle changes.
- The same `innerHTML`/`DOMContentLoaded` problem applies to any dynamically injected
  PlantUML interactive SVG, not just mdts.
