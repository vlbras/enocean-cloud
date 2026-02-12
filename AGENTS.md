# AGENTS.md — Guidance for Coding Assistants (LLMs)

This repository is a brownfield technical assessment with an intentionally failing test suite at baseline.
Your goal is to help implement a minimal, safe fix and any requested feature work, while preserving or strengthening the tests that prove the original bug.

## Ground rules
- Keep diffs small and focused.
- Preserve repository structure and existing patterns.
- Do not “solve” problems by disabling concurrency, buffering, or tests.
- Prefer correctness, determinism, and testability over cleverness.

## AI-generated code summary requirement
When you generate or significantly modify code using an AI assistant, you MUST log a short summary of what changed.

Create (or update) this file:
- `AI_CODE_SUMMARY.md`

For each AI-assisted change, append an entry with:
- Date/time
- Files changed
- What was generated/changed (1–3 bullets)
- Why it was changed (1–3 bullets)
- How it was verified (tests run, checks)
