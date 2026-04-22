# foxglen-content

Live-ops content bundles for [Foxglen / Tilki Korusu](https://github.com/cancermikli/foxglen).
Binary-free content delivery: the app reads these JSON files at boot and
swaps them in without an App Store update.

## Bundles

- **`content-v3.json`** — core game data (chapters, levels, economy). Each
  chapter ships with inline localized `name: { tr, en }` so new chapters
  can be added remotely without an i18n.ts / binary update. Rarely changes.
  Schema owner: `app/src/content/content.ts`.
- `content-v2.json` — legacy schema (used `nameKey` i18n pointers). Kept
  for immutable-URL discipline; no longer referenced by any shipped binary.
- **`atmosphere-v1.json`** — friends roster, activity feed, map pings.
  Changes often (seasonal events, themed lines). Schema owner:
  `app/src/atmosphere/atmosphere.ts`.

Each bundle has its own monotonic `version` field. The app swaps to a
newer bundle only when `remote.version > cached.version`, so you can
hot-swap content by committing a new version and pushing.

## Authoring

- **`scripts/gen-levels.js`** is the generator for `content-v*.json`. Edit
  `CHAPTERS` + `SOURCE` + `BUNDLE_VERSION` inside it, then run:
  ```
  node scripts/gen-levels.js           # preview summary table
  node scripts/gen-levels.js --json    # + full JSON
  node scripts/gen-levels.js --write   # emit content-v${BUNDLE_VERSION}.json
  ```
  Output filename follows `BUNDLE_VERSION` — bumping it creates a new
  immutable file. `atmosphere-v*.json` has no generator; edit its JSON
  directly (it's hand-authored, with `version` bumped manually).

## Deploy flow

1. Edit the relevant source (gen-levels.js for content, atmosphere-v1.json
   directly for atmosphere), bumping `version` / `BUNDLE_VERSION`.
2. For content: run `node scripts/gen-levels.js --write` to regenerate.
3. Commit + push to `main`.
4. GitHub Pages auto-publishes within ~1 minute.
5. On their next cold start, apps fetch the new bundle, cache it, and
   activate it on the start after that.

Rollback = `git revert` + push. The app will only swap if the new version
is higher, so you may need to bump version past the bad one to deploy a
corrected bundle.

## Relationship to the app repo

This repo is the **authoritative** source for content + atmosphere. The
app repo (`foxglen`) ships a bundled default (`app/src/content/content.json`,
`app/src/atmosphere/atmosphere.json`) so new installs have something to
render before the first remote fetch returns. Those bundled defaults are
refreshed manually during binary release prep by copying from here:

```
# From app/ directory, before a binary release:
cp ../foxglen-content/content-v3.json src/content/content.json
cp ../foxglen-content/atmosphere-v1.json src/atmosphere/atmosphere.json
```

Normal content updates **do not** require refreshing the bundled defaults
— the remote fetch does the work.

## Hosting URLs

- Content: `https://ccermikli58.github.io/foxglen-content/content-v3.json`
- Atmosphere: `https://ccermikli58.github.io/foxglen-content/atmosphere-v1.json`

Wired into the app via Firebase Remote Config flags
`content_bundle_url` / `atmosphere_bundle_url`.

## Versioning

Immutable filenames (`content-v3.json`, not `content.json`) so aggressive
CDN caching can't serve stale data. When bumping to v4, create
`content-v4.json` AND update the Remote Config URL. Old binaries keep
reading their pinned version safely.
