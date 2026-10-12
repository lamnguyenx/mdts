# Bug: `make` frontend build fails with `Cannot find module 'webpack-cli'` — FIXED

- **Date:** 2026-10-12
- **Status:** FIXED
- **Component:** `Makefile` (frontend dependency bootstrap)
- **Reported against:** `@lamnguyenx/mdts2` 2026.9.29 (`mdts2`), on `main` @ `db9413f`
- **Environment:** Node 24 / npm 11, Linux (MS-7E70), fresh/near-fresh working copy

## Summary

Running `make` (or `make all`) to build and globally install the CLI failed while building the
frontend:

```
Error: Cannot find module 'webpack-cli'
Require stack:
- /home/lamnt45/git/mdts2/node_modules/webpack/bin/webpack.js
    ...
    code: 'MODULE_NOT_FOUND'
make: *** [Makefile:12: frontend] Error 1
```

The failure looked like a broken dependency/peer-resolution problem (the build was preceded by a
wall of `npm warn ERESOLVE overriding peer dependency` output), but the frontend dependencies had
simply never been installed. `webpack` then resolved to the **root-hoisted** copy under
`node_modules/webpack` (a transitive dependency), which has no `webpack-cli` in the root tree, so
webpack aborted.

## Steps to reproduce

1. Clone the repo and install only the root dependencies (`npm install`) — as the old `Makefile`
   and the quick-start imply.
2. Run `make` (which previously ran `backend → frontend → install`).
3. The backend (`tsc`) succeeds, then `npm run build:frontend` runs
   `cd packages/frontend && webpack --config webpack.config.js` and fails with
   `Cannot find module 'webpack-cli'`, pointing at the **root** `node_modules/webpack`.

The build starts working again as soon as `packages/frontend/node_modules` is populated, which is
why the bug appeared intermittent.

## Root cause

The repository has **two independent npm install roots** (it is *not* an npm workspace):

- root `package.json` / `package-lock.json`
- `packages/frontend/package.json` / `packages/frontend/package-lock.json`

`webpack-cli` is a `devDependency` of `packages/frontend`, not of the root. The `Makefile` never
installed the frontend dependencies, so on a fresh clone the frontend build was relying on
resolution cascading up into the root `node_modules`:

- Root `node_modules/webpack` exists (pulled in transitively, e.g. via `netlify-lambda`), so
  `webpack` *resolved* — masking the missing frontend install.
- Root `node_modules/webpack-cli` does **not** exist, so the resolved webpack crashed at startup.

This is exactly why CI installs the two trees separately (`.github/workflows/*.yml` and
`release.yml` both run `npm ci` and then a second `npm ci` with
`working-directory: ./packages/frontend`), and why `CONTRIBUTING.md` tells contributors to run
`npm install` in both directories. The `Makefile` — the documented convenience entry point — did
not.

Two secondary defects made the failure harder to reason about:

1. **Circular dependency** in the old `Makefile`:
   ```make
   all: backend frontend install
   install: all
   ```
   make silently dropped it (`make: Circular install <- all dependency dropped.`), so the target
   graph was confusing and the warning looked like it might be the cause.
2. **No `clean` target** — `make clean` returned `make: *** No rule to make target 'clean'.`

## Fix

Reworked `Makefile` (only file changed):

```make
.PHONY: all install deps hotload frontend backend clean

# `make` builds everything and installs the CLI globally.
all: install

install: backend frontend
	npm install -g .

# Install dependencies for both the root and the frontend package.
deps:
	npm install
	cd packages/frontend && npm install

hotload: backend frontend
	npm link

frontend:
	@if [ ! -d packages/frontend/node_modules ]; then \
		echo "Installing frontend dependencies..."; \
		cd packages/frontend && npm install; \
	fi
	npm run build:frontend

backend:
	npm run build

clean:
	rm -rf dist
```

Behaviour changes:

- **Frontend deps are bootstrapped automatically.** If `packages/frontend/node_modules` is
  missing, `make frontend` installs it before building, so webpack can no longer fall back to the
  root copy and the `webpack-cli` crash cannot recur.
- **Circular dependency removed.** `make` remains "build everything + install globally"
  (`all → install → backend frontend`), but without the `all ↔ install` cycle.
- **`make deps`** added to install both trees in one shot (matches CI's two `npm ci` steps).
- **`make clean`** added (`rm -rf dist`; frontend output is written to the root
  `dist/frontend` per `packages/frontend/webpack.config.js`, so one removal covers both).

## Trials and errors

- **False lead — Babel peer-dependency noise.** The failing run was preceded by many
  `npm warn ERESOLVE overriding peer dependency` / `Conflicting peer dependency: @babel/core`
  messages (8.0.1 vs the 7.x `@babel/plugin-syntax-*` packages pulled by
  `babel-preset-current-node-syntax`), plus `deprecated glob@...` warnings. These are harmless npm
  chatter and were **not** the cause; the actual error is a plain `MODULE_NOT_FOUND` at webpack
  startup.
- **Confirmed the missing piece by comparing trees:** `ls node_modules | grep webpack` showed
  root had `webpack` but no `webpack-cli`; `packages/frontend/node_modules` had both. The failing
  stack trace pointing at `/home/lamnt45/git/mdts2/node_modules/webpack/bin/webpack.js` (the root,
  not `packages/frontend/...`) was the decisive clue that resolution had escaped the frontend tree.
- **`make clean` did not exist** (`No rule to make target 'clean'`), which is what first prompted
  looking at the `Makefile` and exposed the circular dependency warning.
- **Avoided a reinstall-every-build pitfall.** The obvious fix is to declare
  `packages/frontend/node_modules` as a make target with `package-lock.json` as a prerequisite.
  That breaks in practice because the generated `package-lock.json` is written *after* the
  `node_modules` directory, so its mtime is newer and make would rerun `npm install` on every
  build. The `if [ ! -d ... ]` guard avoids the timestamp problem entirely while still repairing a
  missing install.

## Verification

- `make -n` now prints a clean plan with **no** circular-dependency warning:
  `backend → frontend (with deps guard) → install`.
- `make backend` — `tsc && cp -R public/. dist/server/public`, succeeds.
- `make frontend` — `webpack 5.109.2 compiled successfully in ~2.3s` (deps already present, so no
  reinstall and no mtime churn).
- `make -n clean` — `rm -rf dist`.
- After the fix, `make` no longer depends on a root-hoisted `webpack`; the frontend build resolves
  `webpack`/`webpack-cli` from `packages/frontend/node_modules`.

## Notes

- Only `Makefile` was changed; no source, dependency, lockfile, or webpack config changes.
- Consider adding `workspaces` to the root `package.json` in the future so a single `npm install`
  covers both trees; that would be a larger change (lockfile/CI impact) and was out of scope for
  this fix.
- The `hotload`/`npm link` workflow is unchanged.
