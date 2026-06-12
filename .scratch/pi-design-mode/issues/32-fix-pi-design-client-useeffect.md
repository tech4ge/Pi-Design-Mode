Status: ready-for-agent
Category: enhancement

## Parent

prd-architectural-cleanup.md

## What to build

Fix the `PiDesignClient` component in `next.tsx` so that the side-effect dynamic import of the browser client runs once on mount, not on every render. Wrap the `import()` call in a `useEffect(() => { ... }, [])`. The `NODE_ENV` guard stays inside the effect. No other changes.

## Acceptance criteria

- [ ] Dynamic `import("@pi-design/react-plugin/browser-client")` is inside `useEffect(() => { ... }, [])`
- [ ] `process.env.NODE_ENV` guard remains inside the effect
- [ ] Component still returns `null` unchanged
- [ ] Next.js dev app still connects to design mode (`/design` + Alt+Click works)

## Blocked by

None — can start immediately
