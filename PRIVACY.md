# Privacy Policy

Last updated: 2026-11-08

## Summary

This Chrome extension does **not** collect, transmit, or share any personal data. It optionally sends **anonymous, aggregate usage and error statistics** to help improve the extension. Telemetry is on by default, contains no personal data, and can be turned off at any time (see [Anonymous telemetry](#anonymous-telemetry)).

## Data handling

- **No personal data.** The extension does not collect personal data, and it never sends repository names, commit SHAs, URLs, or any content you view to the developer or to any analytics service. Your requests to GitHub (see [Network requests](#network-requests)) necessarily name the repository you open, because GitHub is the service being displayed.
- **No remote code execution.** All executable code is bundled with the extension and audited at build time. The extension does not load JavaScript from remote sources.
- **Local-only preferences.** User preferences are stored exclusively in the browser via `chrome.storage.local`. Stored values never leave the user's machine. The stored values are:
  - `graphPrefs` — the default graph mode (`network` or `repo-only`) and color theme (`dark`, `light` or `system`)
  - `graphLayout` — the width and collapsed state of the details panel, when you have set them
  - `recentRepos` — up to 6 entries of `{owner, repo, openedAt}` for the recently opened repositories list shown in the popup
  - `telemetry` — `{enabled, promptSeen}`: whether anonymous telemetry is on, and whether the first-run notice has been shown
- **Session cache.** Per-commit details (changed files and line counts) you have opened are cached in `chrome.storage.session` so reselecting a commit does not use another request. It stays on your machine and is cleared when the browser closes.
- **Anonymous, opt-out telemetry only.** See [Anonymous telemetry](#anonymous-telemetry) below. No persistent identifiers, no other third-party services.

## Anonymous telemetry

To understand which features are used and where errors happen, the extension can send anonymous events through [Aptabase](https://aptabase.com), a privacy-first analytics service.

- **On by default, opt-out anytime.** A first-run notice in the popup explains this, and the Options page has a toggle to turn it off. When off, nothing is sent.
- **No persistent identifiers.** Requests are sent without cookies. The extension attaches a random session id that is held in memory only and rotates after an hour of inactivity; it is never written to storage.
- **What the analytics server sees.** Like any web request, each event reaches Aptabase's server together with your IP address and browser User-Agent. According to [Aptabase's privacy statement](https://aptabase.com/legal/privacy), these are processed in memory only and never stored, and are used to derive a pseudonymous daily user ID with a salt that is rotated every 24 hours and deleted within 48 hours. Events from the same browser can therefore be grouped together for up to a day, but not linked across days or to a person.
- **What is sent:** a timestamp, the random session id, your browser's language setting (for example `en-US`), the SDK version, and an event name with at most a small, fixed label. The events are: a graph was opened (`detected` / `manual` / `recent`), the mode changed (`network` / `repo-only`), a graph was refreshed, a commit was selected, the repository was switched, a link was copied, search was used, the shortcut list was opened, and error categories (for example `network`, `notFound`, `rateLimit`).
- **What is never sent:** personal data, repository owner/name, commit SHAs, URLs, search text, page content, precise location, or any persistent identifier.
- **Build-time key.** Telemetry runs only in builds configured with an Aptabase app key (`VITE_APTABASE_APP_KEY`). Community builds without the key never send anything.

## Network requests

On user action, the extension fetches data **directly from GitHub**. The only other request is the optional anonymous telemetry event listed below, which can be turned off.

| Endpoint                                                    | When                                                                  | Auth                                                                                             |
| ----------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `https://github.com/{owner}/{repo}/network/meta`            | When you open a repository graph                                      | Cookie session (sent with `credentials: 'include'` so private repos work for the signed-in user) |
| `https://github.com/{owner}/{repo}/network/chunk`           | Pagination through commit pages                                       | Same                                                                                             |
| `https://github.com/{owner}/{repo}/commit/{sha}.diff`       | When you select a commit, to load stats / files                       | Cookie session (sent with `credentials: 'include'` so private repos work for the signed-in user) |
| `https://api.github.com/repos/{owner}/{repo}/commits/{sha}` | Fallback when the request above is unavailable                        | Unauthenticated (rate-limited to 60 / hour / IP)                                                 |
| `https://*.aptabase.com/api/v0/event`                       | When anonymous telemetry is enabled, to record a usage or error event | Anonymous (no cookies; sent with `credentials: 'omit'`)                                          |

The session cookie is sent **only** when the request target is `github.com`. The extension never reads or transmits the cookie itself; it relies on the browser's normal credentialed fetch behavior.

## Permissions rationale

| Permission                                   | Purpose                                                                                                                                                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `storage`                                    | Persist the default graph mode and the recent-repositories list locally in the browser.                                                                                                                                  |
| `activeTab`                                  | Read the URL of the active tab when the user clicks the toolbar icon, so the popup can offer to open the current repository. Access is granted only on explicit user action and does not persist.                        |
| `host_permissions: https://github.com/*`     | Fetch commit network data directly from GitHub (`github.com/{owner}/{repo}/network/meta` and `/network/chunk`).                                                                                                          |
| `host_permissions: https://api.github.com/*` | Fetch per-commit detail (stats / file changes) from the GitHub REST API (`api.github.com/repos/{owner}/{repo}/commits/{sha}`) when you select a commit. Requests are unauthenticated and rate-limited to 60/hour per IP. |

## Contact

For questions about this policy, open an issue on the project's GitHub repository.
