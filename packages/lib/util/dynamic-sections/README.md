# Dynamic Section Builder
- Base class for generating one summary section per item in a manage list.
- Takes a manage list section's questions and flattens them into unique field names (e.g. `outcomeDetails_0_decisionMakerId`) to avoid clashes between items.

## How it works
- Call `.build(journeyResponse)` to generate an array of `Section`s, one per item in the list.
- Each question's display condition (`.withCondition()`) is respected — hidden questions are skipped.
- Questions are cloned with non-editable defaults. Subclasses can override `cloneQuestion()` to restore editability or patch URLs.

## Extending
- Override `getSectionTitle()` to customise section headings (default is "Item 1", "Item 2", etc.).
- Override `buildSection()` for more control over which fields appear and how they behave — see `ProcedureSectionBuilder` and `OutcomeSectionBuilder` for examples.