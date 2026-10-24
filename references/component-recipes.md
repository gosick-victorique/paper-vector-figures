# Component representation knowledge

Use this mechanism-to-graphics reference for both representations and visual meanings that require verification. Read only entries needed by the figure; do not load or instantiate the whole library. See [framework prompts](framework-prompts.md) for overall organization and [mixed visual grammar](content-to-3d.md) for spatial semantics.

For each selected component, briefly record `paper object and role / inputs, outputs, or correspondence / depth meaning / representation` in the existing brief. Do not turn unspecified dimensions, layer counts, coordinates, or values into paper facts using general knowledge. When size is nonquantitative, simplify it and explain that in the caption. Substitute the placeholders in local prompts before incorporating them into a figure prompt; these instructions are not text to print inside the figure.

## Index

| ID | Component | Main concern |
|---|---|---|
| C1 | Images, samples, state comparisons | Real objects, consistent identity, evidence of effects |
| C2 | Tensors, feature maps, tokens | Dimension semantics, layer correspondence, local access |
| C3 | Networks, encoder/decoder, model sets | Intervention sites, skips, sharing, freezing |
| C4 | Attention and association matrices | Queries, keys, selection, statistics |
| C5 | Masks, filtering, local interventions | Selection rule, selected region, changed location |
| C6 | Fusion, concatenation, routing | How sources form an output |
| C7 | Multiple scales and pyramids | Scale and processed-object correspondence |
| C8 | Features, distances, constraints | Geometry justified by the objective |
| C9 | Voxels, point clouds, multiple views | Occupancy, correspondence, interiors |
| C10 | Representation transforms and reconstruction | Domains, indices, visible transitions |
| C11 | Gradients, perturbations, iterative updates | Updated object, scope, state |
| C12 | Memory, retrieval, graph structures | Addresses, content, edges, reads/writes |

## C1 Images, samples, and state comparisons

- **Verify:** Whether original and processed views show the same sample; whether images come from the paper, data, actual computation, or illustrative material; whether the depicted method actually produced the difference.
- **Compare:** Front-facing matched crops with a shared enlarged detail; an image plane paired with corresponding mask/feature planes; real examples next to a schematic subject. Usually keep image content front-facing, tilting a support plane only when it clarifies correspondence.
- **Retain:** Identity, conditions, and matching local positions. Imperceptible perturbations may have a separate amplified view, but that view must not be presented as the actual output.
- **Avoid:** Using different people to imply changed identity, presenting invented heatmaps as model responses, or connecting a contextual photo to an uncomputed feature output. See [materials](material-and-representation.md).
- **Local prompt:** "Juxtapose [two states of the same sample] with matched crops and scale. Expand the difference at [the same position], identifying the views as [actual results / explanatory schematics]."

## C2 Tensors, feature maps, and tokens

- **Verify:** Whether axes represent spatial dimensions, channels, sequence, heads, or batch. Equal shape does not imply equal content. Without known dimensions, show schematic layers without invented sizes.
- **Compare:** Exploded aligned channel planes; an accessed slice pulled from a volume; a sequence or patch grid paired with embedding strips. Do not force tokens back into pixel locations after spatial organization has been lost.
- **Retain:** Relevant axes, accessed locations, and input/output correspondence. Representative layers can imply a larger collection without making every layer countable.
- **Avoid:** Labeling every tensor H×W×C, confusing network layers/channels/time as thickness, or claiming random textures are measured activations.
- **Local prompt:** "Represent [tensor] through [exploded channels / a local section / sequence strips]. Highlight [accessed dimension or position], summarize other layers, and make [input/output] correspondence traceable."

## C3 Networks, encoder/decoder structures, and model sets

- **Verify:** Backbone structure, intervention layer, actual skip connections, parameter sharing, and precisely what is frozen. Do not infer detailed UNet wiring from its name alone.
- **Compare:** Encoder/decoder volumes with actual resolution changes; a target layer extracted from a subdued network outline; different model responses around a shared input. If only one layer matters, use the rest as locating context.
- **Retain:** Intervention sites, necessary skips/outputs, and shared versus distinct model identities. One common source or identity marker can communicate shared parameters without duplicating entire weight diagrams.
- **Avoid:** A lock implying every gradient is blocked, a serial ensemble, parallel networks implying shared weights, or an arbitrary hourglass substituted for the architecture.
- **Local prompt:** "Use a simplified [backbone] to locate [target layer], expanding its operation nearby. Distinguish models using [shared markers / separate identities] and retain connections needed to explain the intervention."

