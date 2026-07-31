# Synthetic demo fixture

Every health value in this directory is deterministic, programmatically
generated sample data. It does not describe the maintainer, a contributor, or
any other real person.

- `scripts/generate-demo-insights.mjs` creates a temporary synthetic Apple
  Health export and regenerates the bilingual `summary.json` and
  `insights.json` fixtures.
- The four `*.llm.json` files are hand-reviewed example narratives constrained
  to those synthetic facts.
- `scripts/build-demo.mjs` validates the narratives and renders the public pages
  under `docs/`.

Regenerate the structured fixtures with `npm run demo:prepare`, then rebuild the
public reports with `npm run docs:build`.
