# Monorepo: extension + react-plugin in one repo

The Pi extension and the bundler plugin share the WebSocket protocol and `data-oid` format as contracts. If the client changes the `design:submit` payload shape, the extension must change too. A monorepo with `pnpm`/`npm` workspaces keeps these in sync: one repo, one PR, one review cycle. The extension is installed in Pi's extension directory; the react-plugin is installed in the user's project. The client script is embedded in the react-plugin package and injected as a virtual module at build time — not a separate npm package.

```
pi-design-mode/
├── packages/
│   ├── extension/       # Pi extension (TypeScript)
│   └── react-plugin/    # Bundler plugin + embedded client script
├── AGENTS.md
└── package.json
```
