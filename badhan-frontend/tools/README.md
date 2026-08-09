# Adding someone to the Credits page

The contributor list is [`src/data/contributors.json`](../src/data/contributors.json) and the avatars
are in [`src/assets/contributors/`](../src/assets/contributors/). Both are in git and ship in the
bundle — the Credits page makes no network calls. Editing the list is a pull request, not a console.

Per [CLAUDE.md](../../CLAUDE.md) every command below runs inside a container.

## 1. Resize the photo

Any square-ish photo, any size. The script crops to 200×200 and writes WebP, which is what keeps the
whole set of avatars near 120 KB instead of the 4.94 MB they were when they lived in Firebase Storage.

```
docker compose run --rm --no-deps frontend \
  node tools/vendor-contributors.js path/to/photo.jpg "Full Name"
```

It writes `src/assets/contributors/full-name.webp` and prints a record skeleton.

## 2. Add the record

Paste the skeleton into `src/data/contributors.json` and fill it in. Position in the array is
position on the page, within the person's group.

| Field | Notes |
| --- | --- |
| `name` | as it should appear |
| `type` | **exactly** one of `Lead`, `Developers`, `Contributors of Badhan` — anything else and the person silently does not render. `Lead` is a one-person group; the script fails if it does not hold exactly one |
| `image` | the filename from step 1, or `null` for the shared silhouette |
| `contribution` | array of short strings, one per line on the card |
| `links` | `icon` is an [MDI](https://pictogrammers.com/library/mdi/) name without the `mdi-` prefix; `color` is a Vuetify colour |

## 3. Open a pull request

Both files, plus the `.webp`.

---

## Regenerating everything from the old database

The list was migrated out of a Firebase Realtime Database (`badhan-buet-default-rtdb`) and a Firebase
Storage bucket, both of which are still live but no longer read by the app. Running the script with
no arguments re-downloads and rewrites everything from there:

```
docker compose run --rm --no-deps frontend node tools/vendor-contributors.js
```

This is only useful for verifying the committed files still match what the app used to serve. It
refreshes the records that came from the database and **carries everyone else through untouched** —
people added since the migration exist only in git, and a re-run neither drops them nor deletes
their avatars. No credentials are needed: the database node and the bucket objects are publicly
readable.

Two mappings at the top of the script exist so a re-run reproduces what is committed, rather than
resurrecting what the database still holds:

- `TYPE_MAP` and `LEAD` — the database still carries the older `Active Developers` /
  `Legacy Developers` split, which collapses into `Developers` plus a one-person `Lead`.
- `KEEP_LOCAL_PHOTO` — records whose committed photo is better than the database's. Add a name here
  whenever someone sends a real photo for a record the database still has on the silhouette,
  otherwise the next re-run puts the silhouette back.

See [docs/plans/plan14.md](../../docs/plans/plan14.md) for why any of this moved.
