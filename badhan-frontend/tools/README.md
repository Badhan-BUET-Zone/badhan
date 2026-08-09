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
| `type` | **exactly** one of `Active Developers`, `Legacy Developers`, `Contributors of Badhan` — anything else and the person silently does not render |
| `calender` | free text, e.g. `August 2025 - Present`. Misspelled in the data and the template; leave it |
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
**discards anything added since the migration**, because those people exist only in git. No
credentials are needed — the database node and the bucket objects are publicly readable.

See [docs/plans/plan14.md](../../docs/plans/plan14.md) for why any of this moved.
