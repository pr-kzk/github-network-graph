# Git Graph for GitHub

> Visualize the GitHub commit network (forks + main repo) in a dedicated tab.

A Chrome extension (Manifest V3) that opens a VSCode-Git-Graph-style commit viewer for any GitHub repository.

## Features

- Browse the **commit graph** of any GitHub repository in its own tab, with virtualized rendering for large histories.
- **Fork-aware**: choose between `Main only` (commits reachable from the focus repo's heads) and `Include forks` (full network).
- **Commit detail panel** with parent / children navigation and a per-file diff summary (additions / deletions / status).
- **Recent repositories** list in the popup.
- **Dark theme** by default.
- **Privacy-friendly.** Requests go directly to GitHub from your browser. Optional anonymous, opt-out usage and error stats — no personal data, no repository names. See [PRIVACY.md](./PRIVACY.md).

## Screenshots

Screenshots will be added alongside the first Chrome Web Store release. To preview locally, load the built `dist/` folder as an unpacked extension (see [Install → From source](#from-source)) and open any GitHub repository.

## Install

### From the Chrome Web Store

Coming soon — the published URL will be added here after the first release.

### From source

```sh
pnpm install
pnpm build:prod
```

Then load the `dist/` folder via `chrome://extensions` → "Load unpacked".

## Usage

1. Click the toolbar icon on any GitHub repository page.
2. Press the green button to open the graph in a new tab.
3. Or paste a URL / `owner/repo` shorthand into the input box.

The graph view supports:

- Click a commit dot or row to open the detail panel.
- Right-click for SHA / subject copy and parent jump.
- Toggle between `Main only` / `Include forks` in the header.

## Permissions

| Permission | Why |
| --- | --- |
| `storage` | Save the default graph mode and the recent-repositories list locally. |
| `activeTab` | Read the URL of the active tab when you click the toolbar icon, so the popup can offer "Open this repo". Access ends when the popup closes. |
| `host_permissions: https://github.com/*` | Fetch the commit network data directly from GitHub on demand. |
| `host_permissions: https://api.github.com/*` | Fetch per-commit detail (stats / files) from the GitHub REST API when you select a commit. Unauthenticated, rate-limited to 60 requests/hour per IP. |

No `scripting`, no content scripts, no remote code; optional opt-out anonymous diagnostics. See [PRIVACY.md](./PRIVACY.md).

## Localization

UI text is provided via `chrome.i18n`. Locales live under [`public/_locales/`](./public/_locales/):

- `en` — default
- `ja` — fallback when Chrome's UI language is Japanese

Adding a new locale: create `public/_locales/<code>/messages.json` with the same keys as `en`.

## Development

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Vite dev server with HMR |
| `pnpm build` | Development build |
| `pnpm build:prod` | Production build (sourcemaps hidden) |
| `pnpm typecheck` | `tsc -b --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest (jsdom) |
| `pnpm test:cov` | Coverage report |
| `pnpm package` | Build prod + zip into `releases/` |

Stack: Vite + React + TypeScript + Tailwind CSS + `@crxjs/vite-plugin`. Versions live in [`package.json`](./package.json).

## Project layout

```
src/
├── popup/        Popup UI (toolbar button)
├── options/      Options page
├── background/   Service worker (placeholder)
├── graph/        Commit graph viewer (web_accessible_resource)
│   ├── components/  React components
│   ├── hooks/       Reducer-based data hook + UI state hooks
│   └── lib/         GitHub network API parsing & transform
└── shared/       i18n, storage cache (external store), format, error helpers
public/
└── _locales/     en / ja message catalogs
```

## License

[MIT](./LICENSE)

## Reporting issues

[GitHub Issues](https://github.com/pr-kzk/github-network-graph/issues)
