# Bug: Start page (stale content) shown while a large Markdown file is loading — FIXED

- **Date:** 2026-09-29
- **Status:** FIXED
- **Component:** `packages/frontend/src/store/slices/contentSlice.ts`
- **Reported against:** `@lamnguyenx/mdts2` 2026.9.26 (`mdts`)
- **Example file:** `docs/important/wireframes/asv/dashboard/flows/enroll-flow.puml.md`

## Summary

After opening a file through the fuzzy search dialog (++ctrl+k++), if the file was large
enough that the `/api/markdown/...` request did not complete immediately, the content
pane kept rendering the **previous page** — typically the welcome/start page — instead of
showing a loading spinner. The newly selected file only appeared once its request
finished.

For small files the request resolves fast enough that the wrong page is never noticed, so
the bug looked intermittent and was most visible with large documents.

## Steps to reproduce

1. Start `mdts2` and let the welcome/start page render. This is what puts "existing
   content" into the store.
2. Open the fuzzy search dialog and pick a large Markdown file.
3. While the file is still being fetched, observe the content pane: the start page stays
   on screen instead of a spinner (and, if you came from another document, that
   document's content and title stay on screen).

## Root cause

`fetchContent.pending` in `contentSlice.ts` only flipped `loading` to `true` when the
store had **no** content yet:

```ts
.addCase(fetchContent.pending, (state) => {
  if (!state.content) {
    state.loading = true;
  }
  state.error = null;
})
```

That guard was introduced deliberately in commit `668c690` ("refactor: Do not show loading
indicator on live reload", fixes upstream #164) so that a WebSocket-triggered live reload
of the **same** file would not flash a spinner over already-visible content.

The guard did not distinguish *"reload the file that is already displayed"* from
*"navigate to a different file"*. On navigation, `state.content` still held the old page,
so `loading` stayed `false`, and `MarkdownContentView` happily rendered the stale content
until `fetchContent.fulfilled` replaced it.

## Fix

`contentSlice.ts` now tracks which path the displayed content belongs to (`loadedPath`)
and the newest in-flight request (`latestRequestId`):

```ts
.addCase(fetchContent.pending, (state, action) => {
  // Show the loading indicator when opening a different file, but keep the
  // current content visible when (re)loading the file already displayed.
  if (action.meta.arg !== state.loadedPath || !state.content) {
    state.loading = true;
  } else {
    state.loading = false;
  }
  state.latestRequestId = action.meta.requestId;
  state.error = null;
})
.addCase(fetchContent.fulfilled, (state, action) => {
  // Ignore responses superseded by a newer request (e.g. when navigating quickly).
  if (action.meta.requestId !== state.latestRequestId) return;
  state.loading = false;
  state.content = action.payload;
  state.loadedPath = action.meta.arg;
})
.addCase(fetchContent.rejected, (state, action) => {
  if (action.meta.requestId !== state.latestRequestId) return;
  state.loading = false;
  state.error = action.error.message || 'Failed to fetch content';
});
```

Behaviour after the change:

- **Different file:** `action.meta.arg !== loadedPath` → spinner is shown immediately; the
  start page is no longer displayed while the new file loads.
- **Live reload of the displayed file:** `arg === loadedPath` and content exists → spinner
  is suppressed, preserving the #164 behaviour (no flicker).
- **Navigating back to the displayed file** while another request is still pending → the
  spinner is cleared immediately, since that content is already in memory.
- **Rapid navigation:** `latestRequestId` makes the slice ignore out-of-order
  `fulfilled`/`rejected` responses, so a slow earlier request can't overwrite the file the
  user actually selected.

## Verification

- Unit tests updated/added in
  `packages/frontend/test/unit/store/contentSlice.test.ts`:
  - empty content, live reload of the same file, opening a different file while content
    exists, navigating back mid-request, and stale `fulfilled`/`rejected` responses.
  - `npx jest --config jest.config.js --selectProjects test --testPathPatterns='contentSlice'`
    — **10 passed**.
- Related suites re-run: `Content`, `MarkdownContent`, `App`, `Layout` — **78 passed**.
- Full frontend suite: **322 tests / 56 suites**, only two unrelated pre-existing timeout
  flakes (`FileTreeView`, `FileTree`) which pass in isolation.
- Lint: `npx eslint src/store/slices/contentSlice.ts test/unit/store/contentSlice.test.ts`
  — clean.
- TypeScript: no new errors from the changed files (`npx tsc --noEmit` reports only
  pre-existing project-wide errors).

## Notes

- The `<h1>`/title in `MarkdownContent.tsx` is still derived from the retained content, so
  when jumping between two documents that both define a frontmatter `title`, the header can
  briefly show the previous title while the new file loads. This is cosmetic only; the body
  now correctly shows a spinner. Left as-is to keep the fix surgical.
- Only the frontend content slice and its tests were changed; no server, API or route
  changes.
