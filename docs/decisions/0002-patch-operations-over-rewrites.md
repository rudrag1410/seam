# 2. The model emits patch operations, never a rewritten document

**Status:** accepted

## Context
Asking a model to return a whole tailored resume makes every change implicit. Untouched text drifts, there is nothing to accept or reject, and output is slow and expensive.

## Decision
Resumes are parsed into an AST with stable node ids. The model returns typed operations (`replace_text`, `reorder`, `insert_bullet`, `add_skill`, ...) that reference those ids. Each operation maps to exactly one UI decision. A single pure function, `apply_ops`, produces the final document, implemented in Python and TypeScript and run against the same JSON vectors in `packages/fixtures/apply-ops`.

## Consequences
- Untouched content cannot change, and output tokens drop several-fold.
- Prompt injection has nowhere to go: output is schema-constrained and id-referenced.
- The two `apply_ops` implementations must stay in lockstep; the shared vectors make drift a test failure.
