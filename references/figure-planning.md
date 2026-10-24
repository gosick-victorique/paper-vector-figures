# Mechanism extraction and figure planning

## From the paper's claim to visible evidence

Read the relevant method, equations, and captions until you can explain how the objects change. A compact drawing brief can be one paragraph:

> This figure explains ____. Placement: ____ columns, ____ × ____ mm, main text ____ pt. Readers see the relationship through ____. Main object: ____; essential operation: ____; ordinary process: ____. The figure retains ____; the caption/text/detail figure explains ____. Evidence: ____.

Read [visual-first layout](visual-first-layout.md) before drawing. Establish visible objects and operations before adding short labels. Equations needed to understand the paper are not automatically needed to read the figure. The main figure need not retell the text completely.

Translate "rich, attractive, 3D" into concrete contours, internal operations, corresponding positions, comparison directions, and area hierarchy. If you still have only module names, read the material that would change the drawing.

**The main visual must explain.** Find the relationship that best reveals the paper's distinction and allocate area to it. A complex or large object does not necessarily expose the mechanism. Scene context, local operations, and precise readouts have different roles: [Carrier](cases/carrier.md) uses an object to identify subject/carrier and an independent norm example to explain normalization. If a full table still makes readers calculate every relationship, make the relationship graphical: [IAU-FOA R4](cases/iau-foa.md) uses same-data flow bands for allocation while retaining a matrix for tiny values. Large relationships become clearer, but small values may vanish and reordered entries require ID matching. Do not treat an illustration as a gradient source or exaggerate narrow bands for appearance.

<a id="信息取舍与连线"></a>
## Information selection and connections

Judge overview completeness by paper claims and essential causality. Independently list what readers should be able to explain after viewing it, then choose marks. Do not first inventory every model, loss, and algorithm step and assign each a box. Ordinary steps do not become focal merely because they appear in an algorithm; small supporting mechanisms do not lose their contribution merely because they are small.

State in one sentence what the reader should remember when reading figure and paper together, and designate the first visual focus. Multiple contributions may be peers without making every sub-operation equally prominent. Shared objects, unequal area, and hierarchy establish a reading path. Record the figure/text division in the existing brief, with sections providing omitted detail. Missing implementation detail or inability to reconstruct the entire algorithm from the image alone is not an overview defect.

Use three concise levels of selection, explaining why:

- **Main visual:** Objects, changes, and relationships that best explain the method's distinction; prioritize their area and contrast.
- **Supporting mechanisms:** Their role is necessary but internals can be summarized; connect them back through local objects or short labels.
- **Off-figure details:** Steps, parameters, or ordinary implementations whose omission still permits an accurate account of the claim; leave them to caption, text, or algorithm.

For every candidate component, ask what necessary understanding would disappear if its separate mini-diagram were removed. If none, merge, subordinate, or move it out. If something is lost, retain that relationship, not necessarily the whole container. Fewer elements must not be achieved by omitting core contributions; more elements do not prove sufficient explanation. Complete execution diagrams also distinguish key states from ordinary operations, but must retain execution conditions required by their task.

Use arrows for direction, transfer, or change that readers must trace. Use enclosure for membership, alignment/consistent markers for correspondence, and short leaders for local expansion where these match the relationship. Do not duplicate clear input/output connections with decorative arrows. Omit long buses and whole-figure loops by default. Show ordinary optimization with local loops, matched interfaces, or nearby repetition markers tied to the actual updated object. Keep long cross-region paths only when essential dependencies would otherwise be lost, and record why. Iteration alone is insufficient justification. Reducing arrows must not invent serial ordering, shared inputs, or causality; there is no arbitrary arrow quota.

When execution order is not the key message, prefer peer regions around concrete visual subjects. Shared conditions can use common markers or compact links instead of one long pipeline. Regions may occupy rows, grids, or other non-stage layouts; equal width/area is optional. Peer contributions need not be computationally independent or concurrent. Retain local dependencies for intermediate results even when other regions are peers.

A title, diagram, arrow, and explanatory sentence in every small region can force readers to repeatedly restart. Treat this as fragmentation. Unite related mechanisms through shared objects or comparisons, retaining core expansion while making other details subordinate states/interfaces or moving them into the text. Merely deleting sentences while keeping isolated mini-panels does not solve it; adding links is not a cure for excessive fragmentation.

