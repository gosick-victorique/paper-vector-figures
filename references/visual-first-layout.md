# Visual-first figures and publication layout

A paper figure should make the text easier to understand. Understand the method before drawing, then allocate explanatory depth according to the figure's claim. The main figure need not reproduce every equation. Large-screen scores, long formulas, and poster proportions from historical cases are task-specific evidence, not defaults.

## Establish the destination first

Read the current paper and request to identify the claim this figure supports. Do not default to a complete method pipeline. Representations can be combined:

| Explanatory task | Preferred organization |
|---|---|
| Operations, dependencies, updates | Object transformations, essential flow, state comparisons |
| System composition and interfaces | Structural hierarchy, topology, local expansion |
| Conceptual differences, motivation, boundaries | Juxtaposed comparisons, relationship diagrams, concrete contexts |
| Geometry, spatial relationships, experimental setups | Scenes, coordinates, cross-sections, measurements, interactions |
| Qualitative results and failures | Aligned examples under matched conditions; real results rather than invented outputs |

Use scientific plotting tools and real data for experimental curves and statistical charts. Embed them in mixed figures if appropriate; do not turn measured relationships into decorative 3D diagrams.

Read actual column widths and available height from the supplied template, text area, or existing figures. In the brief, record the figure's purpose, type, destination, column placement if relevant, target width × height, and main font size. Reserve caption space. Different figures in one paper may use different placements; do not automatically deliver two versions.

Without a template, choose a provisional layout from the number of compared objects, reading direction, and detail hierarchy. Ask only if this choice materially changes the composition and cannot reasonably be inferred. Rough starting widths of 85 mm for one column and 178 mm across two columns are adjustable assumptions, not conference specifications. Choose height for the task and page footprint; do not impose a universal aspect ratio or assume a complex method needs two columns. Begin with final text around 8–10 pt and adjust to the template and font. State assumptions and let subsequent requirements override them. For uses outside a paper, use the actual display area.

Physical placement matters more than SVG coordinate count. For viewBox width W, insertion width w mm, and logical text size s, printed text size is approximately `s × w/W × 72/25.4 pt`. A 1,800-unit figure inserted at 178 mm turns 20-unit text into about 5.6 pt. Doubling canvas pixels does not improve print readability.

When comparing compact layouts, track the main font size, smallest necessary mark, and legibility of the critical detail. If reduced height depends on smaller indices, selections, or labels, report a footprint/readability tradeoff, not just a percentage improvement. Recover space from repeated headings, containers, and explanations first.

For excessive whitespace, distinguish useful separation and object recognition from empty gaps within modules. Bring related objects and labels together, tighten title-to-subject gaps, crop regions to their content, then reconsider container proportions. Equal-height boxes and preset aspect ratios should not preserve empty regions; decorative elements should not fill them. Recheck joins, insets, and dense labels after compression. Restore local space when congestion appears.

## Draw object changes before explanations

First show the central objects and transformations. Position, contour, state, selection boundaries, and connections should carry the core action. Add short names or verbs, necessary IDs, and legends to resolve ambiguity. Replacing sentences with opaque abbreviations does not improve clarity; attractive icons without mechanism are also insufficient.

| Meaning | Show graphically | Usually leave to caption or text |
|---|---|---|
| Selection/masking | Same candidate set, selected boundary, retained/excluded items, destination | Full criterion derivation and implementation parameters |
| Copying/sharing | One source connected to actual recipients, consistent IDs/content | Repeated sentences saying that a quantity is shared |
| Fusion/weighting | Inputs meeting at the intervention site, contributions encoded explicitly | Expanded losses and full numerical tables |
| Update/feedback | The same object before/after, feedback landing on the updated field | Optimizer details and generic recurrence derivations |
| Alignment/correspondence | Shared coordinates, IDs, or the same example before/after | Lengthy motivation for alignment |

If numbers, line widths, or opacity encode magnitude, provide the underlying data and decoding basis. Do not invent quantitative relationships to reduce text.

Omit formulas by default. If a central operator needs one, first try a short relation adjacent to its objects. If more are needed, identify each one's distinct interpretive role. There is no rigid formula quota: retain necessary relationships without moving a full derivation into the main figure. Long titles, claim paragraphs, source notes, and experimental settings belong outside it.

Check whether the same claim appears in the overall title, region title, operation sentence, and effect sentence. Region titles locate content; operations and outcomes belong near changing objects. Merge repeated levels and give the recovered area to the mechanism rather than shrinking all type. Necessary causal phrases can remain, but words such as "improve," "disrupt," or "enhance" state intent and do not replace visible intervention and change.

