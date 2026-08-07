# docs/

Reference documents for the workspace. Read by humans, not by agents.

Operational documents live elsewhere and are read at build time:
`scaffold/policies/agent-policies.md`, `scaffold/inputs/*`, and each service's
own `docs/prd/` and `docs/wireframes/`.

| Document | What it is |
|---|---|
| `BaseWorkspace_Agent_Policies_Lite` | **Current.** The 22 policies across 3 agents, permissions matrix, Definition of Done, graduation triggers. The `.md` twin of `scaffold/policies/agent-policies.md`. |
| `BaseWorkspace_Structure_Lite` | **Current.** Prerequisites, the services structure, PRD and wireframe minimum shapes, module boundaries, starting a new project. |
| `BaseWorkspace_Agent_Policies_v1` | Reference. The full-scale design — 6 agents, 86 policies, 15-stage pipeline. What to grow into, not what is built. |
| `BaseWorkspace_Structure_v1` | Reference. The full-scale stack-agnostic generator design: two input files, template resolution, `/new-app`. Aspirational. |

Each exists as both `.docx` (for circulation) and `.md` (for reading in-repo).

**Lite is what is built. v1 is where it could go.** The graduation table at the
end of the Lite policy document says which v1 pieces to add and when.