After drawing, hide small internal text and inspect the whole: does the main visual still reveal the central intervention? If generic updates, frames, or loops dominate contributions, reallocate area and emphasis rather than complete every local detail. There is no universal two-zone, three-column, radial, or before/after template.

<a id="内容密度与组织密度"></a>
## Content density and organizational density

Reduce independent containers, repeated entry points, and scattered annotations before removing explanatory objects and relationships. Establish hierarchy with area, shared subjects, embedded details, and subdued context; do not automatically delete supporting mechanisms. Many elements can form a coherent whole. Large blank regions earn no inherent credit.

A method overview should show both how a response changes and where, through what structure or operation, that change is produced. If only bar-height, angle, or output comparisons remain while intervention sites, selection ranges, model combinations, and domain transitions survive only in text, restore the most useful structural relationships. This need not become a complete algorithm inventory. Expose accessed layers/regions on existing subjects, let one object carry multiple recipients, and trace one local detail through necessary transformations rather than opening more tiny panels.

In the brief, distinguish mechanisms needing expansion, structural context retained compactly, and parameters/derivations left to text. Each major contribution should have a corresponding visual expression; choosing one focal subject should not reduce the others to names or generic effect symbols. Ask not only whether omission misleads but whether retention helps readers locate, connect, or understand the method's distinctive action. Retain and organize structure when explanatory benefit exceeds its footprint.

## Full scope and representative examples

A whole-method overview retains relationships among main mechanisms, necessary training branches, and outputs, expanding representative operations around the innovation. Ordinary modules can keep accurate input/output interfaces without internal detail. Put derivations, secondary parameters, and engineering details in the caption/text. Give additional graphical explanations their own referenced detail figures. Coverage does not require every detail in one image.

For an expanded operation, expose **input → actual operation → returned object** and connect it to the intervention site: scoring to selection, updates to state publication, per-sample operations before aggregation. Branches, fusion, and alternating updates follow the paper, not the easiest straight-line layout. See [SmuDPatch](cases/smudpatch.md), [AdvFractal](cases/advfractal.md), and [AD-SRF](cases/ad-srf.md).

Choose examples that distinguish mechanisms: [PCTree](cases/pctree.md) stops expansion yet remains selected; [ReMoE](cases/remoe.md) compares inside/outside-center points; [APC](cases/apc.md) distinguishes index addition from nearest-neighbor pairing. Illustrative data explains an operation and does not substitute for model results. Name similarly shaped variables according to their different roles.

