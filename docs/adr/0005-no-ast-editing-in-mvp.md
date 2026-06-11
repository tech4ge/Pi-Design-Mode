# No AST-aware editing in MVP

Pi's existing `read`/`edit` tools are sufficient for design-mode changes (styling, layout, prop values). AST editing (`@babel/parser` + traverse + generate) adds significant dependency weight for a problem we don't yet have. String ambiguity errors — the usual justification for AST editing — are mitigated by `data-oid` giving the LLM exact file+line+column context. If string-ambiguity errors surface in practice, that's the signal to build AST editing with knowledge of which patterns cause them.

**Consequences:** Renaming a prop in 20 places or moving JSX between files won't be in scope for MVP design mode. Those are refactoring tasks, not design tasks.
