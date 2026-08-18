# Wireframes

One folder per feature, **named to match its PRD file**. This naming is the only
thing connecting a screen to its acceptance criteria — get it wrong and P2/B7
can't be enforced.

```
docs/wireframes/
└── login/                    ← matches docs/prd/_ACTIVE/login.md
    ├── index.md              ← the screen → AC map (required)
    ├── login-default.png
    ├── login-error.png
    └── login-loading.png
```

## Why PNG and not just a Figma link

Claude reads images directly. A link alone isn't readable at build time, so
export the frames into the repo. Keep the link too, as the source of truth for
future edits — but the export is what gets built from.

## `index.md` format — required in every folder

```markdown
# Login — wireframes

Source: <link to the design file>
Status: Active          # Active | Shipped

| Screen | File | Implements | States shown |
|---|---|---|---|
| Login form | login-default.png | AC1, AC2 | default |
| Validation errors | login-error.png | AC3 | error |
| Submitting | login-loading.png | AC4 | loading |

## Responsive intent
Mobile-first. Breakpoint at 768px; sidebar collapses to a drawer below it.

## States not drawn
Empty state: N/A for this screen.
Session-expired: show a toast and redirect to /login — not wireframed.
```

## The part that's usually missing

Wireframes almost always show the happy path only. **State the loading, empty,
and error behaviour** — in the table if drawn, in "States not drawn" if not.

If none of them are stated, the builder implements a happy-path screen and you
get three missing states per screen, discovered in review or later by a user.
