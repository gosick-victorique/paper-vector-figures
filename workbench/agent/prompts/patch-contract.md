# Element operation contract

Return only the specified JSON. Copy `TASK.baseRevision` unchanged into `baseRevision`. Use `summary` for actual changes, `warnings` for unresolved issues, and `operations` for element operations. Write user-facing fields in the user's language, defaulting to Chinese when unspecified. When evidence is insufficient or the request cannot be completed within the boundaries, return an empty `operations` array and explain. Do not write code to modify files.

## Application-enforced scope

- `scope` is the only editable region. Keep all locked objects (including objects with locked ancestors or descendants), unselected objects, and bound `connection` nodes unchanged.
- `editMode=appearance`: only update selected `leaf.appearance={fill,stroke,textColor,strokeWidth,opacity}`. Colors are six-digit hexadecimal values or `none`, stroke width is 0–20, and opacity is 0–1. No geometry, text, markup, insertions, or removals.
- `editMode=layout`: only update `x/y/scale`. Scale is positive and uniform; content stays unchanged.
- `editMode=redraw`: necessary redraws are allowed within the selection, but the resulting graphics of each selection root must remain within its original bounds.
- `editMode=generate`: generate from the full canvas while preserving locked objects, comments, and existing connection constraints.
- The default `legacy` mode supports older tasks. Selection boundaries and minimal-change principles still apply; it is not permission for unrestricted redrawing.
- With `preserveLabels=true`, do not remove or rewrite standalone `kind=text` leaves; moving them is allowed only when the mode permits. Also preserve text inside mixed SVG nodes. Do not use mixed nodes to evade label protection.
- A `connection` represents bound interfaces between modules. Do not directly modify, remove, or create bound connections. The application updates existing connections after modules move.

## Operation structure

- `update`: the ID must exist. `payload` is a JSON string containing only needed fields from `x,y,w,h,scale,originX,originY,name,markup,textOverride,appearance`. Do not change `parent/id/type/locked`. Only leaves may have markup.
- `insert`: new IDs start with `ai-`. The payload is a complete leaf: `{id,parent,type:'leaf',kind,name,x,y,w,h,originX,originY,scale:1,locked:false,markup}`. Its parent must be a container within the scope or one created earlier in this response within that scope.
- Only `generate` permits new components: `{id,parent,type:'component',kind,name,x,y,w,h,scale:1,locked:false}`, without markup. Create containers before children. During editing, redraw components by editing or inserting leaves inside existing containers.
- Generation strictly follows three levels: existing `section` → `component` → `leaf`. A component's parent must be an existing section ID; a leaf's parent must be a component ID. Do not nest components inside components or put leaves directly under sections. Represent a large visual region with a separate background component, with its modules as sibling components under the same section. Their coordinates are relative to the section, not the background component.
- `remove`: use `payload='{}'`. Do not remove selection roots or objects with comments or locks.

`x/y` are parent-local coordinates; `originX/originY` identify the original SVG coordinate origin. Rendering subtracts the origin, applies scale, and translates to x/y. All geometry values must be finite; w/h must be nonnegative and scale positive. Update bounds accurately when changing geometry.

Use static SVG only. No scripts, `foreignObject`, external links, or CSS files. Inline shape and text attributes. Preserve existing embedded images; do not fabricate bitmap data. Resource IDs inside markup must start with the owning leaf ID followed by `--`; update `url(#...)` references accordingly to avoid collisions. Keep distinct objects and editable text separate where practical.
