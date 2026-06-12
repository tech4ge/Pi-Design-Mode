Status: ready-for-agent
Category: enhancement

## Parent

PRD: `.scratch/pi-design-mode/prd-distribution-readiness.md`

## What to build

Verify the full installation flow works end-to-end after the previous issues are merged. This is the validation step — no new code, just verification.

End-to-end behaviour: the bundled extension loads in Pi, the WS server starts, the browser widget connects, data-oid attributes are injected, and selections survive page reload. The react-plugin npm package contains only what it should.

### Verification steps

1. **Extension installation**: Copy the built `packages/extension/` directory (minus `src/`, `tests/`, `node_modules/`) to `~/.pi/agent/extensions/pi-design-mode/`. Remove the old symlink. Restart Pi. Run `/design`. Verify WS server starts (port 9481).

2. **Vite+React test app**: `cd test-app && npm install ../packages/react-plugin`. Start dev server. Open browser. Verify data-oid attributes present. Alt+Click to select. Verify widget appears. Submit a change. Verify Pi processes it.

3. **Next.js test app**: `cd test-app-nextjs && npm install ../packages/react-plugin`. Start dev server. Open browser. Verify data-source attributes present. Alt+Click to select. Verify widget appears. Refresh page — selections survive.

4. **npm pack verification**: `cd packages/react-plugin && npm pack --dry-run`. Verify tarball contains only `dist/*.js` + `package.json`. No maps, no source.

5. **All 40 tests still pass**.

## Acceptance criteria

- [ ] Extension loads from `~/.pi/agent/extensions/pi-design-mode/` without symlink or node_modules
- [ ] `/design` starts WS server, browser widget connects
- [ ] Vite test app: data-oid injection + widget + submit cycle works
- [ ] Next.js test app: data-source injection + widget + reload recovery works
- [ ] `npm pack --dry-run` shows only dist/*.js + package.json
- [ ] All 40 tests pass

## Blocked by

- #28 — Extension must be bundled
- #29 — React-plugin package must be clean
