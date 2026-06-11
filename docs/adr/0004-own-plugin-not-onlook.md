# Roll our own bundler plugin, don't depend on Onlook's

Onlook's `@onlook/nextjs` SWC plugin proves the `data-oid` pattern works, but we don't depend on it. Reasons: Onlook is a competing product with no guarantee of API stability for external consumers; their `data-oid` format is undocumented and may change; we want to own the attribute format to support our specific needs (e.g., column number, project root hash). The core transform logic is ~100-200 lines. We share the pattern, not the code.
