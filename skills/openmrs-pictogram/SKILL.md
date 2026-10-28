---
name: openmrs-pictogram
description: Choose or draw a pictogram for an O3 page header, check it against the pictograms and illustrations already in use, and add it to esm-styleguide. Use when an O3 page needs a header pictogram, when a PageHeader has an empty illustration, or when asked to pick, draw, review or integrate a pictogram.
license: MPL-2.0 with Healthcare Disclaimer (https://github.com/openmrs/openmrs-contrib-ai-skills/blob/main/LICENSE)
compatibility: Needs Node 18 or newer, Chrome or Chromium, and local clones of openmrs-esm-core and the O3 apps. Optionally uses the GitHub CLI (gh) for inventory --github. Downloads Carbon pictogram metadata from jsDelivr on first use unless @carbon/pictograms is installed nearby.
metadata:
  version: "1.0.0"
---

# O3 Pictogram

Pick or draw a pictogram for the O3 page the user names, and integrate it if they ask.

O3 page headers have a 92px pictogram at the left with the title beside it. `PageHeader` requires an `illustration`, so a page with no fitting pictogram passes `<></>` and its title sits flush against the edge. The fix is a pictogram: an existing one when the concept matches, a new one when nothing does.

If the user hasn't said which page, ask. Before pushing, opening a PR or editing one, show the user what you'll do and wait for their go-ahead. Credentials and writing style come from the user's own setup.

## Scripts

The scripts are in this skill's `scripts/` folder. They're plain Node with no npm dependencies, and they take paths as arguments. Run them from anywhere inside an O3 checkout: repos default to `$O3_REPOS_DIR`, then the nearest folder at or above the current one that holds `openmrs-esm-*` checkouts. Chrome is found at the standard macOS, Linux and Windows locations (override with `--chrome` or `CHROME_PATH`). Write every output to one directory per task, because the user reviews it. Apart from those outputs, the scripts only write a cached copy of the Carbon registry to the temp directory. In the examples, `<skill>` is this skill's folder.

| Script | Use it for |
|---|---|
| `inventory.mjs` | Styleguide pictograms and where they're used, SVG files in the styleguide that aren't registered yet, identical artwork under different names, and app-local header illustrations. Reports which sources it searched, their revisions, and any that are stale or partial. |
| `carbon-search.mjs` | Carbon concepts by keyword, alias and category. Prints the version used. |
| `preview.mjs` | Contact sheet and header preview, rendered the way `Pictogram` renders today. |
| `svg-bounds.mjs` | How a draft's drawn area compares with the current set. |
| `measure-header.js` | Header geometry on a live page. It isn't a CLI: paste it into a browser console or JavaScript tool on the page you want to measure. |

```bash
# What exists, where it's used, and app-local illustrations (writes a report)
node <skill>/scripts/inventory.mjs --out out/inventory.md

# Carbon concepts for a page's purpose
node <skill>/scripts/carbon-search.mjs document summary print --category Healthcare --category File
node <skill>/scripts/carbon-search.mjs --show white-paper --out out

# Contact sheet plus header preview, rendered the way Pictogram renders today
node <skill>/scripts/preview.mjs --out out --o3 all --carbon white-paper,contract \
  --svg draft=out/draft.svg \
  --jsx form-builder=../openmrs-esm-form-builder/src/components/header/illustration.component.tsx \
  --header draft=out/draft.svg --title "Visit Summary Configuration"

# How a draft's drawn area compares with the current set
node <skill>/scripts/svg-bounds.mjs out/draft.svg
```

## Steps

**1. Write the page's purpose in one sentence.** Read the page's code and on-screen text. Read the ticket, feature PR or backend module only if those leave it unclear. The pictogram shows the page's subject, not its title. For example, the Visit Summary Configuration page is "an admin editor for the sections of a printed clinical handover document", which points to a document, not a gear.

**2. Check existing pictograms.** Run `inventory.mjs` and render the set with `preview.mjs --o3 all`. Both read the registry from the esm-core checkout, so if it isn't on an up-to-date main, export main instead (`git archive origin/main packages/framework/esm-styleguide/src/pictograms | tar -x -C <dir>`) and pass `--esm-core <dir>`. Add pictograms from open PRs with `--svg`, since a draft can collide with those too. The inventory also lists SVG files in the styleguide that were never registered: one of those may already show the concept, ready to register. If a pictogram or unregistered file already stands for the same concept, use it and go to step 6. If the inventory reports identical artwork under two names, don't pick either for a third concept. Only add a named alias (like `PatientListsPictogram = PatientsPictogram`) if the domain name helps app authors. Don't borrow a pictogram that stands for a different concept, such as one department's pictogram on another department's page.

**3. Search Carbon for concepts.** Run `carbon-search.mjs` with keywords from the purpose sentence. Include synonyms (Carbon's `white-paper` only came up through its `summary` alias) and relevant categories (`--list-categories`). Shortlist 10 to 30.

**4. Check for collisions.** Render the shortlist next to the O3 set and the app-local illustrations from the inventory. Use `--jsx` for static inline SVG components, and screenshot the running app for anything the script flags. Compare silhouettes at 92px. For each finalist, name the nearest existing pictogram or illustration and say how the finalist differs. A source the inventory marks as stale, partial or not searched isn't evidence that something is unused, so say which sources weren't covered.

**5. Draw, then show the user.** Read [references/drawing.md](references/drawing.md) first. Draw the SVG, check it with `svg-bounds.mjs`, and preview it with `preview.mjs --header`. Iterate until it sits comfortably in the set: first drafts of common shapes often look like something already there. Then show the user the shortlist, the recommendation and the draft in one message, and explain the visual choices. If they'd rather a designer draw it, write a brief instead.

Name it after the domain or module when other pages could reuse it (`PatientDocumentsPictogram`). Name it after the page or service when it's specific to it (`ServiceQueuesPictogram`).

**6. Integrate, if the user asks.** Read [references/integration.md](references/integration.md). It shows how to work out the file list, registration, exports, mocks, changeset and generated docs from the current repo, the app-side change (pictogram, header border, spacing), and traps from past PRs. Check the result with the real component, in the Storybook pictogram gallery or the app shell. The static preview doesn't count as that check.

## Rules

- If a tool refuses an action, don't work around it. Report what was refused.
- Before editing a PR body, re-read the live body: the user may have edited it in the browser, for example to add a screenshot.
- Keep provenance with the asset. If Carbon path data was copied or traced, add the source pictogram, version and Apache-2.0 notice as a comment inside the SVG. If only the concept was borrowed and the drawing is new, a note in the PR is enough.
- Report what you measured or rendered separately from your visual judgement. "Reads as distinct at 92px" is a judgement.

## Output

1. The purpose sentence and where it came from.
2. Reuse: which existing pictogram, or why none fits.
3. The shortlist with Carbon names and version, plus the contact sheet.
4. Collisions: the nearest neighbour for each finalist, and the sources not searched.
5. The recommendation and draft, with what changed from the Carbon original.
6. If integrating: the files changed, how it was checked, and what's left (release, app change).
