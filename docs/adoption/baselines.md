# Adoption baselines

Metric baselines for the eligible projects (PRD section 14, MET-01; task P0-09). A baseline is a before-and-after measure, so it needs an existing UI to measure.

## Switchback

**Baseline: not applicable.** Switchback is a new project in development with 7 placeholder components that Credo's components will replace. There is no production UI, no duplicated shared component and nothing to migrate, so there is no "before" to record (see `docs/adoption/eligible-projects.md`).

Measure these after adoption instead:

- Time to a first Credo screen: elapsed time from `install` to a themed, rendered Credo component in Switchback (the PRD time-to-integrate indicator).
- Components copied or duplicated: the number of local components that copy or duplicate a Credo one. Target: 0.
- Accessibility check of its real screens: login, events and `events/[id]`, using the same method as the Credo accessibility checks.
- Gaps Credo had to fill: every component, token or doc Switchback needed that Credo did not have, logged as a proposal (ADP-07).

## Projects with existing UI

A second eligible project with an existing UI needs a real before-and-after baseline, recorded here before it adopts Credo: duplicated components, an accessibility check on sample screens, and the time it took to set up UI foundations in a recent project.
