# Fuzzy File Search (Cmd/Ctrl+K)

## Summary

Add a fzf-style fuzzy file search overlay to the mdts frontend. Activated by `Cmd/Ctrl+K`, it opens a popup with a search input that filters all files in the project using fuzzy matching. Selecting a file navigates to it in the current tab.

## Motivation

Currently, navigating to files requires either browsing the file tree (left panel) or directory listings (center panel). For projects with many files, this is slow. A fuzzy search popup — inspired by fzf and VSCode's Cmd+P — enables instant keyboard-driven navigation.

## Design

### User Experience

1. **Activation**: Press `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux) anywhere on the page
2. **Overlay**: A dialog appears at the top of the viewport with a dark backdrop, containing:
   - A search input with auto-focus and a search icon
   - A scrollable results list showing matching files
3. **Typing**: As the user types, files are filtered and ranked by fuzzy match score
4. **Navigation** within results:
   - `Up`/`Down` arrow keys move the selection
   - `Enter` opens the selected file and closes the dialog
   - `Escape` closes the dialog
   - Mouse click on a result also opens the file
5. **Result display**: Each result shows:
   - Full file path (e.g., `src/components/Button.tsx`)
   - Matched characters highlighted with the theme's primary color
   - A file icon (InsertDriveFileOutlined from MUI icons)
6. **Discoverability**: A `SearchIcon` button with tooltip "Search files (⌘K)" is added to the AppHeader

### Technical Design

#### Fuzzy Matching Algorithm (`fuzzy.ts`)

Custom fzf-inspired algorithm — no external dependency needed.

**Matching**: The query must be a subsequence of the target string (all characters appear in order). Only files (not directories) are matched against.

**Scoring**:
- Base score per matched character: 1 point
- Consecutive match bonus: +5 points
- Word boundary bonus (after `/`, `-`, `_`, `.`, space, or camelCase transition): +3 points
- Start-of-string bonus (first character at position 0): +5 points
- Gap penalty for non-consecutive matches: -0.5 points per skipped character (max -5)

**Algorithm**: For each occurrence of the first query character in the target, greedily match the remaining query characters and compute a score. Return the best score and match positions.

**Edge cases**:
- Empty query: return score 0 with empty positions (all files match, no filtering)
- Query longer than target: no match
- Special regex characters in query: treated as literal characters
- Case-insensitive matching

#### File List Extraction (`useFileList.ts`)

A custom hook that recursively traverses the hierarchical `fileTree` (from Redux `fileTreeSlice`) and extracts a flat sorted array of file paths only.

```typescript
// fileTree structure: (FileTreeItem | { [dirname]: children[] })[]
// Flattened to: string[] (e.g., ["src/App.tsx", "README.md", ...])
```

The hook uses `useMemo` with `fileTree` from Redux as a dependency to avoid re-computation on every render.

#### FuzzySearchDialog Component

**Props**:
- `open: boolean` — whether the dialog is visible
- `onClose: () => void` — called when dialog should close
- `onSelect: (path: string) => void` — called when a file is selected, triggers navigation

**Internal state**:
- `query: string` — the current search query
- `selectedIndex: number` — which result is highlighted (keyboard navigation)
- `results: FuzzyResult[]` — filtered and sorted matching files (derived from query + fileList)

**Rendering** (MUI components):
- `Dialog` with styled container aligning to the top (16vh from top)
- `TextField` with `SearchIcon` adornment, auto-focus, full-width
- `List` with `ListItemButton` items, each showing:
  - `InsertDriveFileOutlined` icon
  - Full file path text with highlighted matched characters
- Selected item uses `selected` prop for visual distinction

**Keyboard handling**:
- `useEffect` with `keydown` listener inside the dialog for Up/Down/Enter/Escape
- `onKeyDown` on the TextField for the same (captured before bubbling)

#### Global Keyboard Shortcut

In `App.tsx`, a `useEffect` adds a `keydown` listener on `window`:
- Detects `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux)
- Prevents default browser behavior
- Toggles the fuzzy search dialog (opens if closed, closes if open)

#### AppHeader Button

A new `IconButton` with `SearchIcon` is added to the AppHeader toolbar, positioned between the Settings button and the GitHub button. Tooltip shows "Search files (⌘K)".

### File Changes

| File | Change | Description |
|------|--------|-------------|
| `packages/frontend/src/components/FuzzySearch/fuzzy.ts` | NEW | Fuzzy matching algorithm |
| `packages/frontend/src/components/FuzzySearch/FuzzySearchDialog.tsx` | NEW | Overlay dialog component |
| `packages/frontend/src/components/FuzzySearch/useFileList.ts` | NEW | Hook to extract flat file list |
| `packages/frontend/src/App.tsx` | MODIFY | Add keyboard listener + dialog state + render dialog |
| `packages/frontend/src/Layout.tsx` | MODIFY | Pass `onFuzzySearchClick` prop through to AppHeader |
| `packages/frontend/src/components/AppHeader.tsx` | MODIFY | Add search button with ⌘K tooltip + prop |
| `packages/frontend/test/utils.ts` | MODIFY | Add missing `plantUML` default state |
| `packages/frontend/test/unit/components/FuzzySearch/fuzzy.test.ts` | NEW | Unit tests for fuzzy matcher |

### Performance Considerations

- **File list flattening**: Done once via `useMemo`, not on every keystroke
- **Fuzzy matching**: O(n * m) per file where n = query length, m = file path length. For 500 files with average path length 40, this is ~400k operations — instantaneous
- **Result rendering**: Limited to top 50 results to avoid DOM bloat. Typing "no results" shows an empty state message
- **No virtualization needed**: Typical mdts projects have <500 markdown files

### Accessibility

- Full keyboard navigation within the dialog
- Focus trapped inside the dialog (MUI Dialog default)
- Screen reader: dialog announced as modal, results as list items
- Escape key closes the dialog
- Click backdrop to close

## Deviations from Plan

### Scoring Weights Tuned During Implementation

Original plan values caused the algorithm to prefer scattered start-of-string matches over compact consecutive matches (e.g., `ab` in `aab` matched positions `[0,2]` instead of `[1,2]`). Adjusted as follows:

| Bonus | Planned | Implemented | Rationale |
|-------|---------|-------------|-----------|
| Consecutive match | +5 | +7 | Consecutive matching is the strongest signal; increased to dominate over other bonuses |
| Word boundary | +3 | +2 | Reduced so consecutive matching at non-boundaries still wins |
| Start-of-string | +5 | +2 | Reduced so later compact matches beat scattered prefix matches |

### ResultItem Extracted to Sub-Component

The `ListItemButton` rendering in results was extracted to a `React.memo(ResultItemInner)` sub-component to satisfy the `react/jsx-no-bind` ESLint rule. The component receives `onSelect` and `onMouseEnter` callbacks via props instead of inline arrow functions in the `map` iterator.

### filterAndSort Sorts Empty Queries

`filterAndSort` sorts files alphabetically even when the query is empty (previously planned as pass-through). This provides consistent ordering whether or not a query is entered.

### Additional Test Files Modified

Beyond the planned changes, test mocks in `App.behavior.test.tsx`, `Layout.test.tsx`, and `AppHeader.test.tsx` were updated to accommodate the new `onFuzzySearchClick` prop and the `FuzzySearchDialog` mock. The `AppHeader.test.tsx.snap` snapshot was regenerated to include the new search button.
