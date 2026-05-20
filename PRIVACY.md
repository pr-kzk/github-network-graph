# Privacy Policy

Last updated: 2026-05-20

## Summary

This Chrome extension does **not** collect, transmit, or share any personal data.

## Data handling

- **No data collection.** The extension does not send any data to any remote server it controls.
- **No remote code execution.** All executable code is bundled with the extension and audited at build time. The extension does not load JavaScript from remote sources.
- **Local-only storage.** User preferences are stored exclusively in the browser via `chrome.storage.local` and `chrome.storage.sync`. The stored values are:
  - `graphPrefs` (default graph mode)
  - `recentRepos` (the list of recently opened repositories)

  `chrome.storage.sync` data is synchronized by Google across the user's signed-in Chrome instances; this synchronization is governed by Google's own privacy policy, not this extension.
- **No analytics, telemetry, or tracking.**
- **No third-party services.**

## Network requests

The extension fetches data **directly from GitHub** on user action. No intermediary or third-party server is involved.

| Endpoint | When | Auth |
| --- | --- | --- |
| `https://github.com/{owner}/{repo}/network/meta` | When you open a repository graph | Cookie session (sent with `credentials: 'include'` so private repos work for the signed-in user) |
| `https://github.com/{owner}/{repo}/network/chunk` | Pagination through commit pages | Same |
| `https://api.github.com/repos/{owner}/{repo}/commits/{sha}` | When you select a commit, to load stats / files | Unauthenticated (rate-limited to 60 / hour / IP) |

The session cookie is sent **only** when the request target is `github.com`. The extension never reads or transmits the cookie itself; it relies on the browser's normal credentialed fetch behavior.

## Permissions rationale

| Permission | Purpose |
| --- | --- |
| `storage` | Persist the default graph mode and the recent-repositories list locally in the browser. |
| `activeTab` | Read the URL of the active tab when the user clicks the toolbar icon, so the popup can offer to open the current repository. Access is granted only on explicit user action and does not persist. |
| `host_permissions: https://github.com/*` | Fetch commit network data directly from GitHub (`github.com/{owner}/{repo}/network/meta` and `/network/chunk`). |
| `host_permissions: https://api.github.com/*` | Fetch per-commit detail (stats / file changes) from the GitHub REST API (`api.github.com/repos/{owner}/{repo}/commits/{sha}`) when you select a commit. Requests are unauthenticated and rate-limited to 60/hour per IP. |

## Contact

For questions about this policy, open an issue on the project's GitHub repository.