## C4 Attention and association matrices

- **Verify:** Self- versus cross-attention, query/key sources, both matrix axes, the reduction axis of statistics, and any specified normalization axis.
- **Compare:** Query/key source planes with a front-facing association matrix; one query's token weights pulled out; a statistic on the query grid paired with weights for the same query. Depth can locate sources; dense matrices should remain front-facing.
- **Retain:** A consistent query marker on the source, matrix row, and expanded strip; distinguish reduced statistics from the full weight matrix.
- **Avoid:** Showing per-query variance as a query×key matrix, conflating attention with feature similarity or measured responses, or relying on color alone for query identity.
- **Local prompt:** "Mark one query from [query source] and connect it to weights over [keys/tokens]. Show [statistic map] as a separate statistical view with the same query identity, keeping matrix axes explicit."

## C5 Masks, filtering, and local interventions

- **Verify:** How the mask is generated, its scope, whether it is fixed, what happens to selected/unselected items, and whether it represents input access, loss support, or update scope.
- **Compare:** A translucent mask on the same object; raised selected cells with a nearby change; a cutaway exposing an internal selection. Depth can separate selection and content layers without hiding boundaries.
- **Retain:** The same selection before and after, a clear selected/unselected distinction, and a concise generation rule when it is central.
- **Avoid:** An arbitrary rectangle presented as edge detection, changes outside the mask, or extending one operation's mask to every loss.
- **Local prompt:** "Reveal [selection] on [object] according to [criterion], showing [operation] only there. Preserve correspondence in unselected regions and use the same local area to connect before/after states."

## C6 Fusion, concatenation, and routing

- **Verify:** Sum, weighted sum, concatenation, attention aggregation, or single-route selection; the concatenation axis and source of weights/routing decisions.
- **Compare:** Concatenation along the actual axis with source boundaries retained; source facets converging on one aggregate; selected paths exposed in a layered network. Output structure should reveal the operation, rather than multiple arrows pointing to a box labeled "Fusion."
- **Retain:** Source identities, operation type, and output shape/composition changes. If needed, put weight readouts on a front-facing strip; spatial distance should not encode weight.
- **Avoid:** Drawing concatenation as addition, channel concatenation as more tokens, highlighting all paths while claiming single-route selection, or omitting the source of weights.
- **Local prompt:** "Keep [source identities] traceable inside [combined output]. Expose the operation through [concatenation boundaries / weighted aggregation / selected paths], keeping ordinary links near the merge site."

## C7 Multiple scales and pyramids

- **Verify:** Whether scale changes input images, feature resolution, receptive fields, or model size; whether scales are processed independently or fused; where selection or supervision acts.
- **Compare:** Center-aligned multiresolution planes; nested sampling grids on one scene; active scales extracted next to a backbone. Mark cross-scale locations only where genuine correspondence exists.
- **Retain:** Scale ordering, selected/fused levels, and the receiving object. Summarize large layer counts without losing critical cross-scale relationships.
- **Avoid:** Perspective distance substituting for resolution, multiple-scale input mistaken for different networks, or highlighting scales that do not participate.
- **Local prompt:** "Use [aligned planes / nested grids] for [the actual scaled object]. Emphasize [participating scales] and [intervention site], with compact context for the rest."

## C8 Features, distances, and constraints

- **Verify:** Cosine, inner product, L1/L2, distribution discrepancy, or another measure; normalization; and whether constraints act on inputs or features.
- **Compare:** Common-origin vectors with front-facing angular readouts when angles are justified; coordinate-difference strips or displacements paired with their norm; constraint sets/sections with candidate points. A conceptual projection of high-dimensional features is not a measured 3D embedding.
- **Retain:** Compared objects, meaning of direction/distance, and original/modified identities. Name the projection method for actual projections; do not attach fabricated measurements to a schematic.
- **Avoid:** Turning every loss into an angle, inventing manifolds/descent trajectories, representing every norm bound as a Euclidean sphere, or equating feature distance with pixel difference.
- **Local prompt:** "Choose [vectors / difference strips / constraint sections] from [the actual metric]. Show [closer / farther / change within the constraint] using two states of the same object, keeping precise readouts front-facing."

