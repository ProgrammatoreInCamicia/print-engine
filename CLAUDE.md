# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Crystal-Reports-style print engine (study project). It turns a declarative JSON
document + a data object into paginated, print-ready output (HTML/PDF via the browser).
The overriding design goal is a **renderer-agnostic core**: pagination and data-binding
know nothing about the DOM. Rendering lives entirely in a swappable adapter.

`README.md` holds the full design rationale, roadmap, and a worked end-to-end example.
Read it for the "why". This file covers the "how to work here".

## Commands

```bash
pnpm install
pnpm build          # tsc -b via `pnpm -r`, builds all packages in dependency order
pnpm test           # vitest run (jsdom env), all packages
pnpm typecheck      # tsc -b at the root

# single test file
pnpm exec vitest run packages/core/src/paginate.test.ts
# single test by name
pnpm exec vitest run -t "keepWithNext"

cd packages/playground && pnpm dev   # Vite dev server; print to PDF from the browser
```

## Architecture

The pipeline is three stages, each a pure function taking an injected dependency:

```
PrintDocument (JSON) + data
   → resolve(doc, data, ExpressionEngine)  → ResolvedDocument  (structural tree, no expressions left)
   → paginate(doc, resolved, Measurer)     → PaginatedDocument (header? / pages[] / footer?)
   → renderPages(paginated, doc.page)      → HTML/PDF          (adapter-html only)
```

Package dependency order (also the `tsc -b` reference order in `tsconfig.json`):

- **schema** — no deps. `PrintDocument`, `PageSetup`, regions, `Style`, and the `Node`
  discriminated union (`text`, `field`, `stack`, `repeat`, `group`, `image`, `canvas`).
  Schema-versioned (`CURRENT_SCHEMA_VERSION`). The validator returns a list of issues
  rather than throwing — invalid input is an expected outcome.
- **expr** — no deps. Expression language behind the `ExpressionEngine` contract
  (`contract.ts`): `evaluate(expression, ctx) → { ok, value } | { ok: false, error }`.
  Three stages: tokenizer → recursive-descent parser → tree-walking evaluator
  (`ts-engine.ts`). Tokenizer/parser throw internally; the engine boundary catches and
  converts to `{ ok: false }`. Exceptions never escape the contract.
- **core** — deps: schema, expr. **ZERO DOM code.** `resolve()` and `paginate()`.
  `paginate()` delegates height measurement to an injected `Measurer` interface
  (`measure.ts`); `LeafCountMeasurer` is the DOM-free stub used in Node tests.
- **adapter-html** — deps: core, schema. **The only package allowed to touch the DOM.**
  `render`, `DomMeasurer` (real `Measurer` — renders off-screen, reads height in mm),
  `renderPages`. Its tsconfig is the only one that includes the `DOM` lib.
- **playground** — Vite app wiring it all together into real PDFs. `private`, `noEmit`,
  **not** part of the project-reference build graph (Vite transpiles it).

### Key seams
- **The `Measurer` seam** is what keeps `core` DOM-free and unit-testable in Node. The
  core can't know how tall text is; only the renderer knows. Never import DOM into core —
  the compiler enforces this via the tsconfig `lib` split.
- **The `ExpressionEngine` contract** exists so a second implementation (planned
  Rust→Wasm) can be dropped into the `engines[]` array in `expr/src/engine.test.ts` and
  pass the exact same parameterized contract suite. Keep that test engine-agnostic.
- Expression scopes in `EvalContext`: `root` (`$`), `item` (`$item`), `group`
  (`$group.{key,items}`), `page` (`$page.{current,total}`). Style expressions use a `=`
  prefix; `format` strings drive value formatting (`number:0.00`, `date:dd/MM/yyyy`).

## Gotchas (repo-specific)

- **After adding a file to a package, add it to that package's `index.ts` barrel, then
  rebuild.** Cross-package imports resolve through compiled `dist/`, not source — a change
  in `core` is invisible to `adapter-html` until `pnpm build` runs. This is the most
  common tripwire here.
- ESM throughout. Relative imports use the `.js` extension even from `.ts` files
  (`import { x } from './foo.js'`).
- TypeScript is `strict` with `noUncheckedIndexedAccess`: indexed access is
  `T | undefined` — handle it.
- Comments/descriptions in the code are partly in Italian; match the surrounding language
  of the file you edit.
