# Git Graph for GitHub

> Visualize the GitHub commit network (forks + main repo) in a dedicated tab.

A Chrome extension (Manifest V3) that opens a VSCode-Git-Graph-style commit viewer for any GitHub repository.

## Features

- Browse the **commit graph** of any GitHub repository in its own tab, with virtualized rendering for large histories.
- **Fork-aware**: choose between `Main only` (commits reachable from the focus repo's heads) and `Include forks` (full network).
- **Commit detail panel** with parent / children navigation and a per-file diff summary (additions / deletions / status). If the changed files can't be loaded, the panel says why (for example a rate limit with its reset time) and offers Retry and Open on GitHub.
- **Find and move quickly**: search loaded commits by subject, SHA, author or branch (press `/`), step through matches with Enter / Shift+Enter, and navigate the list from the keyboard (press `?` for the shortcut list).
- **Shareable views**: the address bar always reflects the selected commit and mode, and `Copy link to this commit view` reopens exactly that view.
- **Copy feedback**: copying a SHA or subject confirms with a short "Copied" notice.
- **Recent repositories** list in the popup, where you can remove one entry or `Clear all`. Opening a repository that already has a graph tab brings that tab to the front instead of opening a duplicate.
- **Switch repository in place**: click the `owner/repo` chip in the graph header, type a URL or `owner/repo`, or pick a recent repository.
- **Stays put while refreshing**: `Refresh` keeps the list, scroll position and selection on screen with a small `Refreshing…` indicator; a status bar shows how many commits are loaded and whether older history remains.
- **Branch orientation**: the `Branches` menu also lists fork branches grouped by owner in `Include forks` mode, and the detail panel shows which branches contain the selected commit.
- **Adjustable layout**: drag the edge of the details panel (or use the arrow keys on it) to resize it, or hide it with `Hide details panel`.
- **Themes**: follow your operating system, or pick the dark or light theme.
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
- Right-click (or Shift+F10 on a focused row) for SHA / subject / link copy and parent jump.
- Type in the search field to highlight matching commits; the count shows how many of the loaded commits match, and `Load older commits` extends the search to older history.
- Use `j` / `k` or the arrow keys to move between commits, `[` / `]` to jump to the first parent / child, `g` / `G` for the newest / oldest loaded commit, and `Enter` to move focus to the details.
- Toggle between `Main only` / `Include forks` in the header; the `?` button next to it explains each mode (`Include forks` can be slower on large repositories).

## Permissions

| Permission                                   | Why                                                                                                                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                                    | Save the default graph mode and the recent-repositories list locally.                                                                                                 |
| `activeTab`                                  | Read the URL of the active tab when you click the toolbar icon, so the popup can offer "Open this repo". Access ends when the popup closes.                           |
| `host_permissions: https://github.com/*`     | Fetch the commit network data and each commit's changed files directly from GitHub on demand, using your signed-in session so private repositories work.              |
| `host_permissions: https://api.github.com/*` | Fallback for per-commit detail (stats / files) from the GitHub REST API when the page above is unavailable. Unauthenticated, rate-limited to 60 requests/hour per IP. |

No `scripting`, no content scripts, no remote code; optional opt-out anonymous diagnostics. See [PRIVACY.md](./PRIVACY.md).

## Localization

UI text is provided via `chrome.i18n`. Locales live under [`public/_locales/`](./public/_locales/):

- `en` — default
- `ja` — fallback when Chrome's UI language is Japanese

Adding a new locale: create `public/_locales/<code>/messages.json` with the same keys as `en`.

## Development

| Command                             | Purpose                                    |
| ----------------------------------- | ------------------------------------------ |
| `pnpm dev`                          | Vite dev server with HMR                   |
| `pnpm build`                        | Development build                          |
| `pnpm build:prod`                   | Production build (sourcemaps hidden)       |
| `pnpm typecheck`                    | `tsc -b --noEmit`                          |
| `pnpm lint`                         | Oxlint, type-aware (warnings fail the run) |
| `pnpm lint:fix`                     | Oxlint with safe auto-fixes                |
| `pnpm format` / `pnpm format:check` | Oxfmt write / check                        |
| `pnpm test`                         | Vitest (jsdom)                             |
| `pnpm test:cov`                     | Coverage report                            |
| `pnpm package`                      | Build prod + zip into `releases/`          |

Stack: Vite + React + TypeScript + Tailwind CSS + `@crxjs/vite-plugin`, linted with Oxlint and formatted with Oxfmt. Versions live in [`package.json`](./package.json).

## Project layout

```
src/
├── popup/        Popup UI (toolbar button)
├── options/      Options page
├── graph/        Commit graph viewer (opened in its own tab)
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
