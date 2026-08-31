# Documentation screenshots

These specs are **not tests**. Each one drives the app to a particular state and photographs it for
a guide in [docs/blog/](../../../docs/blog/). They live outside `cypress/e2e/`, so the automated
suite's `specPattern` never picks them up and `./deploy.js` never runs them.

## Folders

One folder per markdown file that uses the screenshots:

| Folder | Document |
| --- | --- |
| `new-feature-certificate-download/` | [docs/blog/new-feature-certificate-download.md](../../../docs/blog/new-feature-certificate-download.md) |
| `new-feature-feedback-submission/` | [docs/blog/new-feature-feedback-submission.md](../../../docs/blog/new-feature-feedback-submission.md) |
| `new-feature-new-student-data-collection/` | [docs/blog/new-feature-new-student-data-collection.md](../../../docs/blog/new-feature-new-student-data-collection.md) |
| `new-feature-global-chat/` | The member chat. Its images live in `docs/images/new-feature-global-chat/`; no blog post uses them yet, and the manual chapter ([docs/manual/21-member-chat.md](../../../docs/manual/21-member-chat.md)) is text-only like every other chapter |

The images each folder produces are committed under `docs/images/<same folder name>/`.

## Running them

From the repository root, with the stack up (`docker compose up -d`):

```
docker compose run --rm -v "$PWD/badhan-frontend-test/cypress:/app/cypress" \
  frontend-test npx cypress run --config-file cypress.docs.config.ts
```

Add `--spec "cypress/docs-screenshots/<folder>/**/*.cy.ts"` to regenerate one document's set.

The volume mount matters twice: the `frontend-test` image has **no** mount of its own, so without it
the container runs the specs baked into the image, and the PNGs it writes are destroyed with the
container.

Then copy the output into the repository:

```
cp badhan-frontend-test/cypress/screenshots/<folder>/*.cy.ts/*.png docs/images/<folder>/
```

## Two rules that are not optional

- **One `cy.screenshot()` per spec file.** In headless Electron the *second* capture in a file comes
  out blank, whatever the test boundaries — which produces artifacts that look exactly like a
  rendering bug. That is why these are many small files rather than one.
- **Wait after the element exists, before capturing.** Pages fade in over ~0.3s, so a capture taken
  on `exist` records the page at opacity 0. `cy.wait(1500)` is what the existing specs use.

Call `hideOverlays()` from [hideOverlays.ts](hideOverlays.ts) just before the capture. It hides the
dev-database watermark and the snackbars, both of which are fixed-position and float over whatever
element is being photographed.

## Cypress clips a tall element

An element screenshot is capped at roughly the headless window height (~815 usable pixels), and
widening the viewport does not help — it only makes an A4-proportioned preview taller. Where a panel
did not fit, the fix was a narrower viewport, or a second spec capturing the bottom of it with
`{ capture: 'viewport' }`.
