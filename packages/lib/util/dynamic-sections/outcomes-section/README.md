# Outcome Section Builder
- Extends `DynamicSectionBuilder` to generate one summary section per outcome (decision) on a case.
- Each section is titled by the decision type (e.g. "Interim", "Decision"). Falls back to "Outcome 1" if unrecognised.

## Differences from base builder
- Hides `decisionTypeId`, `decisionMakerTypeId`, `decisionMakerInspectorId`, and `decisionMakerOfficerId` as individual fields.
- Combines the decision maker fields into a single "Originator" row that displays the role and name (e.g. "Inspector\nJohn Smith") or just "Secretary of State".