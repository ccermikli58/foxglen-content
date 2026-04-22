# foxglen-content

Live-ops content bundles for [Foxglen / Tilkivadi](https://github.com/cancermikli/foxglen).
Binary-free content delivery: the app reads these JSON files at boot and
swaps them in without an App Store update.

## Bundles

- **`content-v2.json`** — core game data (chapters, levels, economy).
  Rarely changes. Schema owner: `app/src/content/content.ts`.
- **`atmosphere-v1.json`** — friends roster, activity feed, map pings.
  Changes often (seasonal events, themed lines). Schema owner:
  `app/src/atmosphere/atmosphere.ts`.

Each bundle has its own monotonic `version` field. The app swaps to a
newer bundle only when `remote.version > cached.version`, so you can
hot-swap content by committing a new version and pushing.

## Deploy flow

1. Edit the relevant `*.json` locally, bump the `version` inside the JSON.
2. Commit + push to `main`.
3. GitHub Pages auto-publishes within ~1 minute.
4. On their next cold start, apps fetch the new bundle, cache it, and
   activate it on the start after that.

Rollback = `git revert` + push. The app will only swap if the new version
is higher, so you may need to bump version past the bad one to deploy a
corrected bundle.

## Hosting URLs

- Content: `https://ccermikli58.github.io/foxglen-content/content-v2.json`
- Atmosphere: `https://ccermikli58.github.io/foxglen-content/atmosphere-v1.json`

Wired into the app via Firebase Remote Config flags
`content_bundle_url` / `atmosphere_bundle_url`.

## Versioning

Immutable filenames (`content-v2.json`, not `content.json`) so aggressive
CDN caching can't serve stale data. When bumping to v3, create
`content-v3.json` AND update the Remote Config URL. Old binaries keep
reading v2 safely.
