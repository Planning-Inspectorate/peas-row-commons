export default {
	extends: ['stylelint-config-standard-scss', 'stylelint-config-prettier-scss', 'stylelint-config-recess-order'],
	plugins: ['stylelint-order', 'stylelint-scss'],
	rules: {
		// Higher nesting in CSS means greater specificity. If we're nesting things really deeply it's likely we should apply a BEM class to the thing we're targeting.
		'max-nesting-depth': 3,
		'selector-max-compound-selectors': 3,
		// prevent use of ID selectors as they are too high specificity
		'selector-max-id': [0, { message: 'ID selectors not allowed as they are too specific' }],
		// All classes should be BEM and begin with `govuk-` or `pins-` so it's clear where they're defined
		'selector-class-pattern': [
			'^(govuk-|pins-|moj-)[a-z0-9]+(?:-[a-z0-9]+)*(?:__(?:[a-z0-9]+(?:-[a-z0-9]+)*))?(?:--(?:[a-z0-9]+(?:-[a-z0-9]+)*))?$',
			{
				message: 'Selector should have pins- prefix and use lowercase BEM syntax'
			}
		],
		// We should always use either
		// 1. govuk colours or
		// 2. custom colour variables defined in a single file (where this rule would be ignored)
		'color-named': ['never', { message: 'Use govuk-colour() instead of named colours' }],
		'color-no-hex': [true, { message: 'Use govuk-colour() instead of hex colours' }],
		// `!important` is a nuclear-level specificity override that makes extending any code very difficult. It's highly unlikely to be needed - use a less specific way of overriding the code instead.
		'declaration-no-important': [true, { message: 'Disallowed !important, use less specificity' }],
		// Enforce kebab case for SCSS constructs to maintain consistency and readability
		'scss/at-mixin-pattern': '^[a-z0-9\\-]+$',
		'scss/dollar-variable-pattern': '^[a-z0-9\\-]+$',
		'scss/percent-placeholder-pattern': '^[a-z0-9\\-]+$',
		// Improve SCSS nesting readability
		'scss/selector-no-redundant-nesting-selector': true,
		// Prevent selectors from being less specific than their parents, which can lead to unexpected styling issues and make it harder to maintain the codebase. This rule helps ensure that styles are applied as intended and reduces the likelihood of unintended side effects when modifying styles.
		'no-descending-specificity': true
	}
};
