# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`@dynamiq/assistant` — an embeddable chat widget (React + vanilla JS) that talks to a Dynamiq AI agent deployment endpoint. Published to npm via semantic-release.

## Commands

```bash
npm run build          # rollup -c → dist/ (react, vanilla, browser IIFE bundles)
npm run dev            # rollup watch mode
npm run lint           # eslint src/**/*.{ts,tsx}
npm run start:react    # parcel dev server for examples/react (imports from ../../src directly)
npm run start:vanilla  # parcel dev server for examples/vanilla
npm run build:examples # builds the React example to dist/examples (deployed to GitHub Pages)
npm test               # jest — note: no jest config or test files currently exist
```

There is no test suite yet; verify changes by running an example with Parcel and by `npm run build` + `npm run lint`.

## Architecture

All behavior lives in a single framework-agnostic core class; the React and vanilla entry points are thin wrappers.

- `src/core/ChatWidget.ts` — `ChatWidgetCore`. Builds the entire widget DOM imperatively (no framework), owns message state, file uploads, open/close/fullscreen, feedback buttons, and API communication. Most changes land here.
- `src/react/ChatWidget.tsx` — mounts `ChatWidgetCore` into a ref'd `<div>` once on mount. ReactNode props (`title`, `prompts[].icon`) are converted to HTML strings with `renderToString` before being passed to the core. Only `params` is reactive after mount (via `updateParams`); other prop changes are ignored.
- `src/vanilla/ChatWidget.ts` — resolves a CSS selector and proxies `open/close/toggle/sendMessage/addMessage/destroy` to the core.
- `src/core/HistoryPanel.ts` + `src/core/Storage.ts` — chat history sidebar. `Storage` is a singleton over `localStorage`, scoped by the static `Storage.userId`, with size-based cleanup of old chats. Selecting a chat calls back into `ChatWidgetCore.loadChatHistory(sessionId)`.
- `src/core/components/UIComponents.ts` — HTML/SVG builders for widget pieces; `src/core/styles.css` is injected at runtime by `rollup-plugin-postcss` (`inject: true`), so there is no separate CSS file for consumers.
- `src/core/types.ts` — `ChatWidgetOptions` (the public props/options contract, shared by both wrappers) and message types. Public options are documented in the README props/events tables — keep them in sync.

### API protocol (`handleApiCommunication`)

- POSTs `FormData` to `api.url` with `input` (JSON: `input`, `user_id`, `session_id`, `chat_history`, plus any extra `params`), `stream`, `user_id`, `session_id`, and `files`.
- Streaming: response is parsed as SSE via `eventsource-parser`. Text arrives at `data.choices[0].delta.content` (string); `delta.step` changes insert a paragraph break. If `content` is an object it is an intermediate step (`thought`, `loop_num`) rendered into a collapsible "intermediate steps" block when `intermediateStreaming` is enabled.
- Non-streaming: expects JSON `{ output }`.
- `abortController` doubles as the "generation in progress" flag — history panel and New Chat button disabled state are derived from it.

### Message rendering

Bot messages are rendered with `marked` using a custom renderer (`setupMarkedRenderer`) that gives special meaning to fenced code-block languages emitted by the agent:
- ` ```chart ` — Vega-Lite spec; becomes a placeholder, then rendered with `vega-embed` (`renderVegaChartsInElement`). `updateChartCode` in `utils.ts` applies the theme's primary color.
- ` ```image ` (and inline `` `image{...}` `` codespans) — JSON with a `contract` ID. IDs are collected in `pendingContracts` and resolved after the message completes via the async `onImageBlock(contractIds)` callback; resolved URLs are cached on the message as `processedImages` (and persisted to history). `contract: "N/A"` is skipped.
- ` ```report ` — JSON rendered as manager/rep report cards, whose images also go through the contract flow.
- Tables and links are also overridden.

## Build notes

- Three rollup outputs: `dist/react/*` (CJS+ESM, `tsconfig.react.json`), `dist/vanilla/*` (CJS+ESM, `tsconfig.vanilla.json`), and `dist/index.browser.js` (IIFE, global `dynamiq`, all deps bundled — used by the CDN script-tag install). React/react-dom are peer deps and externalized.
- `marked`, `vega`, `vega-lite`, `vega-embed` are bundled. The `alias` block in `package.json` is for Parcel (examples), pointing vega packages at their browser builds.

## Commits & releases

- Conventional Commits are enforced by commitlint via a husky `commit-msg` hook.
- Pushing to `main` (or `next` for prereleases) triggers semantic-release. Besides `feat`/`fix`, the release config also cuts a patch for `refactor`, `style`, `chore`, and `docs(README)` — so most merged commits publish a new npm version.
