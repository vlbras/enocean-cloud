# AI_USAGE.md

## AI Tool Usage Disclosure

AI tools are allowed in this assessment.

We care about engineering judgment, verification, and ownership of the result — not whether you used AI.

If you used any AI assistant (ChatGPT, Copilot, Claude, etc.), document it here.

If you did not use AI tools, state that explicitly.

---

## Tools Used

- Tool name: ChatGPT
- Version / model (if known): GPT-5.4
- How frequently used: occasional

---

## What AI Was Used For

- Assistance with writing integration tests:
  - `apps/api/src/__tests__/devices-history.integration.test.ts`
  - `apps/api/src/__tests__/device-sensor-aggregate.integration.test.ts`
- Assistance with designing the MongoDB aggregation pipeline for the sensor aggregation endpoint
- Minor review / cleanup suggestions during final polish

---

## Verification Process

- Ran the integration test suite after implementing the changes
- Independently reviewed and adjusted generated tests before using them
- Manually verified the aggregation pipeline logic and expected bucket calculations
- Confirmed correct handling of:
  - numeric-only aggregation
  - empty results
  - invalid query parameters
- Re-ran tests after final refactors and cleanup

---

## Corrections Made to AI Output

- Refined generated test cases to better match project structure and naming
- Adjusted aggregation pipeline details after manual review and validation
- Modified suggested code where necessary to align with repository conventions
