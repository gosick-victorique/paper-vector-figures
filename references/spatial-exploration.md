# Spatial exploration for modules

Turn the preference for 3D into concrete design work. Explore how spatial structure explains each suitable module, then choose an appropriate representation. Adding uniform thickness to a flat block diagram is insufficient. Respect the current reference restrictions and the structure already accepted by the user.

## 1. Identify spatial opportunities from relationships

First decide which modules deserve expansion for this figure's purpose. Do not import every small component from the paper to find 3D opportunities. For each retained module, state the object, operation, and change readers need to see. Look for layers/channels, local/global relationships, interior/exterior, partitioning/concatenation, index correspondence, candidates/selection, views/projections, and aggregation/distribution.

Set the focal point and division of work with the text before selecting exploration targets. Sub-operations supporting one claim can be explored together. The number of candidates or modules does not determine the number of final regions. Merge, subordinate, or remove sketched details when appropriate; exploration effort does not justify fragmentation.

State what depth means: physical coordinates, data dimensions, feature geometry, or display space used only for grouping/exploding objects. Abstract algorithms can use display space to organize real relationships, but this does not authorize invented distances, surfaces, trajectories, or dimensions. Assess every retained mechanism with distinct spatial potential, not just the easiest one. Ordinary labels, arrows, and tiny operators need no independent exploration.

Record compactly in the existing brief: `module / relationship / depth meaning / candidates / sketch location / choice and tradeoff`.

## 2. Propose structurally different candidates

Usually propose 2–3 justified spatial organizations per suitable module, then screen them. Candidates must change object organization or how a relationship becomes visible. Changing the color, thickness, corner radius, or camera of the same stack is one structure, not several. Do not count obviously incorrect alternatives or default every module to cubes and sheets.

Preserve the same necessary semantics across candidates, though element counts may differ. If one preserves provenance, intervention sites, or sharing and another shows isolated geometry, give the latter compact interfaces or shared context before comparing. Missing essential information is not evidence against its geometry. Each retained candidate must plausibly serve the explanatory task; sketch count alone does not establish exploration quality.

Ask whether depth contributes. If removing thickness and perspective leaves every relationship equally visible, the candidates may be flat layouts in disguise. Try a structure where depth reveals correspondence, interiors, grouping, or separated paths: source/scope facets, cutaways exposing selections, or operations organized around a shared object. Do not invent data dimensions. If no useful spatial relationship exists, record that conclusion and choose clear 2D or shallow relief without claiming a spatial explanatory gain.

| Relationship | Spatial alternatives to compare | Preserve |
|---|---|---|
| Channels, layers, multiple resolutions | Aligned exploded layers; shared-reference cross-sections; a volume with a pulled-out block | Layer identity, dimensions/scale changes, accessed location |
| Local selection, masks, updates | Translucent overlay and raised selection; cutaway cells; overview plus corresponding detail | Same selection, unchanged region, before/after correspondence |
| Partitioning, transforms, reassembly | Partitioned plane with local explosion; indexed block array; paired source/target planes | Block boundaries, transform scope, concatenation axis; display displacement is not algorithmic movement |
| Routing, sets, sharing | Layered index network; branches around one shared object; source/target facets | Actual edges, identity versus address; display distance does not encode weight |
| Multiple views, projection, fusion | Frusta and common object; observation planes around a common coordinate frame; aligned sections/reprojection | Whether cameras/coordinates are real, correspondence, fusion site |
| Feature constraints and optimization | Justified vectors/basis planes; constraint volumes/sections; spatial candidates and selection states | Angles, distances, and boundaries supported by the operator; no invented manifold or trajectory |

If only one spatial structure is valid, explain why others are unsuitable, sketch it, and compare with a compact 2D representation. Do not invent a second valid candidate to meet a quota. Reuse sketches for genuinely identical mechanisms; similar labels alone do not establish identical relationships.

## 3. Draw local sketches before choosing

When multiple viable structures exist, draw at least two lightweight, viewable local sketches. A combined SVG/HTML sketch sheet is sufficient; no complete figures, polished materials, separate agents, or four-reviewer cycles are required per candidate. Draw objects and key changes first, with identification labels. Representative examples must preserve real relationships; illustrative numbers are not measurements.

Compare at the same expected module footprint, with the same content and similar annotation density. Zoom in to check geometry, but decide at the size the module will occupy in the whole figure. Change structure first; tune camera, layer spacing, and opacity after selecting it. This separates structural benefits from rendering differences.

Compare using concrete questions rather than invented precise scores:

- Are key objects, correspondences, and changes directly visible? What does this explain beyond a plane or shallow card?
- Are silhouettes and interiors clear? Are volume, whitespace, and visual balance coherent?
- Are important regions occluded? Does depth imply false causality, quantity, or geometry?
- Is it readable at the intended footprint? Do required labels, connections, and legends cost more than the explanatory benefit?

A shallow stack can win when accurate and attractive, but should not automatically end exploration before other valid structures are compared. If a candidate performs poorly, correct a concrete organizational or camera problem once where useful; fall back to 2D if accuracy, readability, or appearance still suffers. When there is no meaningful spatial relationship, retain 2D directly rather than manufacturing sketches.

Distinguish an unsuitable structure from weak execution. Missing labels, faint selections, and foreshortening can often be repaired locally and do not invalidate an entire representation family. Abstract features are not physical 3D, but can still use explicitly conceptual display space with precise front-facing readouts. Fall back when misleading implications cannot be resolved or benefits are insufficient. Repair only obvious unfair conditions that could change the selection; do not rescue every candidate.

## 4. Integrate and inspect interactions

The most attractive local candidate may not suit the whole figure. Place it in the existing regions and coordinate scale, display angle, lighting, and color roles. Modules can use different geometries. Actual observation viewpoints and comparison coordinates take precedence over stylistic uniformity.

Include transitions between adjacent operations in the exploration. Extend an existing sketch to show two steps rather than generating another full candidate set. Trace one representative object or selection: what changes, what is received next, and whether the representation domain changes. Provenance, indices, selections, or transform interfaces must establish correspondence; similar colors and an arrow alone do not. Domain changes may alter shape and texture. Separate independent explanatory examples rather than linking them as one real computation. This prevents a collage of attractive but disconnected scenes.

Allocate spatial depth to key mechanisms and use simple interfaces for ordinary operations. Use depth to separate relationships or reduce connections, not to turn every module into a separate scene. If the composition becomes crowded, consolidate secondary detail or reconsider a candidate rather than enlarge the canvas by default. Favor local replacement within an accepted overall structure.

Keep sketches and concise choice notes. In the full skill workflow, the selected design proceeds to drawing and four-reviewer evaluation. Reviewers independently inspect the completed figure without receiving the designer's favored candidates or self-scores first. If review finds a key module is still merely a labeled 3D container, return to structural alternatives; added thickness, transparency, or a new angle alone is not a structural redraw.

## Completion criteria

Each distinct suitable mechanism has been assessed; viable structural alternatives have been compared in actual sketches; selected designs retain key relationships at their expected footprint; and the combined figure has coherent hierarchy. Then proceed to detailed drawing rather than enumerating every geometry or camera. Sketching is design work, not an extra approval gate, export check, or fixed review schedule. Respect a host executor's explicitly limited quick-generation mode.
