# Changelog

A dated trail of change requests — what was asked, and what changed as a result. One file per entry, not one growing log, so it scales the way `DECISIONS.md` and `build-trace.md` don't.

## Scope

Only prompts that led to a real change (code, config, docs, scaffold policy) get an entry. Pure questions/discussion with no resulting change stay in the conversation, not here — this is a change log, not a full transcript.

## Relationship to the other logs

| Log | Scope |
|---|---|
| `changelog/` (this folder) | What was asked, and what changed — one dated file per change request |
| `scaffold/memory/DECISIONS.md` | HOLD/PROCEED decisions an agent couldn't resolve from spec alone |
| `platform/docs/build-trace.md` | Build/review timing and token cost for `/build` task loops |

An entry here should link to a `DECISIONS.md` row if the change involved a judgment call, and to a commit hash if it was committed — this is the index a human reads to find "what did I ask for and when," not a replacement for those logs.

## Entry format

Filename: `YYYY-MM-DD-short-slug.md`

```
# <date> — <short title>

**Prompt:** <what was actually asked, lightly trimmed for length, not paraphrased into something it didn't say>

## What changed
- <files/behavior touched>

## Why
- <context — the problem, the request, the reasoning>

## Related
- DECISIONS.md: <date of matching row, if any>
- Commit: <hash, if committed>
```
