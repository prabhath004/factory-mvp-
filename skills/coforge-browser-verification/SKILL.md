---
name: coforge-browser-verification
description: Verify Coforge UI changes in a real local browser and capture deterministic evidence without external side effects.
---

# Coforge Browser Verification

Use this skill whenever a mission changes a page, component, interaction, or browser-visible state.

1. Start the repository's app on an available localhost port and record the process you started.
2. Use the configured browser/Playwright control surface to exercise every changed acceptance path at desktop and mobile widths.
3. Check visible output, keyboard operation, console errors, and failed network requests.
4. Add deterministic Playwright assertions for acceptance-critical behavior when the repository has browser tests.
5. Capture screenshots of the changed states. Do not fabricate screenshots or infer success from source code.
6. Stop only the server process you started.
7. Attach the evidence through Factory's `report_stage` PR assessment.
