# Paper component redrawings

The public gallery presents 43 editable SVG reconstructions informed by specific figure regions from 16 papers. It does not embed the original figure crops. Source links remain in the expandable notes.

Each drawing preserves a useful visual relationship: local surface coordinates, aligned representation changes, camera coverage, provenance of feature layers, sparse matching, candidate selection, cache intervals, motion tokens, contact paths, hypergraph grouping, dimensional matrix operations, or identity tracking.

These are reusable schematic components, not replications of experimental images or computed results. Photos, point sets and response maps are represented by newly drawn explanatory geometry. Replace them with task-appropriate data when producing a scientific result figure.

- `references.json`: source paper, figure/page, inspected region, design rationale, transfer prompt and limitations.
- `../paper-inspired-templates.js`: editable vector geometry; every record has a distinct renderer.
- `redrawn/*.svg`: individual drawings, directly openable or downloadable.
- `../paper-inspiration-ui.js`: redraw-first gallery with insertion and scoped modification callbacks.

The earlier research PDF files and crops are retained as internal evidence; the gallery and component previews use only redrawn SVG geometry. No additional mechanism count is claimed for a different depiction of the same concept.

Regenerate previews with `node paper-inspiration/render-redrawn.cjs`. Verify library contracts with `node paper-inspiration/redrawn.test.cjs` and `node model.test.cjs`. Browser interaction and four-judge full-figure evaluation are not covered by these checks.

Round 2 adds 18 distinct visual patterns from 7 papers, including AOT (CVPR 2026, arXiv v2). Research scope is explicitly limited to inspected figures, captions, and the relevant local method passages. Run `curate-round2.py` before `curate.py` to reproduce merged metadata. The gallery sorts this batch first and offers a batch filter.
