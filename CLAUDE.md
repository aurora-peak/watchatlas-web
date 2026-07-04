# CLAUDE.md — WatchAtlas

Instructions for Claude Code (and other AI agents) working in this repository.
Part of the **Aurora Peak** organization.

## Project board workflow — required

All work in this repo is tracked on the **WatchAtlas** project board (org: `aurora-peak`). Every change must be reflected there as a proper entry. Do not start uncaptured work.

**Before writing code:**

1. **Find or create a GitHub issue** for the work.
2. **Set the issue type** — one of the org types: `Feature`, `Story`, `Task`, or `Bug`.
3. **Use hierarchy via sub-issues**: `Feature` → `Story` → `Task`. Break large work down and link each task as a sub-issue of its parent Story or Feature.
4. **Add the issue to the WatchAtlas board** and set **Status = Todo**.

**While working:**

5. Move the issue to **In Progress** when you begin.
6. Reference the issue in every commit and PR (e.g., `Fixes #123`) so it links and auto-closes on merge.
7. Move to **In Review** when a PR is open; let the merge move it to **Done** (or set it manually).

**Entry quality:**

- Title: clear and imperative, prefixed where helpful (`feat:`, `fix:`, `ux:`, `bug:`, `a11y:`).
- Body: what and why, acceptance criteria, and a link to the parent Feature/Story.
- Keep sub-issue checklists current so parent progress bars stay accurate.

## Guardrails

- **Never commit secrets.** Use environment variables / the team secret store. Keep real keys out of the repo — `.env.local.example` holds placeholders only.
- **Accessibility:** target WCAG 2.1 AA for anything user-facing.
- **Security:** check changes for common vulnerabilities before opening a PR.
- Match the existing stack and conventions: Next.js 14 (Pages Router), TypeScript, NextUI, Tailwind CSS, Firebase, Zustand.

---
_Add this file to each new Aurora Peak repo so the board discipline stays consistent._