Short text can still be fragmented. If readers must hop between many separate snippets to assemble one claim, organize them around a common object or comparison. Keep names and symbols needed for identification; put continuous explanation in the text or a concise caption. Do not create an oversized caption to preserve complete self-containment. Judge focus and reading path, not a mechanical word limit.

When text or code is the research object, keep examples that reveal the transformation. If a matrix is central evidence, retain relevant values. These exceptions do not justify explanatory prose dominating the figure.

After reducing text, ensure a single mark is not ambiguously encoding identity, current state, and processing rule. Preserved identity does not imply unchanged state. A continuous trace may locate an object, a side marker may identify its computation, and a corresponding local view may show its change. For replacement, align old and new sources to the same output interface, distinguishing inactive and active paths; do not imply "compute, then overwrite" if that is false. Distinguish deleting an object from disabling an operation. See the [P2P single-column concept case](cases/p2p-concept.md) for these relationships, not a mandatory trace template.

<a id="基础配色约束"></a>
## Basic color constraints

Aim for coordination and a clear focal point, using adjustable defaults rather than seeking one perfect palette. The current prompt, user palette, and established paper color semantics take priority. Otherwise choose without a separate approval or palette review.

- **Assign roles before colors.** Start with white/near-white, dark gray text, and neutral auxiliary lines. Use one primary hue for important objects and one accent for the key change, selection, or comparison. Begin with two chromatic hues; add more when independent categories require them. Shades of a hue are not new categories, and photographs or real data colors are not subject to this starting count. Record color meanings briefly in the existing brief.
- **Establish area hierarchy.** Keep large containers and supporting regions white, neutral, or very pale. Concentrate stronger colors on content that deserves attention. Do not automatically give every region a different tinted background or make titles, borders, arrows, and objects equally conspicuous. Use area, lightness contrast, and saturation together without fixed area ratios.
- **Moderate saturation without losing clarity.** Start with low-to-medium saturation for subjects and small accent areas. Avoid competing vivid colors and uniformly faint objects with unreadable contours. Text and critical fine lines must remain sufficiently dark.
- **Shade 3D surfaces within one color family.** Derive top, side, and shadow from the object's base hue with consistent lighting. Different face colors are not a substitute for volume. Use gradients for justified volume or continuous data only. Check whether transparent overlaps become muddy or hide selections. Decorative shading must not alter a data colormap's meaning.
- **Use consistent semantics and a second cue.** Preserve an object's color identity across modules. Do not reuse the accent indiscriminately for unrelated categories, risk, and selection. Also encode key differences with shape, position, texture, or a short label; avoid relying only on red/green or tiny hue changes. Do not recolor real images or results merely to match a palette.

At normal whole-figure size, check whether the accent leads to the focus, regions feel coherent, and labels/selections remain clear. Adjust concrete problems without automatically generating palette variants or extra redraw rounds. Different figures may use different palettes.

## When the figure does not fit

Choose actions appropriate to the problem: merge repeated objects and legends; replace repeated whole networks with representative details; remove uninformative containers and thick sides; summarize secondary modules with clear interfaces; move derivations and engineering details outside the main figure.

Retain core innovations, essential branches, and outputs without expanding every module to implementation level. If it still does not fit, use an overview plus a separately referenced detail figure with explicit responsibilities. Splitting must preserve coverage rather than silently remove a core mechanism. Avoid squeezing two complete figures into one small box. Increasing paper height or shrinking all text is not an automatic solution; disclose the tradeoff if placement must change.

## Inspect at the intended placement during design

Show a page fragment with the figure at its target single/double-column proportions, ordinary body-text lines, and caption space. HTML/CSS mm/pt units or an existing page preview are sufficient. Name the template source; mark an unknown template as schematic. Screen zoom and device DPI affect physical display, so this establishes relative page proportions, not guaranteed ruler-accurate print size on screen.

Reviewers first inspect the same page fragment, then zoom into relationships. Record what is unreadable at placement size; zoomed readability does not erase that problem. Briefly ignore explanatory sentences and formulas to locate dependence on text: can one still identify the objects, actions, and destinations? This does not require an entirely label-free figure to explain the whole paper.

This is a design readability check, not a submission-PDF suite or export/format audit. Without the actual template, provide suggested dimensions rather than claiming confirmed compatibility.