## C9 Voxels, point clouds, and multiple views

- **Verify:** Occupancy, density, feature volumes, or sampled points; known coordinates, observations, and geometry; whether opacity encodes data.
- **Compare:** Emphasized voxels and cross-sections in a transparent volume; an extracted local block with global location; point clouds and observation planes in shared coordinates. Cutting away occluders can be clearer than increasing transparency. See [transparent voxels](design-guide.md#透明体素).
- **Retain:** Local/global correspondence, valid surfaces versus empty space, and participating observations. If transparency only exposes interiors, do not make it resemble a confidence legend.
- **Avoid:** Replacing an arbitrary sparse cloud with a solid regular cube, inventing physical coordinates, overwhelming the subject with sight lines, or using voxels as decoration.
- **Local prompt:** "Locate [important internal region] within [the overall spatial object]. Reveal it through [a cross-section / extracted block / transparent shell], preserving its actual correspondence to [observations or operations]."

## C10 Representation transforms and reconstruction

- **Verify:** Transform type, global/blockwise scope, channel handling, coefficient ordering, retained range, and inverse transform. DCT, FFT, and learned encodings cannot share an unexplained frequency layout.
- **Compare:** Compact adjacent source, transformed, and reconstructed planes; a pulled-out source block revealing coefficient selection; a transform-layer section with a front-facing coefficient grid. Display displacement indicates a domain change, not physical motion.
- **Retain:** Same source block/channel, domain names, retained/suppressed ranges, and receiving output. Use same-source computations for specific numerical changes; identify independent worked examples separately.
- **Avoid:** Calling arbitrary cells low frequency, assuming every spectrum has low frequencies at the center, reusing unfiltered output after depicting filtering, or linking different data as one computation.
- **Local prompt:** "Trace [the same block/channel] from [source domain] into [transform domain], reveal [the actual retained range], and return to [output domain]. Distinguish representations using texture and indices while preserving provenance."

## C11 Gradients, perturbations, and iterative updates

- **Verify:** Whether inputs, parameters, or states are optimized; how objectives combine; gradients versus forward outputs; and the actual order of constraints, smoothing, projection, and update.
- **Compare:** A local increment and next state beside the current state; one step within an allowed region; objectives connected briefly to one shared perturbation. Expand multi-step trajectories only when the paper studies them.
- **Retain:** The updated object, major constraints, and necessary operation order. Mark repetition when depicting one typical step; initialization is not recurrence.
- **Avoid:** A whole-figure loop without a visible write target, objectives attached to unrelated variables, frozen-parameter symbols blocking valid input gradients, or a lone plus sign standing in for complete optimization.
- **Local prompt:** "Near [updated object], show [current state → essential processing → next state], retaining [actual constraints]. Bring objectives into the true update interface through short links; indicate repetition locally."

## C12 Memory, retrieval, and graph structures

- **Verify:** Addresses versus contents, read/write targets, retrieval criteria, selection rules, edge semantics, and whether spatial coordinates or ordered levels are real.
- **Compare:** Indexed slots with extracted content; a hierarchical index and selected path; an expanded neighborhood around a shared node; the same slot before/after a write.
- **Retain:** Consistent IDs through query, selection, and return; changed fields versus unchanged contents; actual graph edges distinguished from explanatory leader lines.
- **Avoid:** Assuming the highest score must be selected when selection is sampled, display proximity implying semantic similarity, changing addresses when contents change, or regenerating an entire memory bank on every read.
- **Local prompt:** "Use [index/shared structure] as the main subject. Trace [a representative item's query, selection, read, or write], expanding its contents and actual neighbors locally while preserving IDs and target fields."

## Combine through shared interfaces, not icon accumulation

For "select then fuse multiscale features," C7 establishes scale identities, C5 reveals selection, and C6 reveals fusion on the same feature objects. Three complete panels are unnecessary. Change representation only when actual input/output relationships require it; matching layout or color alone does not prove common provenance.

These candidates begin exploration; they neither replace spatial comparison nor require trying every entry. Extract a new mechanism from the paper before adding a recipe. Capture transferable object relationships and semantic risks, not one previous drawing's colors, dimensions, or fixed composition.