For quantitative detail, prefer the overview, inset, and readout to share the same object. Independent worked examples are valid when assumptions and their relationship to the scene are clear; do not imply uncomputed mappings. See the [visual entry board](visual-entry.md#先选主视觉的解释任务): ProAda uses context plus a separate geometric example; Illusion of Depth follows one signal; IAU-FOA maps mass to band width. Compare [AR-AWM](cases/ar-awm.md), using the same glyph's pixels, and [Carrier](cases/carrier.md), using an independent norm example.

### Iteration: initialization, current observation, next state

Only expand these details when the figure needs them. A worked step with history is not initialization; identify it as a typical iteration and leave other rules in the text. If both initialization and recurrence are shown, distinguish their rules locally. A historical estimate is not a full remeasurement at every step. When one observation drives several updates, connect shown branches to their actual write targets. Next-step reads may use local loops or matched interfaces without a whole-figure return arrow. [SRIM](cases/srim.md) separates initial r=d from subsequent EMA; observation d feeds a single-slot memory and a shared perturbation, with a front-facing state table distinguishing one-slot change from probability recomputation for all slots.

Choose illustrative cases that separate similar rules. In SRIM, a3 has highest probability while a5 is sampled, directly countering a deterministic ranking interpretation. Use examples permitted by the method rather than invented measurements. Contextual scenes must not crowd out the state changes that require explanation.

### Assess construction and effect explanation separately

When asked both how an output is constructed and why it works, find traceable visual evidence for each. An attractive hand-computable effect example may answer only the latter. In [GCD's first review](cases/gcd.md), all four reviewers understood that preserving the class could still reverse the search decision, but could not reconstruct the surrogate score from the top region. A good example below does not excuse module names and formulas above.

Find missing transitions: which candidate quantity passes through which mapping, becomes which compared objective quantity, and returns what? Clarify operations in input, feature, logit, or probability space where they occur; identify approximations at their actual point of use. Expand essential mappings and redistribute area as needed, without requiring a matrix formula or second pipeline in every figure. Do not draw a generation arrow from an independent explanatory example to method output without a computational relationship.

GCD R2 improved mean explanation scores from 75 to 86.75 after exposing those transitions, at the cost of more top-region space and formulas; directional interpretation still required inference. Mechanism coverage and readability are different changes and need separate evidence. This score increase does not justify formula-dense layouts universally. R3's two-row arrows still did not fully explain the objective's motivation. Preserve roles and purposes when replacing a representation: showing how a mapping works does not necessarily show why it is chosen. More marks do not establish completeness.

Where the paper is locally ambiguous, separate unknown rules from relationships that are still clear. [P2P](cases/p2p.md) does not invent a stopping algorithm, but does show correspondence among candidate boundaries, prefixes/suffixes, and the final union. All four reviewers identified the missing construction link in the initial drawing. Ambiguity in one rule does not excuse omitting known operations elsewhere.

## Composition decisions

For original-paper hierarchy, consult [hierarchy references](hierarchy-references.md): P2P illustrates stage handoffs, StepPrune exposes internals, and Elastic compares multiple budgets on a shared object. They serve different reading tasks rather than one combined template; the paper text supplies construction details omitted in their figures.

For a new figure, compare two valid organizations. State what each preserves, what each makes easy to read, and its cost, then proceed. Two completed drawings and prior approval are unnecessary. Local feedback should retain accepted structure. Rejecting an incorrect mechanism is not composition comparison.

Place actions on objects before choosing containers:

| Reader's question | Possible organization | Cases |
|---|---|---|
| How parts construct or alter an object | Dominant object, nearby parameters/local changes | [SmuDPatch](cases/smudpatch.md), [AdvFractal](cases/advfractal.md) |
| How one quantity acts on several recipients | One shared quantity connected to actual recipient operations | [FeatureFool](cases/featurefool.md), [APC](cases/apc.md) |
| What geometry or similarity means | Spatial object plus front-facing values from the same example | [SLASH](cases/slash.md), [PA-Attack](cases/pa-attack.md) |
| How a shared state is read/written | Common object with operations near target fields | [RaG-Tree](cases/ragtree.md) |
| How stages or indices differ | Stable roles in rows/columns; states compared along another axis | [NORP](cases/norp.md), [AD²](cases/ad2.md), [View Swap R4](cases/view-swap.md) |

In the last organization, a layout is not automatically a model matrix. For copying/replacement, distinguish source identity, interface role, and supervision ownership; labels need not move with contents. Combine organizations when appropriate. Match actual operations before borrowing layouts: a fixed input, shared perturbation, and fixed weights have different recipients. "Shared" or a common research field is insufficient grounds to reuse a figure. See [visual entry](visual-entry.md), [adversarial mechanisms](adversarial-entry.md), then the relevant [design variants](design-guide.md). No mandatory three columns, equal modules, or bottom pipeline.

When equal-weight explanation regions still dominate, organize around shared objects/variables. [Tetris3D](cases/tetris3d.md) locates then expands the same object; [Illusion of Depth R4](cases/illusion-depth.md) uses selected disparity as an explicit readout between pixel costs and geometry, separating computational edges from geometric leaders. The former must distinguish auxiliary contours from real inputs; the latter narrows full curves. These choices are not universal three-column layouts. Compare [overview/expansion references](reference-atlas.md#待迁移的提示从同等分区转向总览与展开).

## Put explanation back on objects

| Symptom | Try first | Preserve or disclose |
|---|---|---|
| Large scene, innovation still textual | Put operations next to their actual subjects; bring input, interface, and output together before enlarging | Traceable main path; [RILA](cases/rila.md) groups controller, carrier, camera, and two frames, matching training parameters separately by identity |
| Detail exists but is unreadable | Reallocate the fixed paper footprint, remove repetition, combine a locator with same-source detail; split out a detail figure if needed | Identity, sampling, observation direction, display versus computation scope; [MROP R4](cases/mrop.md) crops a view, not the loss; [TARA](cases/tara.md) preserves observation geometry |
| Repeated text/containers consume space | Share context; let an object view also carry a mapping table; share a frame for repeated operations | Preserve input identities, independent paths, and outputs; [WebMirage R4](cases/webmirage.md) gains integrated mapping but loses vertical table scanning; a shared frame does not merge separate calls into one input |
| Dense relationships obscure the focus | Subdue context and expand a justified operation with consistent IDs | Subduing is not filtering, confidence, or numeric opacity; background legibility may decrease, as in [Response Profiles](cases/response-profile.md) |
| Formula stacks obscure sources | Draw selection, allocation, and merging at their intervention sites; retain short relations only when useful | Weight provenance and actual reduction; [SAWR](cases/sawr.md) and [CamoShift](cases/camoshift.md) inform object grouping, not a universal formula density |
| Spatial directions coincide or transparency becomes muddy | Separate critical endpoints/boundaries, remove uninformative interior faces, keep front-facing readouts | Do not modify data to improve the camera or appearance; see [mixed visual grammar](content-to-3d.md) |

Use short labels for identity, action, and conditions that change interpretation; retain necessary readouts. Put generation settings, provenance, and long derivations in the caption. Compactness comes from sharing and alignment, not uniform font reduction. Contours and parts provide recognition; line weight, color, and whitespace establish hierarchy. Avoid equally prominent frames partitioning everything into peer cards.

A display camera can change; a real observation camera is part of the data. Adjust the former to separate near-collinear directions. Preserve the latter's perspective and occlusion when enlarging, and identify any separate front-facing explanatory view. Use [mixed visual grammar](content-to-3d.md) for depth meaning, transparent voxels, and shallow exploded layers.

<a id="比较时保留什么"></a>
## What comparisons must preserve

| Change | State explicitly | Explain the tradeoff |
|---|---|---|
| Layout/display camera | Whether objects, data, and mechanism remain the same | Occlusion, correspondence, and readout changes |
| Shape/expanded content | Added/omitted content and any recomputation | Suitability for overview versus detail |
| Method parameters | Fixed input and other settings | How parameters change the object |

A new view, different source glyph, or redrawn/recomputed scene is not a pure layout comparison with fixed content. Smaller canvases and fewer words do not automatically demonstrate faster reading.

## Reusable prompt passages

### Initial figure

> Understand the method. In a short brief, define the central claim readers should remember with the paper, the first visual focus, figure/text responsibilities, target dimensions, and final text size. Compare two valid organizations, expanding only relationships that support the core explanation. Show transformations and correspondence first, then add short labels and readouts. Leave unnecessary steps and continuous explanation to the text. Merge or omit local sketches rather than make every module a region. Borrow applicable relationships from references, inspect at paper-layout proportions, and review independently with the source text. Do not run export checks.

### Too simple

> Distinguish a missing mechanism, weak recognition, and weak hierarchy. Expand central module names into visible operations; add recognizable contours/parts to generic subjects; redistribute area, line weight, and contrast among equal-weight modules. Enlarge the critical detail within the established footprint, remove repetition, or create a separate detail figure instead of automatically enlarging the whole figure. Added detail must explain a relationship. Recompute dependent data and disclose changes if source content changes.

### Too cluttered or too much text

> Check whether equally prominent details and short snippets fragment the focus. Decide what to merge, subordinate, or leave to the paper. Move long explanations and derivations out; use matched object states, alignment, selection, and convergence for the core explanation, with necessary short labels. Share repeated context, place operations by dependency, and retain conditions/outputs that prevent misreading. If the core remains unreadable at target size, reorganize overview and separate detail. Do not merely delete words while keeping isolated mini-diagrams, shrink all text, pile on abbreviations, or enlarge the canvas alone.

### Not enough 3D or overly heavy 3D

> Choose the relationship depth should explain before changing models or cameras. Use assembly for physical ordering, shallow explosion for index groups, and low-dimensional vector geometry when justified by the operator. Transparency reveals interiors; occlusion and silhouettes distinguish layers. Separate critical directions with the display camera. Keep metrics front-facing and data colors semantically intact. Consult the mixed visual grammar.
