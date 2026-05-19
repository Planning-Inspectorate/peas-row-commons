// cypress/page-utilities/page-validation.utility.ts

export function runPageValidation(
	fullValidation: boolean,
	runBasicValidation: () => void,
	runFullValidation: () => void
): void {
	runBasicValidation();

	if (fullValidation) {
		runFullValidation();
	}
}
