# Implementation Plan: Security hardening & correctness fixes

## Overview

Fix the findings from the full-repo review (2026-10-22). The top priority is the XSS chain:
bot output (which prompt injection can steer) is rendered through `marked` straight into `innerHTML`
with no sanitizing, and the custom renderers insert model-controlled strings without escaping.
After that come the localStorage growth and quota bug, the correctness bugs in image handling,
feedback, IDs and teardown, and the cost of re-rendering on every streamed token.

Each phase ships as its own PR. Most merges to `main` publish to npm (see CLAUDE.md), so every
PR must leave the widget fully working.

## Architecture Decisions

- **Sanitize in one place.** Pull the markdown pipeline out of `ChatWidget.ts` into
  `src/core/markdown.ts`, which owns a per-instance `Marked` and returns HTML that is already
  sanitized. Every bot-HTML sink (`updateMessage`, `renderMessage`) goes through it. This also
  removes the global `marked.use()` mutation (review #10) and makes the code unit-testable.
- **DOMPurify is the sanitizer** (new runtime dependency, about 20 KB min). Escaping alone can't
  handle raw HTML in markdown. It sits after our custom renderers, so it also catches any escape
  we miss. Widget-owned attributes (`data-chart-spec`, `data-contract`, `data-contract-id`) are
  explicitly allowed. A hook forces `rel="noopener noreferrer"` and `target="_blank"` and drops
  non-`http(s)`/`mailto` URLs.
- **Escape at the source as well** (`escapeHtml`/`escapeAttr` in `utils.ts`) for the report, flag,
  image and link templates. Defense in depth: keep the markup correct even if the sanitizer
  config changes.
- **Vega runs in interpreter mode** (`ast: true` with `expressionInterpreter` from
  `vega-interpreter`). This is CSP-safe with no `new Function`, and the loader blocks outside
  `data.url` fetches by default.
- **External resources are opt-in.** A new `allowedResourceOrigins?: string[]` option. Markdown
  `<img>` and Vega URLs from other origins are stripped unless allowed. This closes the
  "image-URL exfiltration" channel. Default: same-origin only. Note this as a behavior change in
  the README.
- **Tests first for security.** Jest + ts-jest + jsdom are already in devDependencies but not
  configured. Task 1 sets them up so every security fix gets a regression test made of real XSS
  payloads.

## Dependency Graph

```
T1 Jest setup
 └─ T2 markdown.ts extraction (per-instance Marked, behaviour-preserving)
     ├─ T3 escape helpers + renderer escaping
     ├─ T4 DOMPurify sanitizing + link policy
     │   └─ T5 resource-origin allowlist (img)
     └─ T6 Vega interpreter + loader restriction (uses allowlist from T5)
T7 Storage fixes (independent)
T8 Contract-image fixes (after T2 — touches renderer/pendingContracts)
T9 Small correctness bugs (independent)
T10 Teardown/destroy (independent)
T11 Streaming perf (after T2, T6)
T12 Docs/CI hygiene (last)
```

## Task List

### Phase 1: XSS fix (one PR: `fix: sanitize bot markdown output`)
- [x] Task 1: Jest + jsdom test setup
- [x] Task 2: Extract markdown pipeline to `markdown.ts` with a per-instance `Marked`
- [x] Task 3: Escape model data in custom renderers
- [x] Task 4: Sanitize rendered HTML with DOMPurify

### Checkpoint A
- [x] XSS payload tests pass; `npm run build` + `npm run lint` clean
- [x] Manual: browser bundle renders markdown, tables, charts, images, reports, flags as before (mocked SSE harness)
- [ ] Human review before merge (this is the release that matters most)

### Phase 2: Exfiltration & code-execution surface
- [x] Task 5: `allowedResourceOrigins` option for remote images
- [x] Task 6: Vega interpreter mode + restricted loader

### Checkpoint B
- [x] Charts render in the example under a strict CSP (no `unsafe-eval`)
- [x] README documents the new option and the behavior change

### Phase 3: Storage & correctness
- [x] Task 7: Storage — persist anonymous userId, global cleanup, quota-safe writes, `clearHistory()`
- [x] Task 8: Contract images — match by attribute, clear stale IDs, finalize non-streaming
- [x] Task 9: Small bugs — UUID message IDs, first-message feedback, Enter/IME handling
- [x] Task 10: `destroy()` — abort fetch, remove external listener, revoke object URLs

### Checkpoint C
- [ ] All tests pass; manual run of streaming + non-streaming + history reload + StrictMode remount

### Phase 4: Performance & hygiene
- [ ] Task 11: Render charts only once the message is final; finalize Vega views; send chat_history only once
- [ ] Task 12: README auth guidance, prompt-text `textContent`, CI `npm ci`/actions v4, eslint react version

### Checkpoint D
- [ ] All acceptance criteria met; ready for final review

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| DOMPurify strips markup the widget depends on (charts, contract images, report cards) | High | Explicit allowlist for widget attributes; snapshot tests for each fenced block type in T4 |
| Jest can't load ESM-only `marked` / `vega-*` | Med | Configure `transformIgnorePatterns`, or mock `vega-embed` in tests; T1 proves `marked` loads before anything else starts |
| Origin allowlist breaks existing customers who rely on remote markdown images / chart data URLs | Med | Ship it in its own PR (Phase 2); document it clearly; allow `['*']` as an escape hatch |
| Vega interpreter is slower / missing a feature some charts use | Low | Test the existing example charts; interpreter supports the full expression language |
| Each merge auto-publishes | Med | One PR per phase, Checkpoint review before each merge; consider `next` branch for Phase 2 |
| Persisting the anonymous userId changes history visibility for existing users | Low | Only affects hosts that don't pass `userId`; it's the intended behavior (history currently invisible) |

## Open Questions

1. **Customer-specific code** — the hardcoded `public-assets-rp` S3 flag URL, the `Photo/Documents`
   string stripping, and the report-card colors. Move them behind options (breaking for that customer),
   or leave them and only escape them? *Default in this plan: leave them, escape them, and validate the flag code.*
2. **`allowedResourceOrigins` default** — same-origin only (safest, may break someone), or `['*']` with
   a deprecation warning first? *Default: same-origin only, shipped as a `fix` with a README note.*
3. **Endpoint authorization** — the README tells users to disable it. Is there a supported
   token/proxy flow on the Dynamiq side to document instead? (Docs-only change in T12 until answered.)
4. **History when `userId` isn't provided** — persist an anonymous ID (plan default), or turn
   history off entirely for anonymous users?
