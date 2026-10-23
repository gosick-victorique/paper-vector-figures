# Foundational SVG assets

78 assets in nine categories. `foundation-library.js` is the source of geometry and catalog metadata; `manifest.json` records every asset's identity, intended use, preferred insertion bounds and semantic type.

Use this layer for reusable objects and visual grammar. Use paper-derived components when the specific relationship between several objects is the content being explained. A new color or line style is a parameter, not an additional catalog entry.

The main editor's **基础要素库** button opens the filtered template dialog. Choose an asset, adjust its parameters, then insert or replace a single component. Insert width and height are maximum bounds: aspect ratio is retained. Replacement uses the selected component's bounds and preserves the existing protections for annotated or locked children. Decomposed leaves can be independently selected, moved, locked, annotated and—where they are text—edited.

Line width is specified in the SVG's design coordinates and scales with insertion. Fill opacity controls surface areas; solid symbols, endpoints and illustrative legend marks retain their visibility. Control values and asset IDs are preserved in task metadata. No automatic endpoint attachment, graph routing, data plotting or post-insertion node-handle editing is implemented.

`node review-foundations.cjs` regenerates the SVG assets and design review sheets. `node foundation.test.cjs` checks catalog separation, searching, parameters and insertion contracts. The existing `node model.test.cjs` covers selection, comments, locks and other shared editing behavior. These checks do not simulate browser interaction.
