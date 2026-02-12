# AI_USAGE.md

## AI Tool Usage Disclosure

AI tools are allowed in this assessment.

We care about engineering judgment, verification, and ownership of the result — not whether you used AI.

If you used any AI assistant (ChatGPT, Copilot, Claude, etc.), document it here.

If you did not use AI tools, state that explicitly.

---

## Tools Used

List all AI tools used:

- Tool name:
- Version / model (if known):
- How frequently used: (rare / occasional / heavy)

Example:

- ChatGPT (GPT-5.x), occasional
- GitHub Copilot, heavy

---

## What AI Was Used For

Describe what the AI helped with:

- Code generation
- Refactoring
- Debugging ideas
- Test scaffolding
- Documentation
- Architecture reasoning
- Other

Be specific.

Example:

- Generated initial mutex pattern for buffer locking
- Suggested Mongo atomic update strategy
- Drafted integration test structure

---

## Verification Process

Explain how you verified AI-generated output:

- Tests written or updated
- Manual reasoning
- Logs / debugging
- Code review
- Stress testing
- Reruns for determinism

Example:

- Wrote failing test before fix
- Verified deterministic behavior over 20 runs
- Reviewed concurrency logic manually
- Confirmed no event loss in history

---

## Corrections Made to AI Output

If AI produced incorrect or unsafe suggestions:

- What was wrong?
- How did you fix it?

Example:

- AI suggested global lock — rejected because it removed concurrency
- Replaced with per-device async lock

If none: