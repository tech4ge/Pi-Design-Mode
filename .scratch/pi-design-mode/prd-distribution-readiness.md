Status: ready-for-agent
Category: enhancement

## Parent

None — standalone PRD

## Problem Statement

Pi Design Mode works end-to-end but can't be installed by anyone except the original developer. The extension runs from raw `.ts` source via a symlink to the repo. The react-plugin has no `.npmignore` or `files` field, so `npm publish` would ship source, tests, and config. There is no README. The `data-oid.ts` module is duplicated across packages. The extension requires its own `node_modules` with Babel + ws installed at runtime.

From a new user's perspective: there is no documented way to install and configure Pi Design Mode, and the packages aren't in a publishable state.

## Solution

Make the two packages distributable and document the installation process:

1. **Bundle the extension** into a single self-contained JS file with all dependencies inlined. No `node_modules`, no symlink, no build step on the user's machine.

2. **Clean up `@pi-design/react-plugin`** for npm publishing — only ship `dist/`, add `files` field, remove sourcemaps from distribution.

3. **Deduplicate `data-oid.ts`** — extension imports from react-plugin at build time.

4. **Write a README.md** covering both Vite+React and Next.js installation paths.

## User Stories

1. As a Pi user, I want to install the design mode extension by copying a directory, so that I can start using `/design` without building from source
2. As a Pi user, I want to install the react-plugin via `npm install`, so that I can add design mode to my Vite+React project
3. As a Pi user, I want to install the react-plugin via `npm install`, so that I can add design mode to my Next.js project
4. As a Pi user, I want a README that tells me exactly which steps to follow, so that I don't have to read source code to figure out setup
5. As a Pi user, I want the extension to work without a symlink to the repo, so that I can install it on any machine
6. As a Pi user, I want the extension to work without its own `node_modules`, so that the installation is a single copy-paste
7. As a package consumer, I want `npm install @pi-design/react-plugin` to ship only built JS files, so that my `node_modules` stays small
8. As a package consumer, I want no sourcemaps in the npm package, so that my project isn't bloated with dev artifacts
9. As a developer, I want to install the extension by copying the output of `npm run build`, so that the build-to-install path is obvious
10. As a developer, I want `npm pack --dry-run` to show only `dist/` and `package.json`, so that I can verify the package contents before publishing
11. As a developer, I want `data-oid.ts` to exist in one place, so that I don't have to keep two copies in sync
12. As a developer, I want the README to explain what design mode does, so that I can decide if it's useful before installing
13. As a developer, I want the README to list keyboard shortcuts, so that I know how to interact with the widget
14. As a developer, I want the README to explain the architecture briefly, so that I understand how the pieces fit together
15. As a Next.js user, I want the README to explain the SWC plugin config and layout import, so that I know what to add to my project
16. As a Vite user, I want the README to explain the vite plugin config, so that I know what to add to my project
17. As a developer, I want the extension to be rebuildable with a single command, so that I can make changes and reinstall
18. As a developer, I want the test apps to remain in the repo, so that I can verify changes end-to-end
19. As a developer, I want the extension's `package.json` to reference the built `dist/index.js`, so that Pi loads the bundled file

## Implementation Decisions

- **Extension bundled with tsup** into a single `dist/index.js`. All dependencies (Babel, ws, typebox) inlined. No external dependencies at runtime. The `package.json` `pi.extensions` field points to `./dist/index.js`.

- **Extension build pipeline**: New `packages/extension/tsup.config.ts` + `npm run build` script. Output goes to `packages/extension/dist/`. The `src/` directory stays for development but isn't needed at runtime.

- **Extension installation**: After `npm run build`, copy the entire `packages/extension/` directory (minus `src/`, `tests/`, `node_modules/`) to `~/.pi/agent/extensions/pi-design-mode/`. No symlink. No `npm install` needed at the destination.

- **Extension `data-oid.ts` eliminated**: The extension imports `parseDataOid` from `@pi-design/react-plugin/data-oid` at build time. Since tsup bundles everything, the import is resolved during the build — no runtime dependency on the react-plugin package. The duplicated `packages/extension/src/data-oid.ts` is deleted.

- **`hashProjectRoot` and `formatDataOid` stay in react-plugin only**. Extension never used them. After dedup, they only exist in one place.

- **React-plugin `files` field**: Add `"files": ["dist"]` to `packages/react-plugin/package.json`. This ensures `npm publish` and `npm pack` only ship built output. No `src/`, `tests/`, `tsup.config.ts`, or `.map` files.

- **Sourcemaps removed from distribution**: Set `sourcemap: false` in the react-plugin's tsup config, or keep generating them but exclude via the `files` field. Preferred: keep generating for local dev, exclude from package via `files: ["dist/*.js"]` (no maps). Decision: use `files: ["dist"]` and add a `.npmignore` that excludes `*.map` — simpler than glob patterns in `files`.

- **README.md scope**: One README at the repo root. Covers both packages. Structured as: What → Quick Start (Vite) → Quick Start (Next.js) → How It Works → Configuration → Commands & Shortcuts → Development.

- **No `npm publish` in this PRD**: We make the packages *publishable*, but don't actually publish to npm. That's a separate step requiring npm auth, CI, etc.

- **No version bump**: Stays at `0.0.1`. Versioning is out of scope.

- **No CI/CD**: Out of scope. Manual `npm run build` + `npm pack` verification.

## Testing Decisions

- **Existing unit tests are the primary seam**: After bundling the extension and cleaning up the react-plugin, all 40 existing tests must still pass. No new tests needed for packaging changes.

- **`npm pack --dry-run` as a validation seam**: After adding `files` field and `.npmignore`, run `npm pack --dry-run` and verify only `dist/*.js` and `package.json` appear in the tarball. No `src/`, `tests/`, `*.map`, `tsup.config.ts`.

- **Manual smoke test**: After bundling, copy the extension to `~/.pi/agent/extensions/pi-design-mode/`, reload Pi, run `/design`. Verify WS server starts and client connects.

- **Test apps**: After react-plugin cleanup, reinstall in both test apps and verify data-oid injection + client script still work.

- Good tests verify external behavior, not implementation details. The packaging changes don't change behavior — they change how the code is delivered. The right test is "does it still work after repackaging?" not "did the build step run?".

## Out of Scope

- Publishing to npm (requires auth, CI)
- Version bumping or changelog
- CI/CD pipeline
- Monorepo tooling (Lerna, Nx, Turborepo)
- Tree-shaking the extension bundle further
- E2E tests with a real Pi session
- Rewriting the extension in a different language or bundler

## Further Notes

- The extension currently uses a symlink (`src/` → repo). After bundling, the symlink is no longer needed — the installed extension is a self-contained copy.
- The react-plugin's `node_modules` is hoisted to the monorepo root via workspaces. This is fine for dev. The `files: ["dist"]` field ensures `npm publish` doesn't ship `node_modules`.
- The `browser-client.js` IIFE (33KB) is the largest single file in the react-plugin dist. It's already minified by tsup. No further optimization needed.
- The extension bundle will include Babel's AST parser + traverser + generator. These are large (~200KB estimated). This is acceptable for a dev tool — it only runs on the developer's machine, not in the browser.
