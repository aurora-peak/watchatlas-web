# Token Log

Tracks token usage at a consolidated, per-task level for later review and process
improvement. One row per logically complete unit of work — not per tool call or
message. See the project's CLAUDE.md for the full convention.

| Date | Task / Feature | Est. Tokens | Context Size (approx) | Cost Drivers | Notes / Improvement Ideas |
|------|-----------------|-------------|------------------------|--------------|----------------------------|
| 2026-08-15 | Preferred streaming services (#3 — stories #13, #14, #15) | ~400k (estimate) | large | Six tasks executed via subagent-dev fan-out, each followed by a code review round. The review rounds were the bulk: Task 4's UI review alone found 1 Critical contrast failure + 6 behavioural findings, and the ServicePicker went through two fix passes. 95 unit tests written alongside the logic | Estimate — no per-task `/cost` readings were taken, so this is reconstructed from session scope. The subagent fan-out was worth it (six independent tasks, no shared state). The two-pass ServicePicker review was not: the first plan had the picker reading *saved* countries while the grid edited *unsaved* state, a design flaw that a sharper spec would have caught before implementation |
| 2026-08-15 | Graphify graph review + PR prep | ~60k (estimate) | medium | Reviewing an already-built graph was cheap (read GRAPH_REPORT.md, ~7KB). The expensive part was the full `main..HEAD` code review over 22 commits / ~1650 lines. One wasted `npm test` run against a missing `node_modules` | Reviewing the *existing* graph instead of rebuilding saved ~280k input tokens — always check `graphify-out/` mtime before running graphify. Check `node_modules` exists before running the test gate |

<!--
How to fill this in:
- Date: when the task wrapped up (not when it started)
- Task / Feature: short label — what was accomplished, not how
- Est. Tokens: best available estimate for the whole task (sum across the session/tool
  calls it took) — pull from the client's usage display or /cost if available
- Context Size: rough sense of how much context was loaded (small / medium / large, or
  a token count) — helps spot when a bloated context is driving cost
- Cost Drivers: THE MOST IMPORTANT COLUMN. A number alone ("20k tokens") isn't
  actionable later — this is what makes a future token-optimization pass possible.
  Note whichever applies:
    * what actually consumed the bulk of it (repeated file reads, long trial-and-error
      loops, a big research/search phase, verbose tool output pulled into context,
      subagent fan-out, debug/test cycles)
    * anything avoidable in hindsight (re-reading the same file instead of caching,
      a search that should've been scoped narrower, more agents than the task needed)
    * anything that was worth the cost, so it doesn't get flagged as waste later
      (thorough test coverage, a necessary multi-file refactor, careful verification)
  Skip this detail for cheap/uneventful tasks — don't pad the row.
- Notes: anything else worth remembering — a prompt pattern that worked well, a
  concrete idea for trimming context next time, a delegation choice to reconsider

When running a token-optimization exercise, read Cost Drivers across entries and group
by *driver*, not by task name — that's where the recurring, fixable patterns show up.

When this file passes ~50 rows, move older rows to TOKEN_LOG_ARCHIVE.md and keep this
file to the current sprint/quarter.
-->
