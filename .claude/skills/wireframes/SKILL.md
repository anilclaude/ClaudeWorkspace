---
name: wireframes
description: Generate the AC-annotated wireframe PNGs and index.md that this scaffold's PRD convention requires, under platform/docs/wireframes/<feature>/. Use whenever a PRD in _ACTIVE/ needs wireframes before /plan can run, or when adding/editing a screen for an existing feature.
---

# Wireframes

Produces exactly what `platform/docs/wireframes/README.md` requires: one folder per feature, PNG exports (not just a design-tool link — Claude reads images, not links), and an `index.md` mapping each screen file to the PRD's AC numbers. **Read that README first** — it's the convention; this skill is the tool that satisfies it.

The output isn't a polished mockup. It's a low-fidelity screen with a visible right-hand gutter listing which ACs that exact screen state proves — that binding is the entire point. A pretty wireframe with no AC gutter doesn't satisfy P2 (`planner.md`) or B7 (`builder.md`).

A working example already exists at `platform/docs/wireframes/login/` — look at it before starting if anything below is unclear.

## First-time setup

```bash
cd .claude/skills/wireframes && npm install
```

## Workflow

**1. Read the PRD.** Pull its numbered ACs from `platform/docs/prd/_ACTIVE/<feature>.md`. Every AC that describes something visible needs to show up in some screen's gutter. An AC with no screen showing it is a gap — note it under "States not drawn" in `index.md` rather than silently dropping it.

**2. List the screens/states needed.** Almost every feature needs at minimum: a default state, an error/validation state, and a loading state if it submits anything. Features with lists or dashboards (an order queue, a table-status grid, a low-stock list) also need an empty state — "no orders yet," "no tables configured" — which is the state people forget to design and the one B7 explicitly requires.

**3. Write one small generator script per feature** (not per screen — one script, multiple `render()` calls) at a scratch location, requiring the shared toolkit:

```js
const kit = require('<path to>/.claude/skills/wireframes/scripts/kit.js');
const OUT = 'platform/docs/wireframes/<feature>';

kit.frame('app.example.com/<path>', 'DEFAULT');
// ...draw the screen using kit.card/heading/field/button/listRow/badge/banner...
kit.notes([
  ['AC1', 'Full text of the criterion this state demonstrates.'],
  ['AC4', 'Another one, if this state covers more than one AC.'],
]);
kit.render(OUT, '<feature>-default.png');

kit.frame('app.example.com/<path>', 'ERROR');
// ...
kit.render(OUT, '<feature>-error.png');
```

`kit.js` (`scripts/kit.js`, next to this file) exports:

| Function | Draws |
|---|---|
| `frame(urlPath, stateLabel)` | Browser chrome + the AC gutter shell. Call first, once per screen. |
| `notes(items)` | The gutter's AC list — `[['AC3', 'criterion text'], ...]`. Call after drawing the screen. |
| `card`, `heading`, `footer`, `logo` | Generic form-card scaffolding |
| `field`, `button`, `banner` | Inputs, buttons (primary/secondary, disabled, loading spinner), status/error banners |
| `badge` | Small status pill — table status, order status, stock level (`kind`: ok / warn / err / info / neutral) |
| `listRow` | One row of a list or table, with zebra striping |
| `sectionLabel` | Small uppercase section heading |
| `render(outDir, filename)` | Writes the accumulated screen to `<outDir>/<filename>.png` |

These are generic — the same primitives draw a login form, a menu list, a kitchen order queue, or a table-status grid. Don't add feature-specific helpers to `kit.js` itself; compose the generic primitives in your per-feature script instead. If a genuinely new *kind* of primitive is needed (not just a new layout), add it to `kit.js` so the next feature benefits too.

**4. Run it, then look at what it drew.**

```bash
node <your-script>.js
```

**Render & Validate is mandatory, not optional.** Use the Read tool on every PNG produced. You cannot judge layout, overlap, or whether text got clipped from the SVG source alone. Check:
- Nothing overlaps or runs outside the app viewport (`kit.APPW` wide)
- Every AC cited in `notes()` actually corresponds to something visible in the screen
- The gutter text isn't truncated or overlapping the next AC's entry

Fix and re-render until it's right — this is normally 1–2 passes, not a one-shot.

**5. Write `index.md`** in the same folder, following the exact template in `platform/docs/wireframes/README.md`: the screen table (Screen / File / Implements / States shown), Responsive intent, and States not drawn. Don't skip "States not drawn" — an empty or loading state that isn't wireframed still needs to be *named* there, or the builder has no way to know it was considered rather than missed.

**6. Check the naming.** The folder must match the PRD's filename exactly (`platform/docs/wireframes/README.md`'s rule) — this is the only thing binding the wireframe to its PRD. Get it wrong and P2/B7 silently stop working.

## Design conventions

- **Low-fidelity, not a mockup.** Boxes, labels, real copy for button text and error messages — not gradients, shadows, or icon libraries. The gutter is the point, not the visual polish.
- **State labels are UPPERCASE** in the chip (`DEFAULT`, `ERROR`, `LOADING`, `EMPTY`) — scan-ability across a folder of screens matters more than elegance.
- **Every screen cites at least one AC.** A screen with an empty `notes()` call is decoration, not a wireframe this scaffold's agents can use.
- **Reuse `badge()` for anything with a status enum** — table status, order status, payment status — rather than inventing a one-off shape per feature.
